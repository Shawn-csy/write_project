"""Import the reviewed Secret Yamar DLsite catalog into the Dev audio directory.

Run from /app: python -m scripts.import_secretyamar_audio [--apply]
The source snapshot was checked against the official DLsite circle and X
profile on 2026-11-09. Re-running does not create duplicate records.
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
from models import Organization, Persona, PersonaRole, PublicAudioWorkSubmission
from routers.public_bundle import invalidate_public_bundle_cache


SNAPSHOT = Path(__file__).with_name("data") / "secretyamar_audio_2026-11-09.json"
ORG_ID = str(uuid.uuid5(uuid.NAMESPACE_URL, "https://www.dlsite.com/maniax/circle/profile/=/maker_id/RG01024116.html"))
ACTOR_ID = str(uuid.uuid5(uuid.NAMESPACE_URL, "https://x.com/secretyamar"))
REVIEWER = "secretyamar-reviewed-import"
PLATFORM_OWNER_ID = "FBP0FGybEscMUlfl2uRTUxfq0ZT2"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if "write_project_dev" not in os.getenv("DATABASE_URL", ""):
        raise SystemExit("Refusing to modify a database outside write_project_dev")

    snapshot = json.loads(SNAPSHOT.read_text())
    org_data = snapshot["organization"]
    works = snapshot["items"]
    if len(works) != 9 or len({work["id"] for work in works}) != 9:
        raise SystemExit("Expected nine unique DLsite works")
    if org_data["dlsite"] != "https://www.dlsite.com/maniax/circle/profile/=/maker_id/RG01024116.html":
        raise SystemExit("Unexpected circle source")
    for work in works:
        if (work["url"] != f"https://www.dlsite.com/maniax/work/=/product_id/{work['id']}.html"
                or work["id"] not in work["coverUrl"] or work["voiceActors"] != ["芽瑪"]):
            raise SystemExit(f"Invalid reviewed work: {work['id']}")
        datetime.fromisoformat(work["releasedOn"])

    now = int(time.time() * 1000)
    with SessionLocal() as db:
        name_matches = db.query(Organization).filter_by(name=org_data["name"]).all()
        if len(name_matches) > 1 or (name_matches and name_matches[0].id != ORG_ID):
            raise SystemExit("Organization identity conflicts with an existing record")
        org = db.get(Organization, ORG_ID)
        if org and org.name != org_data["name"]:
            raise SystemExit("Organization ID conflicts with an existing record")
        if not org:
            org = Organization(
                id=ORG_ID, name=org_data["name"], description=org_data["description"],
                website=org_data["website"], logoUrl=org_data["logoUrl"],
                bannerUrl=org_data["bannerUrl"], tags=["中文音聲", "ASMR"],
                ownerId=PLATFORM_OWNER_ID, createdAt=now, updatedAt=now,
            )
            db.add(org)

        actor_matches = db.query(Persona).filter_by(displayName="芽瑪").all()
        if len(actor_matches) > 1 or (actor_matches and actor_matches[0].id != ACTOR_ID):
            raise SystemExit("Voice actor identity conflicts with an existing record")
        actor = db.get(Persona, ACTOR_ID)
        if actor and (actor.displayName != "芽瑪" or actor.voiceActorHidden):
            raise SystemExit("Voice actor ID conflicts with an existing record")
        if not actor:
            actor = Persona(
                id=ACTOR_ID, ownerId=None, displayName="芽瑪",
                avatar=org_data["logoUrl"], bannerUrl=org_data["bannerUrl"],
                bio="中文音聲創作者與聲演。", website=org_data["x"], links=[],
                organizationIds=[], tags=["聲演"], voiceActorHidden=False,
                createdAt=now, updatedAt=now,
            )
            db.add(actor)
            db.add(PersonaRole(
                id=str(uuid.uuid4()), personaId=ACTOR_ID, role="voice_actor",
                isVisible=True, sourceTypes=["admin"], profile={},
                createdAt=now, updatedAt=now,
            ))
        else:
            role = db.query(PersonaRole).filter_by(personaId=ACTOR_ID, role="voice_actor").first()
            if not role or not role.isVisible:
                raise SystemExit("Existing 芽瑪 identity is not a public voice actor")

        created = 0
        for work in works:
            rows = db.query(PublicAudioWorkSubmission).filter_by(url=work["url"]).all()
            if len(rows) > 1:
                raise SystemExit(f"Duplicate existing entries for {work['id']}")
            if rows:
                if rows[0].organizationId != ORG_ID or rows[0].status != "approved":
                    raise SystemExit(f"Existing work conflicts with {work['id']}")
                continue
            published_at = int(datetime.fromisoformat(work["releasedOn"])
                               .replace(tzinfo=ZoneInfo("Asia/Taipei")).timestamp() * 1000)
            db.add(PublicAudioWorkSubmission(
                id=str(uuid.uuid4()), title=work["title"], url=work["url"],
                coverUrl=work["coverUrl"],
                description="聲演：芽瑪\n成人向・R18\nDLsite 購買頁",
                creatorName=org.name, creatorUrl=org.website,
                organizationId=ORG_ID, voiceActorIds=[ACTOR_ID],
                accessType="paid", contactEmail="", status="approved",
                reviewedAt=now, reviewedBy=REVIEWER, publishedAt=published_at,
                createdAt=now,
            ))
            created += 1

        print(f"Organization: {org.name}; works to create: {created}")
        if args.apply:
            db.commit()
            invalidate_public_bundle_cache()
            print("Applied to Dev database")
        else:
            db.rollback()
            print("Dry run only")


if __name__ == "__main__":
    main()
