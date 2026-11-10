"""Idempotently seed sourced production resources in the dev database.

Run from /app: python -m scripts.import_production_resources
"""

import json
import os
import re
import time
from datetime import datetime, timezone
from pathlib import Path

from database import SessionLocal, engine
from models import AudioWorkCredit, Base, ProductionResource, ProductionResourceCredit, PublicAudioWorkSubmission


REVIEWED_AT = int(datetime(2026, 11, 10, tzinfo=timezone.utc).timestamp() * 1000)


def credited_roles(description: str):
    """Read explicit production credit lines, never narrative mentions."""
    for line in description.splitlines():
        parts = re.split(r"[：:]", line.strip(), maxsplit=1)
        if len(parts) != 2:
            continue
        label, credited_as = (part.strip() for part in parts)
        label = label.strip("【】〔〕 ")
        if not label.startswith(("後製", "後期", "音效", "錄音", "封面")):
            continue
        roles = set()
        if "後製" in label or "後期" in label:
            roles.add("post_production")
        if "封面" in label:
            roles.add("cover_art")
        if "錄音" in label:
            roles.add("recording_studio")
        for role in roles:
            yield role, credited_as


def main() -> None:
    if "write_project_dev" not in os.getenv("DATABASE_URL", ""):
        raise SystemExit("Refusing to import outside the dev database")
    Base.metadata.create_all(bind=engine, tables=[ProductionResource.__table__, ProductionResourceCredit.__table__])
    records = json.loads((Path(__file__).parent / "data" / "production_resources_initial.json").read_text())
    now = int(time.time() * 1000)
    with SessionLocal() as db:
        aliases = {}
        for item in records:
            row = db.get(ProductionResource, item["id"])
            if row is None:
                row = ProductionResource(id=item["id"], createdAt=now)
                db.add(row)
            for key in ("name", "categories", "summary", "websiteUrl", "sourceUrl"):
                setattr(row, key, item[key])
            row.status = "published"
            row.reviewedAt = REVIEWED_AT
            row.updatedAt = now
            for role, names in item.get("creditAliases", {}).items():
                if role not in item["categories"]:
                    raise ValueError(f"Credit role {role} is not a category for {item['id']}")
                for name in names:
                    aliases[(role, name)] = item["id"]
        resource_ids = [item["id"] for item in records]
        db.query(ProductionResourceCredit).filter(
            ProductionResourceCredit.resourceId.in_(resource_ids)
        ).delete(synchronize_session=False)
        credits_seen = set()
        work_count = 0
        approved_works = db.query(PublicAudioWorkSubmission).filter(PublicAudioWorkSubmission.status == "approved").all()
        for work in approved_works:
            for role, credited_as in credited_roles(work.description or ""):
                resource_id = aliases.get((role, credited_as))
                if resource_id is None or (resource_id, work.id, role) in credits_seen:
                    continue
                credits_seen.add((resource_id, work.id, role))
                db.add(ProductionResourceCredit(
                    resourceId=resource_id, audioWorkId=work.id,
                    creditRole=role, creditedAs=credited_as, createdAt=now,
                ))
                work_count += 1
        approved_ids = {work.id for work in approved_works}
        for credit in db.query(AudioWorkCredit).filter(AudioWorkCredit.audioWorkId.in_(approved_ids)):
            role = "recording_studio" if credit.role == "recording" else credit.role
            resource_id = aliases.get((role, credit.creditedAs))
            if resource_id is None or (resource_id, credit.audioWorkId, role) in credits_seen:
                continue
            credits_seen.add((resource_id, credit.audioWorkId, role))
            db.add(ProductionResourceCredit(
                resourceId=resource_id, audioWorkId=credit.audioWorkId,
                creditRole=role, creditedAs=credit.creditedAs, createdAt=now,
            ))
            work_count += 1
        db.commit()
    print(f"Imported {len(records)} production resources and {work_count} work credits")


if __name__ == "__main__":
    main()
