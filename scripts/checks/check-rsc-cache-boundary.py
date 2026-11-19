#!/usr/bin/env python3
"""Verify that the candidate homepage caches HTML but never RSC payloads."""

import argparse
from xml.etree import ElementTree
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import HTTPRedirectHandler, Request, build_opener


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, new_url):
        return None


HTTP = build_opener(NoRedirect)


def response(base: str, path: str, *, rsc: bool = False) -> tuple[int, str, str]:
    headers = {"RSC": "1"} if rsc else {}
    try:
        result = HTTP.open(Request(base + path, headers=headers), timeout=15)
    except HTTPError as error:
        result = error
    with result:
        result.read(1)
        return result.status, result.headers.get("Content-Type", ""), result.headers.get("Cache-Control", "")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True, help="isolated candidate loopback origin")
    parser.add_argument("--path", action="append", default=[], help="additional public Next.js page to check")
    parser.add_argument("--sample-sitemap", action="store_true", help="sample page types from the candidate sitemap")
    args = parser.parse_args()
    parsed = urlsplit(args.base_url)
    if (parsed.scheme != "http" or parsed.hostname != "127.0.0.1" or not parsed.port
            or parsed.port == 1090 or parsed.path not in ("", "/") or parsed.query
            or parsed.fragment or parsed.username or parsed.password):
        parser.error("use an isolated http://127.0.0.1:<candidate-port> origin")
    base = f"http://127.0.0.1:{parsed.port}"
    paths = list(args.path)
    if args.sample_sitemap:
        with HTTP.open(base + "/sitemap.xml", timeout=15) as sitemap:
            document = ElementTree.fromstring(sitemap.read())
        listed = [urlsplit(node.text).path for node in document.iter()
                  if node.tag.endswith("loc") and node.text]
        paths.extend(["/about", "/authors"])
        for prefix in ("/read/", "/author/", "/org/", "/series/", "/tag/"):
            match = next((path for path in listed if path.startswith(prefix)), None)
            if match:
                paths.append(match)
    paths = list(dict.fromkeys(paths))
    for path in paths:
        parsed_path = urlsplit(path)
        if (not parsed_path.path.startswith("/") or parsed_path.path.startswith("//")
                or parsed_path.scheme or parsed_path.netloc or parsed_path.query or parsed_path.fragment):
            parser.error("--path must be a same-origin absolute path without query or fragment")

    html_status, html_type, html_cache = response(base, "/?cache_boundary=html")
    if html_status != 200 or not html_type.startswith("text/html") or "s-maxage=120" not in html_cache:
        raise SystemExit(f"HTML cache policy incorrect: {html_status} {html_type} {html_cache}")

    rsc_status, rsc_type, rsc_cache = response(base, "/?cache_boundary=rsc&_rsc", rsc=True)
    if (rsc_status != 200 or not rsc_type.startswith("text/x-component")
            or "no-store" not in rsc_cache or "public" in rsc_cache):
        raise SystemExit(f"RSC cache policy incorrect: {rsc_status} {rsc_type} {rsc_cache}")
    redirect_status, _, redirect_cache = response(base, "/?cache_boundary=redirect&_rsc=x", rsc=True)
    if redirect_status != 307 or "no-store" not in redirect_cache or "public" in redirect_cache:
        raise SystemExit(f"RSC redirect cache policy incorrect: {redirect_status} {redirect_cache}")
    for path in paths:
        status, content_type, cache = response(base, path + "?_rsc", rsc=True)
        if status != 200 or not content_type.startswith("text/x-component") or "no-store" not in cache:
            raise SystemExit(f"{path} RSC cache policy incorrect: {status} {content_type} {cache}")
    print(f"PASS: homepage HTML is edge-cacheable; RSC is private and no-store on homepage and {len(paths)} other pages")


if __name__ == "__main__":
    main()
