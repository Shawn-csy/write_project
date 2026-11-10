"""Import the reviewed HR Lab DLsite catalog into the Dev audio directory.

Run from /app: python -m scripts.import_hrlab_audio [--apply]
The source snapshot was checked against the official Portaly and DLsite pages
on 2026-11-09. Re-running does not create duplicate works.
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


SNAPSHOT = Path(__file__).with_name("data") / "hrlab_audio_2026-11-09.json"
ORG_ID = str(uuid.uuid5(uuid.NAMESPACE_URL, "https://portaly.cc/hclab"))
ACTOR_ID = "f878d56b-5077-418b-a15c-6755e65f7018"
REVIEWER = "hrlab-reviewed-import"
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
    if len(works) != 35 or len({work["id"] for work in works}) != 35:
        raise SystemExit("Expected 35 unique DLsite works")
    if org_data["website"] != "https://portaly.cc/hclab":
        raise SystemExit("Unexpected organization source")
    for work in works:
        if (work["url"] != f"https://www.dlsite.com/maniax/work/=/product_id/{work['id']}.html"
                or work["id"] not in work["coverUrl"]
                or work["voiceActors"] != ["伊橙/Kurihara Risako"]):
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
                id=ORG_ID, name=org_data["name"],
                description=org_data["description"], website=org_data["website"],
                logoUrl=org_data["logoUrl"], bannerUrl=org_data["bannerUrl"],
                tags=["中文音聲", "ASMR"], ownerId=PLATFORM_OWNER_ID,
                createdAt=now, updatedAt=now,
            )
            db.add(org)
        elif org.bannerUrl != org_data["bannerUrl"]:
            org.bannerUrl = org_data["bannerUrl"]
            org.updatedAt = now

        actor = db.get(Persona, ACTOR_ID)
        role = db.query(PersonaRole).filter_by(personaId=ACTOR_ID, role="voice_actor").first()
        if (not actor or actor.displayName != "伊橙/Kurihara Risako"
                or actor.voiceActorHidden or not role or not role.isVisible):
            raise SystemExit("Expected public 伊橙 voice actor identity was not found")

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
                description="聲演：伊橙/Kurihara Risako\n成人向・R18\nDLsite 購買頁",
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
