"""Import the reviewed 晚晚配音中 DLsite catalog into Dev.

Run from /app: python -m scripts.import_wanwan_voice_audio [--apply]
Source snapshot: data/wanwan_voice_audio_2026-11-10.json.
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
from models import Organization, Persona, PersonaRole, PublicAudioWorkSubmission, User
from routers.public_bundle import invalidate_public_bundle_cache


SNAPSHOT = Path(__file__).with_name("data") / "wanwan_voice_audio_2026-11-10.json"
ORG_ID = str(uuid.uuid5(uuid.NAMESPACE_URL, "https://www.dlsite.com/maniax/circle/profile/=/maker_id/RG74042.html"))
REVIEWER = "wanwan-voice-reviewed-import"
PLATFORM_OWNER_ID = "FBP0FGybEscMUlfl2uRTUxfq0ZT2"


def description(work):
    lines = ["內容簡介", work["summary"], "", "製作資訊", "聲演：" + "、".join(work["voiceActors"])]
    lines.extend(f"{role}：{names}" for role, names in work["credits"].items())
    lines.append("分級：" + work["rating"])
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if "write_project_dev" not in os.getenv("DATABASE_URL", ""):
        raise SystemExit("Refusing to modify a database outside write_project_dev")
    snapshot = json.loads(SNAPSHOT.read_text())
    works = snapshot["items"]
    if len(works) != 4 or len({work["id"] for work in works}) != 4:
        raise SystemExit("Expected four unique reviewed DLsite works")
    if any(work["url"] != f"https://www.dlsite.com/maniax/work/=/product_id/{work['id']}.html"
           or work["id"] not in work["coverUrl"] or work["voiceActors"] != ["晚晚"]
           or not work["summary"] or not work["credits"] for work in works):
        raise SystemExit("Invalid source metadata")
    now = int(time.time() * 1000)
    org_data = snapshot["organization"]
    with SessionLocal() as db:
        if not db.get(User, PLATFORM_OWNER_ID):
            raise SystemExit("Platform owner does not exist in Dev")
        matches = db.query(Organization).filter_by(name=org_data["name"]).all()
        if len(matches) > 1 or (matches and matches[0].id != ORG_ID):
            raise SystemExit("Organization name conflicts with an existing record")
        org = db.get(Organization, ORG_ID)
        if org and org.name != org_data["name"]:
            raise SystemExit("Organization ID conflicts with an existing record")
        changes = 0
        if not org:
            org = Organization(
                id=ORG_ID, name=org_data["name"], description=org_data["description"],
                website=org_data["dlsite"], logoUrl="", bannerUrl=org_data["bannerUrl"],
                tags=["中文音聲", "ASMR"], ownerId=PLATFORM_OWNER_ID,
                createdAt=now, updatedAt=now,
            )
            db.add(org)
            changes += 1
        elif not org.ownerId:
            org.ownerId = PLATFORM_OWNER_ID
            changes += 1
        if org.bannerUrl != org_data["bannerUrl"] and not org.bannerUrl:
            org.bannerUrl = org_data["bannerUrl"]
            org.updatedAt = now
            changes += 1

        actors = db.query(Persona).filter_by(displayName="晚晚").all()
        if len(actors) > 1:
            raise SystemExit("Ambiguous 晚晚 persona identity")
        if actors:
            actor = actors[0]
            role = db.query(PersonaRole).filter_by(personaId=actor.id, role="voice_actor").first()
            if actor.voiceActorHidden or not role or not role.isVisible:
                raise SystemExit("Existing 晚晚 persona is not a public voice actor")
        else:
            actor = Persona(
                id=str(uuid.uuid5(uuid.NAMESPACE_URL, org_data["x"])),
                ownerId=None, displayName="晚晚", avatar="", bannerUrl="",
                bio="中文音聲聲演。", website=org_data["x"], links=[],
                organizationIds=[], tags=["聲演"], voiceActorHidden=False,
                createdAt=now, updatedAt=now,
            )
            db.add(actor)
            db.add(PersonaRole(
                id=str(uuid.uuid4()), personaId=actor.id, role="voice_actor",
                isVisible=True, sourceTypes=["admin"], profile={},
                createdAt=now, updatedAt=now,
            ))
            changes += 1

        for work in works:
            rows = db.query(PublicAudioWorkSubmission).filter_by(url=work["url"]).all()
            if len(rows) > 1:
                raise SystemExit(f"Duplicate product URL: {work['id']}")
            released_at = int(datetime.strptime(work["releasedOn"], "%Y-%m-%d")
                              .replace(tzinfo=ZoneInfo("Asia/Taipei")).timestamp() * 1000)
            fields = dict(title=work["title"], coverUrl=work["coverUrl"],
                          description=description(work), voiceActorIds=[actor.id],
                          publishedAt=released_at, accessType=work["accessType"])
            if rows:
                row = rows[0]
                if row.organizationId != ORG_ID or row.reviewedBy != REVIEWER:
                    raise SystemExit(f"Existing work is managed elsewhere: {work['id']}")
                if any(getattr(row, key) != value for key, value in fields.items()):
                    for key, value in fields.items():
                        setattr(row, key, value)
                    row.reviewedAt = now
                    changes += 1
                continue
            db.add(PublicAudioWorkSubmission(
                id=str(uuid.uuid4()), url=work["url"], creatorName=org.name,
                creatorUrl=org_data["dlsite"], organizationId=ORG_ID,
                contactEmail="", status="approved", reviewedAt=now,
                reviewedBy=REVIEWER, createdAt=now, **fields,
            ))
            changes += 1
        print(f"{org.name}: {len(works)} works, {changes} changes")
        if args.apply:
            db.commit()
            invalidate_public_bundle_cache()
            print("Applied to Dev database")
        else:
            db.rollback()
            print("Dry run only")


if __name__ == "__main__":
    main()
