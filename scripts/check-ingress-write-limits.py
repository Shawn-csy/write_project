#!/usr/bin/env python3
"""Exercise candidate Nginx write budgets without mutating application data."""

import argparse
from collections import Counter
from ipaddress import ip_address
import random
import socket
import time
from urllib.error import HTTPError
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


def request_status(base: str, method: str, client_ip: str, path: str) -> int:
    request = Request(
        base + path,
        data=b"{}" if method == "POST" else None,
        method=method,
        headers={"CF-Connecting-IP": client_ip},
    )
    try:
        with urlopen(request, timeout=5) as response:
            return response.status
    except HTTPError as error:
        return error.code


def held_write(port: int, client_ip: str) -> socket.socket:
    connection = socket.create_connection(("127.0.0.1", port), timeout=5)
    connection.sendall(
        f"POST /api/scripts HTTP/1.1\r\n"
        f"Host: localhost\r\n"
        f"CF-Connecting-IP: {client_ip}\r\n"
        f"Content-Length: 1048576\r\n"
        f"Connection: close\r\n\r\n".encode("ascii")
    )
    return connection


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", required=True, help="candidate loopback origin, never the live 1090 port")
    args = parser.parse_args()
    parsed = urlsplit(args.base_url)
    if parsed.scheme != "http" or parsed.hostname != "127.0.0.1" or not parsed.port or parsed.port == 1090 or parsed.path not in ("", "/") or parsed.query or parsed.fragment or parsed.username or parsed.password:
        parser.error("use an isolated http://127.0.0.1:<candidate-port> origin")
    base = f"http://127.0.0.1:{parsed.port}"

    bursts = {}
    for path in ("/api/__ingress_limit_probe__", "/api/scripts", "/api/public-feedback"):
        rate_ip = str(ip_address(f"198.51.100.{random.randint(1, 254)}"))
        first = request_status(base, "POST", rate_ip, path)
        if first == 429 or first >= 500:
            raise SystemExit(f"ordinary write unexpectedly rejected on {path}: {first}")
        burst = Counter(request_status(base, "POST", rate_ip, path) for _ in range(50))
        if burst[429] == 0 or any(code >= 500 for code in burst):
            raise SystemExit(f"write burst was not safely limited on {path}: {dict(burst)}")
        bursts[path] = dict(burst)
    reads = Counter(request_status(base, "GET", rate_ip, "/healthz") for _ in range(50))
    if reads != {200: 50}:
        raise SystemExit(f"read requests were affected: {dict(reads)}")
    time.sleep(3)
    recovered = request_status(base, "POST", rate_ip, "/api/public-feedback")
    if recovered == 429 or recovered >= 500:
        raise SystemExit(f"write budget did not recover: {recovered}")

    conn_ip = str(ip_address(f"203.0.113.{random.randint(1, 254)}"))
    held: list[socket.socket] = []
    try:
        for _ in range(8):
            held.append(held_write(parsed.port, conn_ip))
        time.sleep(0.2)
        with socket.create_connection(("127.0.0.1", parsed.port), timeout=5) as extra:
            extra.settimeout(5)
            extra.sendall(
                f"POST /api/__ingress_limit_probe__ HTTP/1.1\r\n"
                f"Host: localhost\r\n"
                f"CF-Connecting-IP: {conn_ip}\r\n"
                f"Content-Length: 2\r\n"
                f"Connection: close\r\n\r\n{{}}".encode("ascii")
            )
            status_line = extra.recv(128).split(b"\r\n", 1)[0]
        if b" 429 " not in status_line:
            raise SystemExit(f"concurrent writes were not limited: {status_line!r}")
        if request_status(base, "GET", conn_ip, "/healthz") != 200:
            raise SystemExit("held writes affected health reads")
    finally:
        for connection in held:
            connection.close()
    print(f"PASS: write bursts {bursts}, 50 reads passed, budget recovered, ninth concurrent write 429")


if __name__ == "__main__":
    main()
