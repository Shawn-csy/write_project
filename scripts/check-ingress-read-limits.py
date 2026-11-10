#!/usr/bin/env python3
"""Exercise candidate Nginx read budgets without changing application data."""

import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from ipaddress import ip_address
import random
import time
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


def status(base: str, path: str, client_ip: str, method: str = "GET") -> int:
    request = Request(base + path, method=method, headers={"CF-Connecting-IP": client_ip})
    try:
        with urlopen(request, timeout=10) as response:
            response.read()
            return response.status
    except HTTPError as error:
        error.read()
        return error.code


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True, help="candidate loopback origin, never the live 1090 port")
    args = parser.parse_args()
    parsed = urlsplit(args.base_url)
    if parsed.scheme != "http" or parsed.hostname != "127.0.0.1" or not parsed.port or parsed.port == 1090 or parsed.path not in ("", "/") or parsed.query or parsed.fragment or parsed.username or parsed.password:
        parser.error("use an isolated http://127.0.0.1:<candidate-port> origin")
    base = f"http://127.0.0.1:{parsed.port}"
    source = str(ip_address(f"198.51.100.{random.randint(1, 254)}"))
    other = str(ip_address(f"203.0.113.{random.randint(1, 254)}"))

    if status(base, "/", source) != 200 or status(base, "/api/public-bundle?sections=scripts", source) != 200:
        raise SystemExit("ordinary dynamic read failed")
    if status(base, "/", source, "HEAD") != 200:
        raise SystemExit("ordinary HEAD read failed")

    # Every homepage query value is distinct, while the API path is stable.
    # Both paths must draw from the same source budget.
    paths = [path for index in range(40) for path in (
        f"/?probe={index}", "/api/public-bundle?sections=scripts",
    )]
    with ThreadPoolExecutor(max_workers=16) as pool:
        results = list(pool.map(lambda path: (path, status(base, path, source)), paths))
    codes = Counter(code for _, code in results)
    homepage_codes = Counter(code for path, code in results if path.startswith("/?"))
    api_codes = Counter(code for path, code in results if path.startswith("/api/"))
    if codes[200] == 0 or homepage_codes[429] == 0 or api_codes[429] == 0 or any(code not in (200, 429) for code in codes):
        raise SystemExit(f"dynamic read burst was not safely limited: homepage={dict(homepage_codes)}, api={dict(api_codes)}")

    if status(base, "/api/public-bundle?sections=scripts", other) != 200:
        raise SystemExit("one source exhausted another source's read budget")
    static_codes = Counter(status(base, "/favicon.ico", source) for _ in range(30))
    health_codes = Counter(status(base, "/healthz", source) for _ in range(30))
    if static_codes != {200: 30} or health_codes != {200: 30}:
        raise SystemExit(f"static or health reads affected: static={dict(static_codes)}, health={dict(health_codes)}")

    time.sleep(3)
    if status(base, "/", source) != 200:
        raise SystemExit("dynamic read budget did not recover")
    print(f"PASS: homepage {dict(homepage_codes)}, API {dict(api_codes)}, other source/static/health unaffected, budget recovered")


if __name__ == "__main__":
    main()
