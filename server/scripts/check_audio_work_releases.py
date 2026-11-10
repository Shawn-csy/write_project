"""Deterministic Dev audio-work discovery. No LLM and no automatic publication.

Run inside the Dev API container:
    python -m scripts.check_audio_work_releases --state /data/audio-discovery/state.json --apply

The JSON report is written to stdout. ``--apply`` persists already reported
candidate keys, so a scheduled run alerts only once for each new source item.
The approved catalog is read-only; review and publication remain in Studio.
"""

import argparse
from difflib import SequenceMatcher
import json
import os
import re
import sys
import unicodedata
import uuid
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from database import SessionLocal
from models import PublicAudioWorkSubmission


STUDIOS = {
    "bedtime": {"id": "39189f92-73b3-47fd-8f59-343f9367a443", "name": "被談聲聆"},
    "hrlab": {"id": "0fc64473-8492-5197-8cbd-76eaf58b2e2c", "name": "風橙實驗室 HR Lab."},
    "purelysilk": {"id": "b10dfcb3-ea6b-5ad0-8d5e-f3ff6cb3f533", "name": "雪白薄紗 Purelysilk Voice"},
    "neon": {"id": "87048680-532d-40db-9450-16617351b77b", "name": "NEON VOICE 霓聲工作室"},
}
SOURCES = {
    "bedtime_cxc": ("bedtime", "cxc", 6409, "BedtimeStory", "file"),
    "hrlab_cxc": ("hrlab", "cxc", 6472, "honglian", "sound"),
    "hrlab_official": ("hrlab", "portaly", "https://portaly.cc/hclab"),
    "purelysilk_official": ("purelysilk", "portaly", "https://purelysilkvoice.com/"),
    "neon_youtube": ("neon", "youtube", "UCgdHDM5sO-gxO7zLJbM35BA"),
}
PRODUCT_ID = re.compile(r"RJ\d{8}|(?:[?&]gid=)(\d+)", re.I)
TITLE_SUFFIX = re.compile(r"[【\[][^】\]]*(?:中文|音聲|聲音|ASMR|R[－-]?18|成人向)[^】\]]*[】\]]", re.I)


def get_text(url: str, headers: dict[str, str] | None = None) -> str:
    request = Request(url, headers={"User-Agent": "OpenScriptsAudioDiscovery/1.0", **(headers or {})})
    with urlopen(request, timeout=25) as response:
        if response.status != 200:
            raise RuntimeError(f"HTTP {response.status} from {url}")
        return response.read(8_000_000).decode("utf-8")


def normalize_title(value: str) -> str:
    value = TITLE_SUFFIX.sub("", unicodedata.normalize("NFKC", value).casefold())
    return "".join(char for char in value if char.isalnum())


def titles_match(left: str, right: str) -> bool:
    if not left or not right:
        return False
    if left == right:
        return True
    if min(len(left), len(right)) >= 8 and (left in right or right in left):
        return True
    return min(len(left), len(right)) >= 12 and SequenceMatcher(None, left, right).ratio() >= 0.94


def product_token(url: str) -> str:
    match = PRODUCT_ID.search(url)
    if not match:
        return ""
    return (match.group(1) or match.group(0)).upper()


def cxc_items(store_id: int, store_name: str, reader_type: str) -> list[dict]:
    headers = {"device": "server", "uuid": str(uuid.uuid4()), "lang": "zh", "timezone": "Asia/Taipei"}
    result = []
    page = 1
    while True:
        url = f"https://api.cxc.today/v2/store/{store_id}/books?page={page}&per_page=48&sort_by=updated_at"
        payload = json.loads(get_text(url, headers))
        if payload.get("code") != 0 or not isinstance(payload.get("data", {}).get("books"), list):
            raise RuntimeError(f"Unexpected CxC response for {store_name}, page {page}")
        data = payload["data"]
        books = data["books"]
        for book in books:
            if book.get("reader_type") != reader_type:
                continue
            chapter = book.get("chapter") or {}
            if chapter.get("is_published") != 1:
                continue
            if book.get("store_id") != store_id or not book.get("id") or not book.get("name"):
                continue
            kind = "item" if reader_type == "file" else "album"
            result.append({
                "key": f"cxc:{store_id}:{book['id']}",
                "title": book["name"].strip(),
                "url": f"https://cxc.today/zh/@{store_name}/{kind}/{book['id']}",
                "signal": "released",
                "sourcePublishedAt": chapter.get("publish_at"),
            })
        if len(books) < data.get("per_page", 48) or page * data.get("per_page", 48) >= data.get("total", 0):
            break
        page += 1
        if page > 20:
            raise RuntimeError(f"CxC pagination exceeded limit for {store_name}")
    return result


class NextDataParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.active = False
        self.parts: list[str] = []

    def handle_starttag(self, tag, attrs):
        if tag == "script" and dict(attrs).get("id") == "__NEXT_DATA__":
            self.active = True

    def handle_data(self, data):
        if self.active:
            self.parts.append(data)

    def handle_endtag(self, tag):
        if tag == "script":
            self.active = False


