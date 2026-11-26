"""Import official X/Twitter bios into unclaimed public personas (dry-run by default)."""

import argparse
import json
import os
import time
from pathlib import Path
from urllib.parse import urlparse

from database import SessionLocal
from models import Persona

DEFAULT_MANIFEST = Path(__file__).parent / "data" / "x_profile_enrichments_2026-11-26.json"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true", help="Write bio updates to database")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--only-empty", action="store_true", help="Only fill currently empty bios")
    args = parser.parse_args()

    database_name = urlparse(os.environ.get("DATABASE_URL", "")).path
    if database_name not in ("/write_project", "/write_project_dev"):
        raise SystemExit(f"Unexpected database name: {database_name!r}")

    entries = json.loads(args.manifest.read_text(encoding="utf-8"))["profiles"]
    pending = []
    skipped_claimed = []
    skipped_unchanged = []

    with SessionLocal() as db:
        for entry in entries:
            persona = db.get(Persona, entry["personaId"])
            if persona is None:
                continue
            if persona.ownerId:
                skipped_claimed.append(persona.displayName)
                continue
            new_bio = (entry.get("bio") or "").strip()
            current_bio = (persona.bio or "").strip()
            if not new_bio or new_bio == current_bio or (args.only_empty and current_bio):
                skipped_unchanged.append(persona.displayName)
                continue
            pending.append((persona, new_bio))

        print(
            f"Database {database_name}: {len(pending)} pending bio updates, "
            f"{len(skipped_claimed)} claimed (protected), {len(skipped_unchanged)} unchanged"
        )
        if not args.apply:
            print("Dry run. Pass --apply to update.")
            return

        now = int(time.time() * 1000)
        for persona, new_bio in pending:
            persona.bio = new_bio
            persona.updatedAt = now
        db.commit()
        print(f"Updated {len(pending)} personas.")


if __name__ == "__main__":
    main()
