#!/usr/bin/env python3
"""Build standalone and static public apps against a small read-only API fixture."""

import os
import socket
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from urllib.request import urlopen


ROOT = Path(__file__).resolve().parents[1]


def fixture_port() -> int:
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        return probe.getsockname()[1]


def main() -> None:
    port = fixture_port()
    fixture = subprocess.Popen(
        [sys.executable, str(ROOT / "scripts/public-build-fixture.py"), "--port", str(port)],
        cwd=ROOT,
    )
    try:
        for _ in range(50):
            if fixture.poll() is not None:
                raise RuntimeError("Public build fixture exited before becoming ready")
            try:
                with urlopen(f"http://127.0.0.1:{port}/healthz", timeout=1):
                    break
            except OSError:
                time.sleep(0.1)
        else:
            raise RuntimeError("Public build fixture did not become ready")

        common_env = {
            **os.environ,
            "BACKEND_API_URL": f"http://127.0.0.1:{port}",
        }
        subprocess.run(["npm", "run", "build", "-w", "apps/public"], cwd=ROOT, env=common_env, check=True)

        with tempfile.TemporaryDirectory(prefix="public-pages-build-") as temp:
            output = Path(temp) / "out"
            static_env = {
                **common_env,
                "PUBLIC_PAGES_OUTPUT_DIR": str(output),
                "NEXT_PUBLIC_DEPLOY_ENV": "development",
                "NEXT_PUBLIC_BASE_URL": "https://dev-open-scripts.shawnup.com",
                "NEXT_PUBLIC_API_ORIGIN": "https://api-dev-open-scripts.shawnup.com",
                "NEXT_PUBLIC_FALLBACK_API_ORIGIN": "https://api-dev-open-scripts.shawnup.com",
                "NEXT_PUBLIC_MEDIA_ORIGIN": "https://api-dev-open-scripts.shawnup.com",
                "NEXT_PUBLIC_MEDIA_FALLBACK_ORIGIN": "https://api-dev-open-scripts.shawnup.com",
                "NEXT_PUBLIC_STUDIO_ORIGIN": "https://studio-dev-open-scripts.shawnup.com",
            }
            subprocess.run(["node", "scripts/build-public-pages.mjs", "--preview"], cwd=ROOT, env=static_env, check=True)
            if not (output / "404.html").is_file():
                raise RuntimeError("Static public build did not generate 404.html")
    finally:
        fixture.terminate()
        fixture.wait(timeout=5)


if __name__ == "__main__":
    main()
