"""Read public metadata from profile URLs explicitly linked in work credits."""

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from html import unescape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
from urllib.request import Request, urlopen


class Metadata(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.values = {}
        self.in_title = False
        self.title = []

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "title":
            self.in_title = True
        if tag == "meta":
            key = attrs.get("property") or attrs.get("name")
            value = attrs.get("content")
            if key and value and key not in self.values:
                self.values[key] = value

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title.append(data)


def compact(value):
    return re.sub(r"\s+", " ", unescape(value or "")).strip()


def fetch_metadata(url):
    request = Request(url, headers={
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0 Safari/537.36",
        "Accept-Language": "zh-TW,zh;q=0.9,en;q=0.8",
    })
    try:
        with urlopen(request, timeout=14) as response:
            html = response.read(1200000).decode("utf-8", "replace")
            final_url = response.url
        parser = Metadata()
        parser.feed(html)
        values = parser.values
        return {"url": url, "finalUrl": final_url, "status": "ok",
                "title": compact(values.get("og:title") or values.get("twitter:title") or "".join(parser.title)),
                "description": compact(values.get("og:description") or values.get("twitter:description") or values.get("description")),
                "imageUrl": values.get("og:image") or values.get("twitter:image") or ""}
    except Exception as error:
        return {"url": url, "status": "error", "error": str(error), "title": "", "description": "", "imageUrl": ""}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--links", type=Path, default=Path(__file__).parent / "data" / "resource_links_2026-11-10.json")
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    links = json.loads(args.links.read_text())["links"]
    curated = json.loads((Path(__file__).parent / "data" / "production_resources_initial.json").read_text())
    urls = sorted({item["url"] for item in links} | {item["websiteUrl"] for item in curated} | {item["sourceUrl"] for item in curated})
    profiles = []
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {pool.submit(fetch_metadata, url): url for url in urls}
        for future in as_completed(futures):
            profiles.append(future.result())
    profiles.sort(key=lambda profile: profile["url"])
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps({"profiles": profiles}, ensure_ascii=False, indent=2) + "\n")
    print(f"Read {len(profiles)} linked profiles; {sum(profile['status'] == 'ok' for profile in profiles)} accessible")


if __name__ == "__main__":
    main()
