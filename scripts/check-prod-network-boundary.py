#!/usr/bin/env python3
"""Fail a production deploy if Compose publishes an internal service."""

import json
import os
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    env = os.environ.copy()
    env.setdefault("POSTGRES_PASSWORD", "network-boundary-check")
    env.setdefault("DATABASE_URL", "postgresql://network:check@postgres/check")
    result = subprocess.run(
        ["docker", "compose", "-f", str(ROOT / "docker-compose.prod.yml"), "config", "--format", "json"],
        cwd=ROOT,
        env=env,
        capture_output=True,
        text=True,
    )
    if result.returncode:
        print("FAIL: production Compose config could not be rendered")
        return 1

    services = json.loads(result.stdout)["services"]
    expected = {("127.0.0.1", "1090", 80, "tcp"), ("::1", "1090", 80, "tcp")}
    frontend_ports = {
        (str(port.get("host_ip", "")), str(port.get("published", "")), port.get("target"), port.get("protocol", "tcp"))
        for port in services["write_project-frontend"].get("ports", [])
    }
    if frontend_ports != expected:
        print("FAIL: frontend must publish port 1090 on both loopback addresses only")
        return 1

    exposed = [name for name, service in services.items() if name != "write_project-frontend" and service.get("ports")]
    host_network = [name for name, service in services.items() if service.get("network_mode") == "host"]
    if exposed or host_network:
        print("FAIL: internal service has a host port or host network")
        return 1

    print("PASS: only frontend port 1090 is published on IPv4 and IPv6 loopback")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
