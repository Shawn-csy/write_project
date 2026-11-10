#!/usr/bin/env python3
"""Measure public GET latency and response bytes without writing application data.

Example:
  python3 scripts/benchmark-public-reads.py \
    --base-url http://127.0.0.1:8891 --path /api/public-bundle

Use the same environment, dataset, paths, concurrency, and request count when
comparing two revisions. This measures HTTP responses, not browser rendering.
"""

import argparse
from concurrent.futures import ThreadPoolExecutor
import json
import math
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


def percentile(sorted_values: list[float], fraction: float) -> float:
    if not sorted_values:
        return 0.0
    position = math.ceil(len(sorted_values) * fraction) - 1
    return sorted_values[max(0, position)]


def sample(url: str, timeout: float) -> dict:
    started = time.perf_counter()
    try:
        request = Request(url, headers={"Accept-Encoding": "gzip", "User-Agent": "OpenScriptsReadBenchmark/1.0"})
        with urlopen(request, timeout=timeout) as response:
            body = response.read()
            return {
                "status": response.status,
                "bytes": len(body),
                "durationMs": round((time.perf_counter() - started) * 1000, 2),
                "encoding": response.headers.get("Content-Encoding", "identity"),
            }
    except HTTPError as error:
        return {"status": error.code, "bytes": 0, "durationMs": round((time.perf_counter() - started) * 1000, 2)}
    except (URLError, TimeoutError) as error:
        return {"status": "error", "error": type(error).__name__, "bytes": 0,
                "durationMs": round((time.perf_counter() - started) * 1000, 2)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True)
    parser.add_argument("--path", action="append", required=True, help="Public GET path; repeat for multiple paths")
    parser.add_argument("--requests", type=int, default=50)
    parser.add_argument("--concurrency", type=int, default=5)
    parser.add_argument("--timeout", type=float, default=10.0)
    args = parser.parse_args()
    if args.requests < 1 or args.concurrency < 1 or args.concurrency > 50:
        parser.error("requests must be positive and concurrency must be between 1 and 50")
    for path in args.path:
        parsed = urlsplit(path)
        if not parsed.path.startswith("/") or parsed.path.startswith("//") or parsed.scheme or parsed.netloc or parsed.fragment:
            parser.error("each path must be an absolute path, optionally with a query string")

    base = args.base_url.rstrip("/")
    results = []
    for path in args.path:
        url = base + path
        warmup = sample(url, args.timeout)
        if warmup["status"] != 200:
            raise SystemExit(f"Warmup failed for {path}: {warmup['status']}")
        started = time.perf_counter()
        with ThreadPoolExecutor(max_workers=args.concurrency) as pool:
            samples = list(pool.map(lambda _: sample(url, args.timeout), range(args.requests)))
        elapsed = time.perf_counter() - started
        durations = sorted(entry["durationMs"] for entry in samples)
        results.append({
            "path": path,
            "requests": args.requests,
            "concurrency": args.concurrency,
            "statusCounts": {str(status): sum(entry["status"] == status for entry in samples)
                             for status in sorted({entry["status"] for entry in samples}, key=str)},
            "p50Ms": percentile(durations, 0.50),
            "p95Ms": percentile(durations, 0.95),
            "maxMs": durations[-1],
            "requestsPerSecond": round(args.requests / elapsed, 2),
            "responseBytes": samples[0]["bytes"],
            "contentEncoding": samples[0].get("encoding", "identity"),
        })
    print(json.dumps({"baseUrl": base, "results": results}, ensure_ascii=False, indent=2))
    if any(result["statusCounts"] != {"200": args.requests} for result in results):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
