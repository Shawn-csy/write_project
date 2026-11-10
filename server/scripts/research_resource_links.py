"""Research profile links adjacent to production credits on public work pages."""

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.parse import quote, unquote, urlparse

from scripts.research_audio_work_credits import API_HEADERS, Lines, extract_credits, fetch


URL_RE = re.compile(r"https?://[^\s<>\"']+", re.I)
ROLE_MAP = {"recording": "recording_studio", "post_production": "post_production", "cover_art": "cover_art",
            "voice_actor": "voice_actor", "scriptwriter": "scriptwriter", "illustration": "illustration",
            "design": "design", "sound_design": "sound_design", "music": "music"}


class LinkedLines(Lines):
    def __init__(self):
        super().__init__()
        self.hrefs = []

    def handle_starttag(self, tag, attrs):
        super().handle_starttag(tag, attrs)
        if tag == "a":
            self.hrefs.append(dict(attrs).get("href", ""))

    def handle_endtag(self, tag):
        if tag == "a" and self.hrefs:
            href = self.hrefs.pop()
            if href.startswith("https://") or href.startswith("http://"):
                self.parts.append(" " + href)
        super().handle_endtag(tag)


def clean_name(value):
    value = re.split(r"\s*(?:[|｜]\s*)?https?://", value, maxsplit=1)[0]
    value = re.sub(r"\s*[（(]\s*(?:https?://|推特|Twitter|@)[^）)]*[）)]\s*$", "", value, flags=re.I)
    value = re.split(r"\s+(?:推特\s*[（(]X[）)]\s*@|推特\s*@|Twitter\s*@|Youtube頻道)", value, maxsplit=1, flags=re.I)[0]
    value = re.sub(r"^(?:封面|後製|後期|錄音)\s*[：:]\s*", "", value)
    return value.strip(" \t|｜(（")


def links_from_html(html, record):
    parser = LinkedLines()
    parser.feed(html or "")
    lines = parser.lines()
    credited = {(credit["role"], clean_name(credit["creditedAs"])) for credit in record["credits"] if credit["role"] in ROLE_MAP}
    found = []
    for index, line in enumerate(lines):
        parsed = extract_credits([line])
        for credit in parsed:
            key = (credit["role"], clean_name(credit["creditedAs"]))
            if key not in credited:
                continue
            candidates = URL_RE.findall(line)
            if not candidates and index + 1 < len(lines) and not extract_credits([lines[index + 1]]):
                candidates = URL_RE.findall(lines[index + 1])
            for candidate in candidates:
                url = candidate.rstrip(".,，。)）]」>")
                if urlparse(url).hostname and urlparse(url).scheme in {"http", "https"}:
                    found.append({"workId": record["workId"], "role": ROLE_MAP[credit["role"]],
                                  "creditedAs": key[1], "url": url, "sourceUrl": record["sourceUrl"]})
                    break
    return found


def fetch_source(record, store_ids):
    url = record["sourceUrl"]
    if record["sourceKind"] == "cxc":
        parts = [unquote(segment) for segment in urlparse(url).path.split("/") if segment]
        handle = next((segment[1:] for segment in parts if segment.startswith("@")), "")
        if handle not in store_ids:
            return ""
        kind, item_id = ("file", parts[parts.index("item") + 1]) if "item" in parts else ("sound", parts[parts.index("album") + 1])
        payload = json.loads(fetch(f"https://api.cxc.today/store/{store_ids[handle]}/{kind}/{item_id}", API_HEADERS))
        return payload.get("data", {}).get("introduction") or ""
    if record["sourceKind"] == "dlsite":
        match = re.search(r"RJ\d+", url)
        return fetch(f"https://www.dlsite.com/maniax/work/=/product_id/{match.group(0)}.html") if match else ""
    return ""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--snapshot", type=Path, default=Path(__file__).parent / "data" / "audio_work_credits_2026-11-10.json")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    records = json.loads(args.snapshot.read_text())["works"]
    handles = sorted({unquote(segment)[1:] for record in records if record["sourceKind"] == "cxc"
                      for segment in urlparse(record["sourceUrl"]).path.split("/") if unquote(segment).startswith("@")})
    store_ids = {}
    for handle in handles:
        try:
            payload = json.loads(fetch(f"https://api.cxc.today/store/{quote(handle)}?v=2", API_HEADERS))
            if payload.get("code") == 0:
                store_ids[handle] = payload["data"]["id"]
        except Exception:
            pass
    selected = [record for record in records if any(credit["role"] in ROLE_MAP for credit in record["credits"])]
    links = []
    errors = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(fetch_source, record, store_ids): record for record in selected}
        for future in as_completed(futures):
            record = futures[future]
            try:
                links.extend(links_from_html(future.result(), record))
            except Exception as error:
                errors.append({"workId": record["workId"], "error": str(error)})
    links.sort(key=lambda row: (row["creditedAs"], row["role"], row["workId"]))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"sourceWorks": len(selected), "links": links, "errors": errors}, ensure_ascii=False, indent=2) + "\n")
    print(f"Found {len(links)} credit links across {len(selected)} works; {len(errors)} errors")


if __name__ == "__main__":
    main()
