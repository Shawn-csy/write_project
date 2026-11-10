"""Import reviewed Fragrant Lily CxC audio works into the Dev audio directory.

Run from /app: python -m scripts.import_cxc_fragrantlily_audio [--apply]
The snapshot was reviewed against the public CxC catalog and Portaly profile
on 2026-11-09. Re-running does not duplicate organizations, actors or works.
"""

import argparse
import json
import os
from pathlib import Path
import time
import uuid

from database import SessionLocal
from models import Organization, Persona, PersonaRole, PublicAudioWorkSubmission
from routers.public_bundle import invalidate_public_bundle_cache


SNAPSHOT = Path(__file__).with_name("data") / "cxc_fragrantlily_audio_2026-11-09.json"
ORG_ID = str(uuid.uuid5(uuid.NAMESPACE_URL, "https://portaly.cc/fragrant_lily"))
ACTOR_IDS = {
    "香水百合": "384e4d79-2bc3-4a9c-959c-378e9f2fc1e6",
    "莉莉Lily": str(uuid.uuid5(uuid.NAMESPACE_URL, "https://cxc.today/zh/@fragrantlily/actor/莉莉Lily")),
}
REVIEWER = "cxc-fragrantlily-reviewed-import"
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
    excluded = snapshot["excluded"]
    if snapshot["storeId"] != 6407 or snapshot["sourceTotal"] != 43:
        raise SystemExit("Unexpected CxC store snapshot")
    if len(works) != 20 or len({work["id"] for work in works}) != 20:
        raise SystemExit("Expected 20 reviewed audio works")
    if (len(excluded) != 5 or len({work["id"] for work in excluded}) != 5
            or {work["id"] for work in works} & {work["id"] for work in excluded}):
        raise SystemExit("Unexpected excluded CxC items")
    if org_data["website"] != "https://portaly.cc/fragrant_lily":
        raise SystemExit("Unexpected organization source")
    for work in works:
        if (not work["url"].startswith("https://cxc.today/zh/@fragrantlily/")
                or work["id"] not in work["url"]
                or not work["coverUrl"].startswith(f"https://cxc.today/fs/book/{work['id']}/")
                or work["accessType"] not in {"free", "paid"}
                or any(name not in ACTOR_IDS for name in work["voiceActors"])):
            raise SystemExit(f"Invalid reviewed work: {work['id']}")

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

        primary = db.get(Persona, ACTOR_IDS["香水百合"])
        if not primary or primary.displayName != "香水百合" or primary.voiceActorHidden:
            raise SystemExit("Expected public 香水百合 persona was not found")
        primary_role = db.query(PersonaRole).filter_by(personaId=primary.id, role="voice_actor").first()
        if primary_role and not primary_role.isVisible:
            raise SystemExit("Existing 香水百合 voice actor role is hidden")
        if not primary_role:
            db.add(PersonaRole(
                id=str(uuid.uuid4()), personaId=primary.id, role="voice_actor",
                isVisible=True, sourceTypes=["admin"], profile={},
                createdAt=now, updatedAt=now,
            ))

        collaborator_id = ACTOR_IDS["莉莉Lily"]
        matches = db.query(Persona).filter_by(displayName="莉莉Lily").all()
        if len(matches) > 1 or (matches and matches[0].id != collaborator_id):
            raise SystemExit("莉莉Lily identity conflicts with an existing record")
        collaborator = db.get(Persona, collaborator_id)
        if not collaborator:
            collaborator = Persona(
                id=collaborator_id, ownerId=None, displayName="莉莉Lily",
                avatar="", bannerUrl="", bio="", website="", links=[],
                organizationIds=[], tags=["聲演"], voiceActorHidden=False,
                createdAt=now, updatedAt=now,
            )
            db.add(collaborator)
            db.add(PersonaRole(
                id=str(uuid.uuid4()), personaId=collaborator_id, role="voice_actor",
                isVisible=True, sourceTypes=["admin"], profile={},
                createdAt=now, updatedAt=now,
            ))
        else:
            role = db.query(PersonaRole).filter_by(personaId=collaborator_id, role="voice_actor").first()
            if collaborator.voiceActorHidden or not role or not role.isVisible:
                raise SystemExit("Existing 莉莉Lily identity is not a public voice actor")

        created = 0
        withdrawn = 0
        for offset, work in enumerate(works):
            rows = db.query(PublicAudioWorkSubmission).filter_by(url=work["url"]).all()
            if len(rows) > 1:
                raise SystemExit(f"Duplicate existing entries for {work['id']}")
            if rows:
                if rows[0].organizationId != ORG_ID or rows[0].status != "approved":
                    raise SystemExit(f"Existing work conflicts with {work['id']}")
                continue
            credit_lines = [f"{role}：{'、'.join(names)}" for role, names in work["credits"].items()]
            description = "\n".join(credit_lines)
            if work["isAdult"]:
                description += "\n成人向・R18"
            if work["subscriberOnly"]:
                description += "\n訂閱粉絲限定"
            description += f"\nCxC 最後更新：{work['updatedAt'][:10]}"
            db.add(PublicAudioWorkSubmission(
                id=str(uuid.uuid4()), title=work["title"], url=work["url"],
                coverUrl=work["coverUrl"], description=description,
                creatorName=org.name, creatorUrl=org.website,
                organizationId=ORG_ID,
                voiceActorIds=[ACTOR_IDS[name] for name in work["voiceActors"]],
                accessType=work["accessType"], contactEmail="", status="approved",
                reviewedAt=now, reviewedBy=REVIEWER, createdAt=now - offset * 1000,
            ))
            created += 1

        for work in excluded:
            rows = db.query(PublicAudioWorkSubmission).filter_by(url=work["url"]).all()
            if len(rows) > 1:
                raise SystemExit(f"Duplicate excluded entries for {work['id']}")
            if not rows:
                continue
            row = rows[0]
            if row.organizationId != ORG_ID or row.reviewedBy != REVIEWER:
                raise SystemExit(f"Excluded work was modified outside this import: {work['id']}")
            if row.status == "approved":
                row.status = "rejected"
                row.reviewedAt = now
                withdrawn += 1
            elif row.status != "rejected":
                raise SystemExit(f"Unexpected status for excluded work: {work['id']}")

        print(f"Organization: {org.name}; works to create: {created}; works to withdraw: {withdrawn}")
        if args.apply:
            db.commit()
            invalidate_public_bundle_cache()
            print("Applied to Dev database")
        else:
            db.rollback()
            print("Dry run only")


if __name__ == "__main__":
    main()
