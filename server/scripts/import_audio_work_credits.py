"""Import reviewed production credit research into the dev catalog.

Run from /app: python -m scripts.import_audio_work_credits
"""

import json
import os
import re
from datetime import datetime
from pathlib import Path

from database import SessionLocal, engine
from models import AudioWorkCredit, Base, PublicAudioWorkSubmission


SNAPSHOT = Path(__file__).parent / "data" / "audio_work_credits_2026-11-10.json"
SOCIAL_SUFFIX = re.compile(r"\s*[（(]\s*(?:https?://|推特|Twitter|X\s*[:：@]|@)[^）)]*[）)]\s*$", re.I)
SOCIAL_TRAIL = re.compile(r"\s+(?:[|｜]\s*)?(?:https?://|推特\s*[（(]X[）)]\s*@|推特\s*@|Twitter\s*@).*$", re.I)
ROLE_PREFIX = re.compile(r"^(?:聲演|配音|台本|劇本|封面|插畫|後製|後期|錄音|音效|設計)\s*[：:]\s*")


def display_name(value: str) -> str:
    """Keep a readable credit while preserving the complete source in the snapshot."""
    value = re.sub(r"\s+", " ", value).strip()
    value = SOCIAL_SUFFIX.sub("", value).strip()
    value = SOCIAL_TRAIL.sub("", value).strip()
    while ROLE_PREFIX.match(value):
        value = ROLE_PREFIX.sub("", value).strip()
    return value


def credits_for(record: dict):
    """Prefer the source page for each role; fill missing roles from catalog text."""
    official = record["credits"] if record["status"] == "ok" else []
    official_roles = {credit["role"] for credit in official}
    for provenance, credits in (("official_page", official), ("catalog_description", record["catalogCredits"])):
        for credit in credits:
            if provenance == "catalog_description" and credit["role"] in official_roles:
                continue
            name = display_name(credit["creditedAs"])
            if name:
                if credit["role"] == "post_production" and name == "一介（第 1–4 軌）、硯（第 5 軌）":
                    yield "post_production", "後製（第 1–4 軌）", "一介", provenance
                    yield "post_production", "後製（第 5 軌）", "硯", provenance
                    continue
                yield credit["role"], credit["sourceRole"], name, provenance


def main():
    database_url = os.getenv("DATABASE_URL", "")
    if "write_project_dev" not in database_url:
        raise SystemExit("Refusing to import outside the dev database")
    snapshot = json.loads(SNAPSHOT.read_text())
    checked_at = int(datetime.fromisoformat(snapshot["checkedAt"].replace("Z", "+00:00")).timestamp() * 1000)
    Base.metadata.create_all(bind=engine, tables=[AudioWorkCredit.__table__])
    with SessionLocal() as db:
        approved = {row.id for row in db.query(PublicAudioWorkSubmission.id).filter(PublicAudioWorkSubmission.status == "approved")}
        count = 0
        for record in snapshot["works"]:
            work_id = record["workId"]
            if work_id not in approved:
                continue
            db.query(AudioWorkCredit).filter(AudioWorkCredit.audioWorkId == work_id).delete(synchronize_session=False)
            seen = set()
            for role, source_role, name, provenance in credits_for(record):
                key = (role, name, provenance)
                if key in seen:
                    continue
                seen.add(key)
                db.add(AudioWorkCredit(
                    audioWorkId=work_id, role=role, sourceRole=source_role,
                    creditedAs=name, provenance=provenance,
                    sourceUrl=record["sourceUrl"] if provenance == "official_page" else "",
                    checkedAt=checked_at,
                ))
                count += 1
        db.commit()
    print(f"Imported {count} credits for {len(approved)} approved works")


if __name__ == "__main__":
    main()
