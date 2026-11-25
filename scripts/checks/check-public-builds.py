#!/usr/bin/env python3
"""Build production Pages exports against the content publisher's frozen adapter."""

import os
import json
import socket
import subprocess
import sys
import tempfile
import time
from contextlib import contextmanager
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts/release"))

from content_snapshot import capture, empty_routes, fingerprint, frozen_server, read_json, validate_export, validate_html


def fixture_port() -> int:
    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        return probe.getsockname()[1]


@contextmanager
def fixture_api(revision="initial"):
    port = fixture_port()
    fixture = subprocess.Popen(
        [sys.executable, str(ROOT / "scripts/tests/public-build-fixture.py"), "--port", str(port), "--revision", revision],
        cwd=ROOT,
    )
    origin = f"http://127.0.0.1:{port}"
    try:
        for _ in range(50):
            if fixture.poll() is not None:
                raise RuntimeError("Public build fixture exited before becoming ready")
            try:
                with urlopen(f"{origin}/healthz", timeout=1):
                    break
            except OSError:
                time.sleep(0.1)
        else:
            raise RuntimeError("Public build fixture did not become ready")
        yield origin
    finally:
        fixture.terminate()
        fixture.wait(timeout=5)


def static_build(snapshot):
    # Only the frozen server remains alive during the build. The original API
    # fixture is stopped, so an accidental live-source fallback cannot succeed.
    with tempfile.TemporaryDirectory(prefix="public-pages-build-") as temp, frozen_server(snapshot) as (origin, failures):
        output = Path(temp) / "out"
        static_env = {
            **os.environ,
            "BACKEND_API_URL": origin,
            "PUBLIC_PAGES_OUTPUT_DIR": str(output),
            "NEXT_PUBLIC_DEPLOY_ENV": "production",
            "NEXT_PUBLIC_BASE_URL": "https://open-scripts.shawnup.com",
            "NEXT_PUBLIC_API_ORIGIN": "https://api-open-scripts.shawnup.com",
            "NEXT_PUBLIC_FALLBACK_API_ORIGIN": "https://fallback-open-scripts.shawnup.com",
            "NEXT_PUBLIC_MEDIA_ORIGIN": "https://api-open-scripts.shawnup.com",
            "NEXT_PUBLIC_MEDIA_FALLBACK_ORIGIN": "https://media-open-scripts.shawnup.com",
            "NEXT_PUBLIC_STUDIO_ORIGIN": "https://studio-open-scripts.shawnup.com",
            # Explicitly exercise the last-work withdrawal path with a known,
            # validated fixture, not an unavailable API returning a fake empty list.
            "ALLOW_EMPTY_PUBLIC_BUILD": "1" if not snapshot["/api/public-scripts"] else "0",
            "PUBLIC_PAGES_EMPTY_ROUTES": json.dumps(empty_routes(snapshot)),
        }
        subprocess.run(["node", "scripts/release/build-public-pages.mjs"], cwd=ROOT, env=static_env, check=True)
        if failures:
            raise RuntimeError(f"Build requested uncaptured public API routes: {failures}")
        validate_export(output, snapshot)
        validate_html((output / "index.html").read_text())
        validate_html((output / "authors.html").read_text())
        audio_catalog = json.loads((output / "audio-works/catalog.json").read_text())
        expected_catalog = {key: snapshot["/api/public-bundle"][key] for key in ("audioWorks", "organizations")}
        if audio_catalog != expected_catalog:
            raise RuntimeError("The audio directory fallback does not match the frozen content")
        audio_page = (output / "audio-works.html").read_text()
        if any(work["title"] in audio_page for work in audio_catalog["audioWorks"]):
            raise RuntimeError("Audio directory fallback data was embedded in the initial page")
        for script in snapshot["/api/public-scripts"]:
            validate_html((output / "read" / (script["id"] + ".html")).read_text(), script)
        sitemap = (output / "sitemap.xml").read_text()
        if "fixture-withdrawn" in sitemap or (output / "read/fixture-withdrawn.html").exists():
            raise RuntimeError("Withdrawn work remains in the export")
        if snapshot["/api/public-scripts"]:
            changed = (output / "read/fixture-script.html").read_text()
            if "Updated Fixture Script" not in changed or not (output / "read/fixture-new.html").is_file():
                raise RuntimeError("Edited/newly published work missing from static export")
        print("Frozen content export verified: " + ("publish/edit/withdraw" if snapshot["/api/public-scripts"] else "fully empty public catalog"))


def main() -> None:
    with fixture_api() as origin:
        initial = capture(lambda path: read_json(origin + path))
    with fixture_api("updated") as origin:
        updated = capture(lambda path: read_json(origin + path))
    if fingerprint(initial) == fingerprint(updated):
        raise RuntimeError("Publish/edit/withdraw failed to change content fingerprint")
    static_build(updated)
    with fixture_api("empty") as origin:
        empty = capture(lambda path: read_json(origin + path))
    static_build(empty)


if __name__ == "__main__":
    main()
