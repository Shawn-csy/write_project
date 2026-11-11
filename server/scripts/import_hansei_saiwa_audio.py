"""Import the reviewed 繁星祭話 DLsite audio catalog into Dev.

Run from /app: python -m scripts.import_hansei_saiwa_audio [--apply]
"""

import argparse
from datetime import datetime
import json
import os
from pathlib import Path
import time
import uuid
from zoneinfo import ZoneInfo

from database import SessionLocal
from models import AudioWorkCredit, Organization, Persona, PublicAudioWorkSubmission, User
from routers.public_bundle import invalidate_public_bundle_cache


SNAPSHOT = Path(__file__).with_name("data") / "hansei_saiwa_audio_2026-11-10.json"
ORG_ID = str(uuid.uuid5(uuid.NAMESPACE_URL, "https://www.dlsite.com/bl/circle/profile/=/maker_id/RG01023757.html"))
REVIEWER = "hansei-saiwa-reviewed-import"
PLATFORM_OWNER_ID = "FBP0FGybEscMUlfl2uRTUxfq0ZT2"
ROLE_NAMES = {"作者": "author", "シナリオ": "script", "イラスト": "illustration", "声優": "voice_actor"}


def credits_for(work):
    for label, names in work["sourceCredits"].items():
        for name in names.split(" / "):
            yield ROLE_NAMES[label], label, name.strip()


def description(work):
    return "\n".join([work["summary"], f"語言：{work['language']}", f"分級：{work['rating']}"])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if "write_project_dev" not in os.getenv("DATABASE_URL", ""):
        raise SystemExit("Refusing to modify a database outside write_project_dev")
    snapshot = json.loads(SNAPSHOT.read_text())
    works = snapshot["items"]
    if len(works) != 4 or len({work["id"] for work in works}) != 4:
        raise SystemExit("Expected four unique reviewed audio releases")
    for work in works:
        expected = f"https://www.dlsite.com/{'bl' if work['id'] in ('RJ01239782', 'RJ01325230') else 'girls'}/work/=/product_id/{work['id']}.html"
        if (work["url"] != expected or work["id"] not in work["coverUrl"]
                or not work["title"] or not work["summary"] or not work["releasedOn"]):
            raise SystemExit(f"Invalid reviewed metadata: {work['id']}")
    now = int(time.time() * 1000)
    org_data = snapshot["organization"]
    with SessionLocal() as db:
        if not db.get(User, PLATFORM_OWNER_ID):
            raise SystemExit("Verified Dev platform owner is missing")
        name_matches = db.query(Organization).filter_by(name=org_data["name"]).all()
        if len(name_matches) > 1 or (name_matches and name_matches[0].id != ORG_ID):
            raise SystemExit("Organization name belongs to another record")
        org = db.get(Organization, ORG_ID)
        if org and org.name != org_data["name"]:
            raise SystemExit("Organization ID belongs to another record")
        changes = 0
        if not org:
            org = Organization(
                id=ORG_ID, name=org_data["name"], description=org_data["description"],
                website=org_data["website"], logoUrl=org_data["logoUrl"],
                bannerUrl=org_data["bannerUrl"],
                tags=["中文音聲", "女性向", "BL", "乙女向"],
                ownerId=PLATFORM_OWNER_ID, createdAt=now, updatedAt=now,
            )
            db.add(org)
            changes += 1
            db.flush()
        else:
            for field in ("logoUrl", "bannerUrl"):
                if not getattr(org, field):
                    setattr(org, field, org_data[field])
                    org.updatedAt = now
                    changes += 1
        actor = db.query(Persona).filter_by(displayName="一介").all()
        linked_actor_id = None
        if len(actor) == 1 and any(
            link.get("url") == "https://www.youtube.com/@voice_1J" for link in (actor[0].links or [])
        ):
            linked_actor_id = actor[0].id
        for work in works:
            product_matches = db.query(PublicAudioWorkSubmission).filter(
                PublicAudioWorkSubmission.url.contains(work["id"])
            ).all()
            if len(product_matches) > 1:
                raise SystemExit(f"Duplicate product ID: {work['id']}")
            # DLsite gives a Japan-local calendar date without a release hour.
            # Noon keeps that calendar date stable when the Taiwan UI formats it.
            release = int(datetime.strptime(work["releasedOn"], "%Y-%m-%d")
                          .replace(hour=12, tzinfo=ZoneInfo("Asia/Tokyo")).timestamp() * 1000)
            fields = dict(
                title=work["title"], url=work["url"], coverUrl=work["coverUrl"],
                description=description(work), creatorName=org_data["name"],
                creatorUrl=org_data["website"], organizationId=ORG_ID,
                voiceActorIds=[linked_actor_id] if linked_actor_id and "一介" in work["voiceActors"] else [],
                accessType=work["accessType"], publishedAt=release,
            )
            if product_matches:
                row = product_matches[0]
                if row.organizationId != ORG_ID or row.reviewedBy != REVIEWER:
                    raise SystemExit(f"Product is managed elsewhere: {work['id']}")
                if any(getattr(row, key) != value for key, value in fields.items()):
                    for key, value in fields.items():
                        setattr(row, key, value)
                    row.reviewedAt = now
                    changes += 1
            else:
                row = PublicAudioWorkSubmission(
                    id=str(uuid.uuid4()), contactEmail="", status="approved",
                    reviewedAt=now, reviewedBy=REVIEWER, createdAt=now, **fields,
                )
                db.add(row)
                changes += 1
                db.flush()
            present = {(c.role, c.creditedAs, c.provenance) for c in db.query(AudioWorkCredit).filter_by(audioWorkId=row.id).all()}
            for role, source_role, name in credits_for(work):
                if (role, name, "official_page") in present:
                    continue
                db.add(AudioWorkCredit(
                    audioWorkId=row.id, role=role, sourceRole=source_role,
                    creditedAs=name, provenance="official_page", sourceUrl=work["url"],
                    checkedAt=now,
                ))
                changes += 1
        print(f"{org_data['name']}: {len(works)} works, {changes} changes")
        if args.apply:
            db.commit()
            from services.identity_convergence import converge_and_commit
            converge_and_commit(db)
            invalidate_public_bundle_cache()
            print("Applied to Dev database")
        else:
            db.rollback()
            print("Dry run only")


if __name__ == "__main__":
    main()
