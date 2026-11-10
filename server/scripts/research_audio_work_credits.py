"""Collect public production credit lines from the Dev audio catalog's source pages.

This research command only reads public pages and writes a review snapshot. It
never copies paid content or changes the database.
"""

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import threading
import time
from urllib.parse import quote, unquote, urlparse
from urllib.request import Request, urlopen


API_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; OpenScriptsCreditResearch/1.0)",
    "Accept": "application/json, text/plain, */*",
    "device": "web",
    "lang": "zh",
    "origin": "https://cxc.today",
    "referer": "https://cxc.today/",
    "timezone": "Asia/Taipei",
    "uuid": "b4810f48-67cc-4837-99ad-872b9a6f73f1",
}
PAGE_HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0 Safari/537.36"}
ROLE_NAMES = {
    "聲演": "voice_actor", "聲優": "voice_actor", "声優": "voice_actor", "配音": "voice_actor", "CV": "voice_actor",
    "台本": "scriptwriter", "劇本": "scriptwriter", "脚本": "scriptwriter", "シナリオ": "scriptwriter",
    "封面": "cover_art", "插畫": "illustration", "イラスト": "illustration",
    "後製": "post_production", "後期": "post_production", "混音": "post_production",
    "錄音": "recording", "音效": "sound_design", "聲音導演": "sound_direction",
    "音樂": "music", "配樂": "music", "音楽": "music",
    "美術": "art_design", "設計": "design", "標題設計": "design",
    "導演": "direction", "監修": "supervision", "原著": "original_work",
    "原案": "original_work", "製作": "production", "共同製作": "production",
    "企劃": "production", "企画": "production", "制作": "production",
    "其他演出": "voice_actor",
}
SEPARATORS = re.compile(r"[・／/、+＆&]")
COLON_LINE = re.compile(r"^[\s・•●※★◆▸►＊*\-—\u3000]*[【〔]?([^：:|｜]{1,24})[】〕]?\s*[：:|｜]\s*(.+)$")


