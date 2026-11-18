"""Incrementally fill blank public persona avatars from reviewed source images."""

import argparse
import json
import os
import shutil
import time
from pathlib import Path
from urllib.parse import urlparse

from database import SessionLocal
from models import Persona


DATA_DIR = Path(__file__).parent / "data"
MANIFEST = DATA_DIR / "public_avatar_enrichments_2026-11-12.json"
ASSETS = DATA_DIR / "public_avatar_assets_2026-11-12"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Write images and database updates")
    parser.add_argument("--manifest", type=Path, default=MANIFEST, help="Reviewed avatar manifest")
    parser.add_argument("--assets-dir", type=Path, default=ASSETS, help="Directory containing reviewed images")
    args = parser.parse_args()

    database_name = urlparse(os.environ.get("DATABASE_URL", "")).path
    if database_name not in ("/write_project", "/write_project_dev"):
        raise SystemExit(f"Unexpected database name: {database_name!r}")
    media_root = Path(os.getenv("MEDIA_STORAGE_ROOT", "/data/media"))
    entries = json.loads(args.manifest.read_text())["profiles"]
    pending = []
    skipped = []

    with SessionLocal() as db:
        for entry in entries:
            persona = db.get(Persona, entry["personaId"])
            if persona is None or persona.displayName != entry["name"]:
                raise ValueError(f"Identity changed: {entry['name']}")
            if persona.ownerId or persona.avatar:
                skipped.append(entry["name"])
                continue
            source = args.assets_dir / entry["assetFile"]
            if not source.is_file() or source.stat().st_size < 1000:
                raise ValueError(f"Image missing or too small: {source}")
            expected_url = "/media/public-avatar-curation/" + source.name
            if entry["avatarUrl"] != expected_url:
                raise ValueError(f"Invalid media path: {entry['name']}")
            pending.append((persona, source, media_root / "public-avatar-curation" / source.name, expected_url))

        print(f"Database {database_name}: {len(pending)} pending, {len(skipped)} already filled or claimed")
        if not args.apply:
            print("Dry run. Pass --apply to update.")
            return

        for persona, source, target, url in pending:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
            persona.avatar = url
            persona.updatedAt = int(time.time() * 1000)
        db.commit()
        print("Updated: " + ", ".join(persona.displayName for persona, *_ in pending))


if __name__ == "__main__":
    main()