def portaly_items(url: str) -> list[dict]:
    parser = NextDataParser()
    parser.feed(get_text(url))
    if not parser.parts:
        raise RuntimeError(f"Portaly page has no embedded data: {url}")
    page = json.loads("".join(parser.parts))["props"]["pageProps"]["data"]
    links = page.get("links") or {}
    result: dict[str, dict] = {}
    sections = [("", page.get("blocks") or [])]
    for subpage in (page.get("pages") or {}).values():
        blocks = subpage.get("blocks") or {}
        sections.append((subpage.get("title") or "", blocks.values() if isinstance(blocks, dict) else blocks))
    for section_title, blocks in sections:
        for block in blocks:
            if block.get("hidden") is True:
                continue
            for item in block.get("items") or []:
                target = (links.get(item.get("linkId")) or {}).get("url") or ""
                host = urlparse(target).hostname or ""
                if host not in {"www.dlsite.com", "dlaf.jp", "www.myacg.com.tw"}:
                    continue
                token = product_token(target)
                if not token:
                    continue
                text = unescape(item.get("text") or item.get("label") or "").strip()
                title = text if len(text) > 12 else f"{section_title} {text}".strip()
                # Purelysilk's product pages also link limited merchandise.
                if "purelysilkvoice.com" in url and not re.search(r"ASMR|音聲|音声|語音|聲音", title, re.I):
                    continue
                result.setdefault(token, {
                    "key": f"official:{token}", "title": title or token,
                    "url": target, "signal": "official-product-link",
                    "sourcePublishedAt": None,
                })
                if len(title) > len(result[token]["title"]):
                    result[token]["title"] = title
    return list(result.values())


def neon_youtube_items(channel_id: str) -> list[dict]:
    root = ET.fromstring(get_text(f"https://www.youtube.com/feeds/videos.xml?channel_id={channel_id}"))
    ns = {"a": "http://www.w3.org/2005/Atom", "m": "http://search.yahoo.com/mrss/"}
    recent = datetime.now(timezone.utc) - timedelta(days=120)
    result: dict[str, dict] = {}
    for entry in root.findall("a:entry", ns):
        published = entry.findtext("a:published", default="", namespaces=ns)
        if not published or datetime.fromisoformat(published) < recent:
            continue
        description = entry.findtext("m:group/m:description", default="", namespaces=ns)
        # A video is only a lead when the creator says a complete work is for sale.
        if not re.search(r"購買完整版|購買連結|購買作品", description):
            continue
        titles = re.findall(r"【[^】]{1,35}】[^\n]{2,80}", description)
        title = next((title for title in titles if "音聲" in title or "ASMR" in title), "")
        if not title:
            continue
        key = normalize_title(title)
        if key:
            result.setdefault(key, {
                "key": f"youtube:{key}", "title": title.strip(),
                "url": entry.find("a:link", ns).get("href"),
                "signal": "official-video-lead", "sourcePublishedAt": None,
            })
    return list(result.values())


def load_catalog(db) -> dict[str, dict[str, set[str]]]:
    catalog = {}
    for studio, details in STUDIOS.items():
        rows = db.query(PublicAudioWorkSubmission).filter(
            PublicAudioWorkSubmission.organizationId == details["id"],
            PublicAudioWorkSubmission.status.in_(["approved", "pending"]),
        ).all()
        catalog[studio] = {
            "urls": {row.url for row in rows},
            "tokens": {token for row in rows if (token := product_token(row.url))},
            "titles": {title for row in rows if (title := normalize_title(row.title))},
        }
    return catalog


def is_in_catalog(item: dict, existing: dict[str, set[str]]) -> bool:
    token = product_token(item["url"])
    title = normalize_title(item["title"])
    return (
        item["url"] in existing["urls"]
        or bool(token and token in existing["tokens"])
        or any(titles_match(title, known) for known in existing["titles"])
    )


def scan(state_path: Path, apply: bool) -> dict:
    state = json.loads(state_path.read_text()) if state_path.exists() else {"version": 1, "seen": {}}
    if state.get("version") != 1 or not isinstance(state.get("seen"), dict):
        raise RuntimeError("Unsupported discovery state format")
    checked_at = datetime.now(timezone.utc).isoformat()
    report = {"checkedAt": checked_at, "studios": {}, "newCandidates": [], "errors": []}
    with SessionLocal() as db:
        catalog = load_catalog(db)
        for source, config in SOURCES.items():
            studio, kind, *args = config
            try:
                if kind == "cxc":
                    items = cxc_items(*args)
                elif kind == "portaly":
                    items = portaly_items(*args)
                else:
                    items = neon_youtube_items(*args)
                if not items:
                    raise RuntimeError("Source returned no candidate works")
                seen = state["seen"].setdefault(source, {})
                new_count = 0
                for item in items:
                    if is_in_catalog(item, catalog[studio]) or item["key"] in seen:
                        continue
                    title = normalize_title(item["title"])
                    if any(candidate["studio"] == studio and titles_match(title, normalize_title(candidate["title"]))
                           for candidate in report["newCandidates"]):
                        seen[item["key"]] = checked_at
                        continue
                    item.update({"studio": studio, "studioName": STUDIOS[studio]["name"], "source": source})
                    report["newCandidates"].append(item)
                    seen[item["key"]] = checked_at
                    new_count += 1
                report["studios"][source] = {"checked": len(items), "new": new_count}
            except Exception as exc:
                report["errors"].append({"source": source, "error": str(exc)[:300]})
        state["lastRunAt"] = checked_at
    if apply:
        state_path.parent.mkdir(parents=True, exist_ok=True)
        temp = state_path.with_suffix(".tmp")
        temp.write_text(json.dumps(state, ensure_ascii=False, indent=2) + "\n")
        temp.replace(state_path)
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--state", type=Path, default=Path("/data/audio-discovery/state.json"))
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if "write_project_dev" not in os.getenv("DATABASE_URL", ""):
        raise SystemExit("Refusing to scan a database outside write_project_dev")
    report = scan(args.state, args.apply)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if report["errors"]:
        sys.exit(2)


if __name__ == "__main__":
    main()
