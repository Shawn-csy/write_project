#!/usr/bin/env python3
"""Minimal read-only API fixture for checking that the public Next app builds."""

import argparse
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import parse_qs, urlsplit


SCRIPT = {
    "id": "fixture-script", "title": "Fixture Script", "content": "INT. ROOM - DAY\nA short test scene.",
    "createdAt": 1700000000000, "lastModified": 1700000000000, "isPublic": 1,
    "type": "script", "folder": "/", "tags": [{"name": "FixtureTag"}],
    "series": {"name": "FixtureSeries"},
    "persona": {"id": "fixture-persona", "displayName": "Fixture Author"},
    "owner": {"id": "fixture-owner", "displayName": "Fixture Owner"},
}
PERSONA = {"id": "fixture-persona", "displayName": "Fixture Author", "tags": []}
ORGANIZATION = {"id": "fixture-org", "name": "Fixture Organization", "members": []}
EXTERNAL_SCRIPT = {
    "id": "fixture-external", "sourceUrl": "https://example.com/fixture-script",
    "title": "Fixture External Script", "status": "published",
    "authorName": "Fixture External Author", "organizationName": "Fixture External Org",
    "categories": ["FixtureTag"], "seriesName": "FixtureSeries",
}
BUNDLE = {
    "scripts": [SCRIPT],
    "personas": [PERSONA],
    "organizations": [ORGANIZATION],
    "topTags": [],
    "banner": {"items": []},
    "demoBanner": {"items": []},
    "externalPublicScripts": [EXTERNAL_SCRIPT],
    "demoSubmissions": [],
    "audioWorks": [],
    "activityPages": [],
}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlsplit(self.path)
        path = parsed.path
        if path == "/api/public-bundle":
            selected = parse_qs(parsed.query).get("sections")
            body = {key: BUNDLE[key] for key in selected[0].split(",")} if selected else BUNDLE
        elif path == "/api/public-personas":
            body = [PERSONA]
        elif path == "/api/public-personas/fixture-persona":
            body = PERSONA
        elif path == "/api/public-organizations":
            body = [ORGANIZATION]
        elif path == "/api/public-organizations/fixture-org":
            body = ORGANIZATION
        elif path == "/api/public-scripts":
            body = [SCRIPT]
        elif path == "/api/public-scripts/fixture-script":
            body = SCRIPT
        elif path == "/healthz":
            body = {"ok": True}
        else:
            self.send_error(404)
            return
        payload = json.dumps(body, separators=(",", ":")).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def log_message(self, *_args):
        pass


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", type=int, default=18891)
    args = parser.parse_args()
    ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()
