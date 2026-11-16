"""Backfill official author credits for the reviewed HR Lab catalog.

Run inside the production API container:
    python -m scripts.backfill_hrlab_author_credits [--apply]

Each of the 35 DLsite product pages was checked on 2026-11-16. Its 作者
field names 風蓮/Hong Liân. The product URLs and IDs are retained in the
existing HR Lab catalog snapshot.
"""

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlparse

from services.work_participations import record_source_credit
from database import SessionLocal
from models import AudioWorkCredit, Organization, Persona, PublicAudioWorkSubmission
from routers.public_bundle import invalidate_public_bundle_cache


SNAPSHOT = Path(__file__).with_name("data") / "hrlab_audio_2026-11-09.json"
AUTHOR = "風蓮/Hong Liân"
AUTHOR_ID = "4f64bbdd-65a5-5550-9818-6573c31b0e67"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if urlparse(os.environ.get("DATABASE_URL", "")).path != "/write_project":
        raise SystemExit("Refusing to modify a database other than production write_project")

    snapshot = json.loads(SNAPSHOT.read_text())
    works = snapshot["items"]
    if len(works) != 35 or len({work["id"] for work in works}) != 35:
        raise SystemExit("Expected 35 unique reviewed HR Lab works")
    checked_at = int(datetime(2026, 11, 16, tzinfo=timezone.utc).timestamp() * 1000)
    with SessionLocal() as db:
        author = db.get(Persona, AUTHOR_ID)
        if not author or author.displayName != AUTHOR:
            raise SystemExit("The reviewed author identity is missing")
        orgs = db.query(Organization).filter_by(name=snapshot["organization"]["name"]).all()
        if len(orgs) != 1:
            raise SystemExit("Expected one HR Lab organization")
        org = orgs[0]
        changes = 0
        for work in works:
            rows = db.query(PublicAudioWorkSubmission).filter_by(url=work["url"]).all()
            if len(rows) != 1 or rows[0].organizationId != org.id or rows[0].status != "approved":
                raise SystemExit(f"Missing or ambiguous published work: {work['id']}")
            row = rows[0]
            credits = db.query(AudioWorkCredit).filter_by(audioWorkId=row.id, role="author").all()
            if any(credit.creditedAs != AUTHOR for credit in credits):
                raise SystemExit(f"Unexpected author credit on {work['id']}")
            from services.work_participations import record_catalog_participant
            record_catalog_participant(db, row, dict(role="scriptwriter", personaId=AUTHOR_ID,
                creditedAs=AUTHOR, sourceRole="作者", sourceUrl=work["url"]))
            if any(credit.creditedAs == AUTHOR for credit in credits):
                continue
            record_source_credit(db, AudioWorkCredit(
                audioWorkId=row.id, role="author", sourceRole="作者",
                creditedAs=AUTHOR, provenance="official_page",
                sourceUrl=work["url"], checkedAt=checked_at,
            ))
            changes += 1

        print(f"HR Lab: {len(works)} verified works, {changes} author credits to add")
        if args.apply:
            db.commit()
            invalidate_public_bundle_cache()
            print("Applied to production database")
        else:
            db.rollback()
            print("Dry run only")


if __name__ == "__main__":
    main()
