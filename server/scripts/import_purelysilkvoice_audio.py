"""Import the works linked from the official Purelysilk Voice homepage into Dev.

Run from /app: python -m scripts.import_purelysilkvoice_audio [--apply]
The reviewed source snapshot is in data/purelysilkvoice_audio_2026-11-09.json.
"""

import argparse
import json
import os
import time
import uuid
from pathlib import Path

from database import SessionLocal
from models import Organization, Persona, PersonaRole, PublicAudioWorkSubmission
from routers.public_bundle import invalidate_public_bundle_cache


SNAPSHOT = Path(__file__).with_name("data") / "purelysilkvoice_audio_2026-11-09.json"
ORG_ID = str(uuid.uuid5(uuid.NAMESPACE_URL, "https://purelysilkvoice.com/"))
REVIEWER = "purelysilkvoice-reviewed-import"
PLATFORM_OWNER_ID = "FBP0FGybEscMUlfl2uRTUxfq0ZT2"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if "write_project_dev" not in os.getenv("DATABASE_URL", ""):
        raise SystemExit("Refusing to modify a database outside write_project_dev")

    snapshot = json.loads(SNAPSHOT.read_text())
    works = snapshot["items"]
    if len(works) != 11 or len({work["url"] for work in works}) != 11:
        raise SystemExit("Expected 11 unique works from the official homepage")
    if any(not work["title"] or not work["coverUrl"] or not work["voiceActors"] for work in works):
        raise SystemExit("Incomplete work metadata")

    now = int(time.time() * 1000)
    org_data = snapshot["organization"]
    with SessionLocal() as db:
        existing_orgs = db.query(Organization).filter(Organization.name == org_data["name"]).all()
        if len(existing_orgs) > 1 or (existing_orgs and existing_orgs[0].id != ORG_ID):
            raise SystemExit("Organization identity conflicts with an existing record")
        org = db.get(Organization, ORG_ID)
        if org and org.name != org_data["name"]:
            raise SystemExit("Organization ID conflicts with an existing record")
        if not org:
            org = Organization(
                id=ORG_ID, name=org_data["name"],
                description="中文音聲與 ASMR 製作工作室。",
                website=org_data["website"], logoUrl=org_data["logoUrl"],
                bannerUrl=org_data["bannerUrl"], tags=["ASMR", "中文音聲"],
                ownerId=PLATFORM_OWNER_ID,
                createdAt=now, updatedAt=now,
            )
            db.add(org)
        elif not org.ownerId:
            org.ownerId = PLATFORM_OWNER_ID

        actors = {}
        created_actors = 0
        for name in sorted({name for work in works for name in work["voiceActors"]}):
            matches = db.query(Persona).filter(Persona.displayName == name).all()
            if len(matches) > 1:
                raise SystemExit(f"Ambiguous voice actor identity: {name}")
            if matches:
                actor = matches[0]
                role = db.query(PersonaRole).filter_by(personaId=actor.id, role="voice_actor").first()
                if actor.voiceActorHidden or not role or not role.isVisible:
                    raise SystemExit(f"Voice actor identity is not public: {name}")
            else:
                actor = Persona(
                    id=str(uuid.uuid4()), ownerId=None, displayName=name,
                    avatar="", bannerUrl="", bio="", website="", links=[],
                    organizationIds=[], tags=["聲演"], voiceActorHidden=False,
                    createdAt=now, updatedAt=now,
                )
                db.add(actor)
                db.add(PersonaRole(
                    id=str(uuid.uuid4()), personaId=actor.id, role="voice_actor",
                    isVisible=True, sourceTypes=["admin"], profile={},
                    createdAt=now, updatedAt=now,
                ))
                created_actors += 1
            actors[name] = actor.id

        created = 0
        for offset, work in enumerate(works):
            rows = db.query(PublicAudioWorkSubmission).filter_by(url=work["url"]).all()
            if len(rows) > 1:
                raise SystemExit(f"Duplicate existing works for {work['id']}")
            if rows:
                if rows[0].organizationId != ORG_ID or rows[0].status != "approved":
                    raise SystemExit(f"Existing work conflicts with {work['id']}")
                continue
            db.add(PublicAudioWorkSubmission(
                id=str(uuid.uuid4()), title=work["title"], url=work["url"],
                coverUrl=work["coverUrl"],
                description=f"聲演：{'、'.join(work['voiceActors'])}\n成人向・R18\n{work['platform']} 購買頁",
                creatorName=org.name, creatorUrl=org.website,
                organizationId=ORG_ID,
                voiceActorIds=[actors[name] for name in work["voiceActors"]],
                accessType="paid", contactEmail="", status="approved",
                reviewedAt=now, reviewedBy=REVIEWER, createdAt=now - offset * 1000,
            ))
            created += 1

        print(f"Organization: {org.name}; works to create: {created}; actors to create: {created_actors}")
        if args.apply:
            db.commit()
            invalidate_public_bundle_cache()
            print("Applied to Dev database")
        else:
            db.rollback()
            print("Dry run only")


if __name__ == "__main__":
    main()
