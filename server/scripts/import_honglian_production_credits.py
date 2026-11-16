"""Import role-tagged works from Hong Liân's public portfolio.

Run inside the production API container:
    python -m scripts.import_honglian_production_credits [--apply]
"""

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import time
from urllib.parse import urlparse

from services.work_participations import record_source_credit
from database import SessionLocal
from models import AudioWorkCredit, Persona, PersonaCredit, PersonaCreditName, PersonaRole, PublicAudioWorkSubmission
from routers.public_bundle import invalidate_public_bundle_cache


SNAPSHOT = Path(__file__).with_name("data") / "honglian_production_credits_2026-11-16.json"
SOURCE_ROLE = {"post_production": "後製", "recording_studio": "錄音師"}
AUDIO_ROLE = {"post_production": "post_production", "recording_studio": "recording"}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if urlparse(os.environ.get("DATABASE_URL", "")).path != "/write_project":
        raise SystemExit("Refusing to modify a database other than production write_project")

    snapshot = json.loads(SNAPSHOT.read_text())
    items = snapshot["items"]
    if (snapshot["sourcePortfolio"] != "https://www.hongliantw.com/works"
            or len(items) != 53 or len({item["url"] for item in items}) != 53):
        raise SystemExit("Expected 53 unique linked works from the reviewed portfolio")
    for item in items:
        if (not item["sourceUrl"].startswith(snapshot["sourcePortfolio"] + "/")
                or urlparse(item["url"]).scheme != "https"
                or not item["title"] or not item["roles"]
                or any(role not in SOURCE_ROLE for role in item["roles"])):
            raise SystemExit(f"Invalid portfolio entry: {item['title']}")

    checked_at = int(datetime.fromisoformat(snapshot["checkedOn"]).replace(tzinfo=timezone.utc).timestamp() * 1000)
    now = int(time.time() * 1000)
    with SessionLocal() as db:
        persona = db.get(Persona, snapshot["personaId"])
        if not persona or persona.displayName != snapshot["personaName"]:
            raise SystemExit("The reviewed persona is missing")
        roles = {row.role for row in db.query(PersonaRole).filter_by(personaId=persona.id, isVisible=True)}
        if not set(SOURCE_ROLE).issubset(roles):
            raise SystemExit("The reviewed production roles are not public")
        names = db.query(PersonaCreditName).filter_by(creditedAs=persona.displayName).all()
        for role in SOURCE_ROLE:
            matches = [name for name in names if name.role == role]
            if any(name.personaId != persona.id for name in matches):
                raise SystemExit(f"Credit name belongs to another persona: {role}")
            if not matches:
                db.add(PersonaCreditName(
                    personaId=persona.id, role=role, creditedAs=persona.displayName,
                    createdAt=now,
                ))

        catalog = {row.url: row for row in db.query(PublicAudioWorkSubmission).filter_by(status="approved")}
        changes = 0
        for item in items:
            work = catalog.get(item["url"])
            for role in item["roles"]:
                if work:
                    existing = db.query(AudioWorkCredit).filter_by(
                        audioWorkId=work.id, role=AUDIO_ROLE[role], creditedAs=persona.displayName,
                    ).first()
                    if existing:
                        continue
                    record_source_credit(db, AudioWorkCredit(
                        audioWorkId=work.id, role=AUDIO_ROLE[role], sourceRole=SOURCE_ROLE[role],
                        creditedAs=persona.displayName, provenance="creator_portfolio",
                        sourceUrl=item["sourceUrl"], checkedAt=checked_at,
                    ))
                else:
                    existing = db.query(PersonaCredit).filter_by(
                        personaId=persona.id, role=role, url=item["url"],
                    ).first()
                    if existing:
                        continue
                    from services.work_participations import record_participation
                    record_participation(db, persona_id=persona.id, role=role,
                        title=item["title"], url=item["url"], cover_url=item["coverUrl"],
                        work_type=item["workType"], credited_as=persona.displayName,
                        source=item["sourceUrl"])
                changes += 1

        from services.work_participations import finalize_catalog_import
        work_ids = [row.id for row in catalog.values() if row.url in {item["url"] for item in items}]
        print(json.dumps(finalize_catalog_import(db, work_ids=work_ids), ensure_ascii=False))
        print(f"Hong Liân: {len(items)} linked works, {changes} production credits to add")
        if args.apply:
            db.commit()
            invalidate_public_bundle_cache()
            print("Applied to production database")
        else:
            db.rollback()
            print("Dry run only")


if __name__ == "__main__":
    main()
