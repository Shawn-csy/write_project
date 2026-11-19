#!/usr/bin/env python3
"""Minimal read-only API fixture for checking that the public Next app builds."""

import argparse
import copy
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
WITHDRAWN_SCRIPT = {**SCRIPT, "id": "fixture-withdrawn", "title": "Withdrawn Fixture"}
NEW_SCRIPT = {**SCRIPT, "id": "fixture-new", "title": "New Published Fixture"}
SCRIPTS = [SCRIPT, WITHDRAWN_SCRIPT]
EXTERNAL_SCRIPT = {
    "id": "fixture-external", "sourceUrl": "https://example.com/fixture-script",
    "title": "Fixture External Script", "status": "published",
    "authorName": "Fixture External Author", "organizationName": "Fixture External Org",
    "categories": ["FixtureTag"], "seriesName": "FixtureSeries",
}
BUNDLE = {
    "scripts": SCRIPTS,
    "personas": [PERSONA],
    "organizations": [ORGANIZATION],
    "topTags": [],
    "banner": {"items": []},
    "demoBanner": {"items": []},
    "audioWorkBanner": {"items": []},
    "externalPublicScripts": [EXTERNAL_SCRIPT],
    "demoSubmissions": [],
    "audioWorks": [],
    "activityPages": [],
    "productionResources": [{
        "id": "fixture-persona", "personaId": "fixture-persona", "name": "Fixture Studio",
        "categories": ["recording_studio"], "summary": "Fixture resource",
        "websiteUrl": "https://example.com/studio", "links": [],
        "legacyIds": ["fixture-resource"],
        "works": [{
            "id": "fixture-work", "title": "Fixture Work", "url": "https://example.com/work",
            "coverUrl": "", "creditRole": "recording_studio", "creditedAs": "Fixture Studio",
            "workType": "audio",
        }],
    }],
}


def configure_revision(revision):
    """Model publish/edit/withdraw using only public responses, never real data."""
    global SCRIPTS
    if revision == "updated":
        updated = copy.deepcopy(SCRIPT)
        updated.update(title="Updated Fixture Script", content="INT. ROOM - DAY\nUpdated fixture dialogue.", lastModified=1700000100000)
        SCRIPTS = [updated, copy.deepcopy(NEW_SCRIPT)]
    elif revision == "empty":
        SCRIPTS = []
        for key, value in BUNDLE.items():
            if isinstance(value, list):
                BUNDLE[key] = []
    else:
        SCRIPTS = [copy.deepcopy(SCRIPT), copy.deepcopy(WITHDRAWN_SCRIPT)]
    BUNDLE["scripts"] = SCRIPTS


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urlsplit(self.path)
        path = parsed.path
        if path == "/api/public-bundle":
            selected = parse_qs(parsed.query).get("sections")
            body = {key: BUNDLE[key] for key in selected[0].split(",")} if selected else BUNDLE
        elif path == "/api/public-personas":
            body = BUNDLE["personas"]
        elif path == "/api/public-personas/fixture-persona":
            body = PERSONA
        elif path == "/api/public-organizations":
            body = BUNDLE["organizations"]
        elif path == "/api/public-organizations/fixture-org":
            body = ORGANIZATION
        elif path == "/api/public-scripts":
            body = SCRIPTS
        elif path.startswith("/api/public-scripts/"):
            body = next((item for item in SCRIPTS if item["id"] == path.rsplit("/", 1)[-1]), None)
            if body is None:
                self.send_error(404)
                return
        elif path == "/api/themes/public":
            body = []
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
    parser.add_argument("--revision", choices=("initial", "updated", "empty"), default="initial")
    args = parser.parse_args()
    configure_revision(args.revision)
    ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()
