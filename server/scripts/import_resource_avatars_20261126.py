"""Import curated resource avatars into /data/media/public-avatar-curation and personas.avatar."""

import argparse
import json
import os
import shutil
import time
from pathlib import Path
from urllib.parse import urlparse

from database import SessionLocal
from models import Persona, ProductionResourceEnrichment


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Write images and database updates")
    parser.add_argument("--manifest", type=Path, required=True, help="JSON mapping personaId -> /resources/<file>")
    parser.add_argument("--assets-dir", type=Path, required=True, help="Directory containing avatar files")
    args = parser.parse_args()

    database_name = urlparse(os.environ.get("DATABASE_URL", "")).path
    if database_name not in ("/write_project", "/write_project_dev"):
        raise SystemExit(f"Unexpected database name: {database_name!r}")

    media_root = Path(os.getenv("MEDIA_STORAGE_ROOT", "/data/media"))
    mapping = json.loads(args.manifest.read_text(encoding="utf-8"))
    pending = []
    skipped = []

    with SessionLocal() as db:
        for persona_id, rel_path in mapping.items():
            persona = db.get(Persona, persona_id)
            if persona is None:
                continue
            if persona.ownerId or persona.avatar:
                skipped.append(persona.displayName)
                continue
            filename = Path(rel_path).name
            source = args.assets_dir / filename
            if not source.is_file() or source.stat().st_size < 500:
                raise ValueError(f"Avatar missing or too small: {source}")
            ext = source.suffix.lower() or ".jpg"
            target_name = f"{persona_id}{ext}"
            url = f"/media/public-avatar-curation/{target_name}"
            enrichment = db.query(ProductionResourceEnrichment).filter(
                ProductionResourceEnrichment.id == persona_id
            ).first()
            pending.append((persona, enrichment, source, media_root / "public-avatar-curation" / target_name, url))

        print(f"Database {database_name}: {len(pending)} pending avatars, {len(skipped)} already filled or claimed")
        if not args.apply:
            print("Dry run. Pass --apply to update.")
            return

        now = int(time.time() * 1000)
        for persona, enrichment, source, target, url in pending:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(source, target)
            persona.avatar = url
            persona.updatedAt = now
            if enrichment is not None and not enrichment.avatarUrl:
                enrichment.avatarUrl = url
        db.commit()
        print(f"Updated {len(pending)} persona avatars.")


if __name__ == "__main__":
    main()
