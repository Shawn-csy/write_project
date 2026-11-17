"""Source-reviewed recording identity classification. Dry run unless --apply."""
import argparse
import json
import os
from pathlib import Path
from urllib.parse import urlparse

from database import SessionLocal
from models import Persona, PersonaRole


def apply_snapshot(db, snapshot):
    rows = snapshot.get("identities") or []
    if len({item.get("personaId") for item in rows}) != len(rows):
        raise ValueError("Duplicate recording identity")
    changes = []
    for item in rows:
        pid, entity_type, source = item.get("personaId"), item.get("entityType"), item.get("sourceUrl")
        if entity_type not in {"person", "studio"} or urlparse(str(source)).scheme != "https":
            raise ValueError(f"Invalid classification or source for {pid}")
        persona = db.get(Persona, pid)
        role = db.query(PersonaRole).filter_by(personaId=pid, role="recording_studio").first()
        if not persona or not role:
            raise ValueError(f"Recording identity missing: {pid}")
        profile = dict(role.profile or {})
        if profile.get("entityType") == entity_type and profile.get("entityTypeSourceUrl") == source:
            continue
        role.profile = {**profile, "entityType": entity_type, "entityTypeSourceUrl": source}
        changes.append({"personaId": pid, "name": persona.displayName, "from": profile.get("entityType"), "to": entity_type, "sourceUrl": source})
    db.flush()
    return changes


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("--database-name", required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if urlparse(os.environ.get("DATABASE_URL", "")).path != "/" + args.database_name:
        raise SystemExit("Database name does not match the explicitly selected target")
    with SessionLocal() as db:
        changes = apply_snapshot(db, json.loads(args.snapshot.read_text()))
        print(json.dumps({"changes": changes, "count": len(changes)}, ensure_ascii=False, indent=2))
        if args.apply:
            db.commit()
            print("Applied. Revalidate the public bundle and affected routes in the serving API process.")
        else:
            db.rollback()
            print("Dry run; rolled back")


if __name__ == "__main__":
    main()