class Lines(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts = []
        self.ignored = 0

    def handle_starttag(self, tag, attrs):
        if tag in {"script", "style"}:
            self.ignored += 1
        elif tag in {"br", "div", "p", "li", "tr", "h1", "h2", "h3", "section", "blockquote"}:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in {"script", "style"}:
            self.ignored = max(0, self.ignored - 1)
        elif tag in {"div", "p", "li", "tr", "h1", "h2", "h3", "section", "blockquote"}:
            self.parts.append("\n")

    def handle_data(self, data):
        if not self.ignored:
            self.parts.append(data)

    def lines(self):
        return [re.sub(r"\s+", " ", line).strip() for line in "".join(self.parts).splitlines() if line.strip()]


def html_lines(html):
    parser = Lines()
    parser.feed(html or "")
    return parser.lines()


def roles_for(label):
    clean = label.strip("【】〔〕（ ）() ")
    if clean in ROLE_NAMES:
        return [ROLE_NAMES[clean]]
    roles = []
    for part in SEPARATORS.split(clean):
        part = part.strip("【】〔〕（ ）() ")
        if part in ROLE_NAMES and ROLE_NAMES[part] not in roles:
            roles.append(ROLE_NAMES[part])
    return roles


def extract_credits(lines):
    result = []
    seen = set()
    for line in lines:
        match = COLON_LINE.match(line)
        if not match:
            continue
        source_role, credited_as = match.groups()
        credited_as = credited_as.strip().rstrip("。")
        if not credited_as or credited_as.startswith(("http://", "https://")):
            continue
        for role in roles_for(source_role):
            key = (role, credited_as)
            if key not in seen:
                seen.add(key)
                result.append({"role": role, "sourceRole": source_role.strip(), "creditedAs": credited_as})
    return result


def fetch(url, headers=PAGE_HEADERS, attempts=2):
    last_error = None
    for attempt in range(attempts):
        try:
            request = Request(url, headers=headers)
            with urlopen(request, timeout=18) as response:
                return response.read().decode("utf-8", "replace")
        except Exception as error:
            last_error = error
            if attempt + 1 < attempts:
                time.sleep(0.5 * (attempt + 1))
    raise last_error


def cxc_source(work, store_ids):
    parts = [unquote(segment) for segment in urlparse(work["url"]).path.split("/") if segment]
    handle = next((segment[1:] for segment in parts if segment.startswith("@")), None)
    if not handle or handle not in store_ids:
        raise ValueError("CxC store not found")
    if "item" in parts:
        kind, item_id = "file", parts[parts.index("item") + 1]
    elif "album" in parts:
        kind, item_id = "sound", parts[parts.index("album") + 1]
    else:
        raise ValueError("Unsupported CxC URL")
    api_url = f"https://api.cxc.today/store/{store_ids[handle]}/{kind}/{item_id}"
    payload = json.loads(fetch(api_url, API_HEADERS))
    if payload.get("code") != 0 or not isinstance(payload.get("data"), dict):
        raise ValueError(f"CxC API: {payload.get('message')}")
    data = payload["data"]
    return data.get("name") or "", html_lines(data.get("introduction") or "")


def dlsite_source(work):
    match = re.search(r"RJ\d+", work["url"])
    if not match:
        raise ValueError("DLsite work ID not found")
    source_url = f"https://www.dlsite.com/maniax/work/=/product_id/{match.group(0)}.html"
    html = fetch(source_url)
    title = re.search(r"<title>(.*?)</title>", html, flags=re.S | re.I)
    return html_lines(title.group(1))[0] if title else "", html_lines(html)


def collect_one(work, store_ids):
    url = work["url"]
    source_kind = "cxc" if "cxc.today" in url else "dlsite" if "dlsite.com" in url or "dlaf.jp" in url else "myacg" if "myacg.com.tw" in url else "other"
    result = {"workId": work["id"], "title": work["title"], "sourceUrl": url, "sourceKind": source_kind}
    try:
        if source_kind == "cxc":
            source_title, lines = cxc_source(work, store_ids)
        elif source_kind == "dlsite":
            source_title, lines = dlsite_source(work)
        else:
            raw = fetch(url)
            source_title, lines = "", html_lines(raw)
        result.update({"status": "ok", "sourceTitle": source_title, "credits": extract_credits(lines)})
    except Exception as error:
        result.update({"status": "error", "error": str(error), "credits": []})
    result["catalogCredits"] = extract_credits((work.get("description") or "").splitlines())
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--bundle-url", default="http://127.0.0.1:8891/api/public-bundle?sections=audioWorks")
    args = parser.parse_args()
    works = json.loads(fetch(args.bundle_url))["audioWorks"]
    handles = sorted({unquote(segment)[1:] for work in works if "cxc.today" in work["url"] for segment in urlparse(work["url"]).path.split("/") if unquote(segment).startswith("@")})
    store_ids = {}
    for handle in handles:
        try:
            payload = json.loads(fetch(f"https://api.cxc.today/store/{quote(handle)}?v=2", API_HEADERS))
            if payload.get("code") == 0:
                store_ids[handle] = payload["data"]["id"]
        except Exception:
            pass
    rows = []
    with ThreadPoolExecutor(max_workers=4) as pool:
        futures = {pool.submit(collect_one, work, store_ids): work["id"] for work in works}
        for index, future in enumerate(as_completed(futures), 1):
            rows.append(future.result())
            if index % 30 == 0:
                print(f"Fetched {index}/{len(works)}", flush=True)
    order = {work["id"]: index for index, work in enumerate(works)}
    rows.sort(key=lambda row: order[row["workId"]])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"checkedAt": datetime.now(timezone.utc).isoformat(), "workCount": len(works), "works": rows}, ensure_ascii=False, indent=2) + "\n")
    print(f"Saved {len(rows)} works to {args.output}")


if __name__ == "__main__":
    main()
