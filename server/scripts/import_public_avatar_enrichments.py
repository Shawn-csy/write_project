"""Incrementally fill blank public persona avatars from reviewed source images."""

import argparse
import os
import shutil
import time
from pathlib import Path
from urllib.parse import urlparse

from database import SessionLocal
from models import Persona, ProductionResourceEnrichment
from scripts.backfill_snapshots import ARCHIVE, read_backfill_snapshot


DATA_DIR = Path(__file__).parent / "data"
AVATAR_BATCHES = {
    "2026-11-12": "publicAvatars20261112",
    "2026-11-18": "publicAvatars20261118",
}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Write images and database updates")
    parser.add_argument("--manifest", type=Path, default=ARCHIVE, help="Backfill archive or standalone avatar manifest")
    parser.add_argument("--batch", choices=AVATAR_BATCHES, default="2026-11-12", help="Avatar batch in the archive")
    parser.add_argument("--assets-dir", type=Path, help="Directory containing reviewed images")
    args = parser.parse_args()

    database_name = urlparse(os.environ.get("DATABASE_URL", "")).path
    if database_name not in ("/write_project", "/write_project_dev"):
        raise SystemExit(f"Unexpected database name: {database_name!r}")
    media_root = Path(os.getenv("MEDIA_STORAGE_ROOT", "/data/media"))
    entries = read_backfill_snapshot(args.manifest, AVATAR_BATCHES[args.batch])["profiles"]
    assets_dir = args.assets_dir or (DATA_DIR / f"public_avatar_assets_{args.batch}")
    pending = []
    skipped = []

    with SessionLocal() as db:
        for entry in entries:
            persona = db.get(Persona, entry["personaId"])
            if persona is None or persona.displayName != entry["name"]:
                raise ValueError(f"Identity changed: {entry['name']}")
            if persona.ownerId or persona.avatar == entry["avatarUrl"] or (not entry.get("replaceAvatarUrl") and persona.avatar):
                skipped.append(entry["name"])
                continue
            expected_current = entry.get("replaceAvatarUrl", "")
            if persona.avatar != expected_current:
                raise ValueError(f"Avatar changed: {entry['name']}")
            enrichment = None
            if entry.get("enrichmentId"):
                enrichment = db.get(ProductionResourceEnrichment, entry["enrichmentId"])
                if enrichment is None or enrichment.avatarUrl != expected_current:
                    raise ValueError(f"Resource avatar changed: {entry['name']}")
            source = assets_dir / entry["assetFile"]
            if not source.is_file() or source.stat().st_size < 1000:
                raise ValueError(f"Image missing or too small: {source}")
            expected_url = "/media/public-avatar-curation/" + source.name
            if entry["avatarUrl"] != expected_url:
                raise ValueError(f"Invalid media path: {entry['name']}")
            pending.append((persona, enrichment, source, media_root / "public-avatar-curation" / source.name, expected_url))

        print(f"Database {database_name}: {len(pending)} pending, {len(skipped)} already filled or claimed")
        if not args.apply:
            print("Dry run. Pass --apply to update.")
            return

        for persona, enrichment, source, target, url in pending:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
            persona.avatar = url
            persona.updatedAt = int(time.time() * 1000)
            if enrichment is not None:
                enrichment.avatarUrl = url
        db.commit()
        print("Updated: " + ", ".join(persona.displayName for persona, *_ in pending))


if __name__ == "__main__":
    main()
