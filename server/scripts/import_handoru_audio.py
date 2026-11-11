"""Import the reviewed Handoru 寒濤旅社 catalog into production.

Run from /app: python -m scripts.import_handoru_audio [--apply]
"""

import argparse
from datetime import datetime
import json
import os
from pathlib import Path
import time
import uuid
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

from database import SessionLocal
from models import AudioWorkCredit, Organization, Persona, PersonaRole, PublicAudioWorkSubmission, User
from routers.public_bundle import invalidate_public_bundle_cache


SNAPSHOT = Path(__file__).with_name("data") / "handoru_audio_2026-11-11.json"
SOURCE = "https://www.dlsite.com/maniax/circle/profile/=/maker_id/RG63553.html"
ORG_ID = str(uuid.uuid5(uuid.NAMESPACE_URL, SOURCE))
REVIEWER = "handoru-reviewed-import"
ROLE_NAMES = {"作者": "author", "シナリオ": "script", "イラスト": "illustration", "声優": "voice_actor"}
# These exact names already have public roles in production. 晚晚 is kept as a
# printed credit because the source does not establish that she is the same person.
LINKED_EXISTING_ACTORS = {"伊橙/Kurihara Risako", "霏筱雨"}
TEXT_ONLY_ACTORS = {"晚晚"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if urlparse(os.environ.get("DATABASE_URL", "")).path != "/write_project":
        raise SystemExit("Refusing to modify a database other than production write_project")
    snapshot = json.loads(SNAPSHOT.read_text())
    works = snapshot["items"]
    if snapshot["sourceCircle"] != SOURCE or len(works) != 7 or len({work["id"] for work in works}) != 7:
        raise SystemExit("Expected seven unique works from the reviewed Handoru circle")
    for work in works:
        if (work["url"] != f"https://www.dlsite.com/maniax/work/=/product_id/{work['id']}.html"
                or work["id"] not in work["coverUrl"] or not work["title"]
                or not work["voiceActors"] or not work["releasedOn"]
                or work["accessType"] != "paid" or work["rating"] != "R18"):
            raise SystemExit(f"Invalid reviewed metadata: {work['id']}")
        datetime.strptime(work["releasedOn"], "%Y-%m-%d")
    now = int(time.time() * 1000)
    with SessionLocal() as db:
        owner = db.get(User, "FBP0FGybEscMUlfl2uRTUxfq0ZT2")
        if not owner:
            raise SystemExit("Verified production platform owner is missing")
        org_data = snapshot["organization"]
        matches = db.query(Organization).filter_by(name=org_data["name"]).all()
        if len(matches) > 1 or (matches and matches[0].id != ORG_ID):
            raise SystemExit("Organization name belongs to another record")
        org = db.get(Organization, ORG_ID)
        if org and org.name != org_data["name"]:
            raise SystemExit("Organization ID belongs to another record")
        changes = 0
        if not org:
            org = Organization(
                id=ORG_ID, name=org_data["name"], description=org_data["description"],
                website=org_data["website"], logoUrl=org_data["logoUrl"],
                bannerUrl=org_data["bannerUrl"], tags=["中文音聲", "台語音聲", "R18"],
                ownerId=owner.id, createdAt=now, updatedAt=now,
            )
            db.add(org)
            changes += 1
            db.flush()
        else:
            for field in ("description", "website", "logoUrl", "bannerUrl"):
                if getattr(org, field) != org_data[field]:
                    setattr(org, field, org_data[field])
                    org.updatedAt = now
                    changes += 1
        actors = {}
        for name in sorted({name for work in works for name in work["voiceActors"]}):
            if name in TEXT_ONLY_ACTORS:
                continue
            existing = db.query(Persona).filter_by(displayName=name).all()
            if len(existing) > 1:
                raise SystemExit(f"Ambiguous voice actor identity: {name}")
            if existing:
                actor = existing[0]
                expected_id = str(uuid.uuid5(uuid.NAMESPACE_URL, SOURCE + "#voice-actor:" + name))
                if name not in LINKED_EXISTING_ACTORS and actor.id != expected_id:
                    raise SystemExit(f"Unexpected existing voice actor identity: {name}")
                role = db.query(PersonaRole).filter_by(personaId=actor.id, role="voice_actor").first()
                if actor.voiceActorHidden or not role or not role.isVisible:
                    raise SystemExit(f"Existing actor is not a public voice actor: {name}")
            else:
                actor = Persona(
                    id=str(uuid.uuid5(uuid.NAMESPACE_URL, SOURCE + "#voice-actor:" + name)),
                    ownerId=None, displayName=name, avatar="", bannerUrl="", bio="",
                    website="", links=[], organizationIds=[], tags=["聲演"],
                    voiceActorHidden=False, createdAt=now, updatedAt=now,
                )
                db.add(actor)
                db.add(PersonaRole(
                    id=str(uuid.uuid4()), personaId=actor.id, role="voice_actor",
                    isVisible=True, sourceTypes=["admin"], profile={},
                    createdAt=now, updatedAt=now,
                ))
                changes += 1
            actors[name] = actor.id
        for work in works:
            rows = db.query(PublicAudioWorkSubmission).filter(
                PublicAudioWorkSubmission.url.contains(work["id"])
            ).all()
            if len(rows) > 1:
                raise SystemExit(f"Duplicate product ID: {work['id']}")
            released_at = int(datetime.strptime(work["releasedOn"], "%Y-%m-%d")
                              .replace(hour=12, tzinfo=ZoneInfo("Asia/Tokyo")).timestamp() * 1000)
            fields = dict(
                title=work["title"], url=work["url"], coverUrl=work["coverUrl"],
                description=work["summary"] + "\n分級：R18", creatorName=org.name,
                creatorUrl=org_data["dlsite"], organizationId=ORG_ID,
                voiceActorIds=[actors[name] for name in work["voiceActors"] if name in actors],
                accessType="paid", publishedAt=released_at,
            )
            if rows:
                row = rows[0]
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
            for source_role, names in work["sourceCredits"].items():
                role = ROLE_NAMES.get(source_role)
                if not role:
                    raise SystemExit(f"Unknown credit role: {source_role}")
                for name in names:
                    if (role, name, "official_page") in present:
                        continue
                    db.add(AudioWorkCredit(
                        audioWorkId=row.id, role=role, sourceRole=source_role,
                        creditedAs=name, provenance="official_page",
                        sourceUrl=work["url"], checkedAt=now,
                    ))
                    changes += 1
        print(f"{org.name}: {len(works)} works, {changes} changes")
        if args.apply:
            db.commit()
            invalidate_public_bundle_cache()
            print("Applied to production database")
        else:
            db.rollback()
            print("Dry run only")


if __name__ == "__main__":
    main()
