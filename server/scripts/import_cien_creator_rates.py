"""Add the reviewed Ci-en 2026 commission reference to matched production identities.

Run from /app: python -m scripts.import_cien_creator_rates [--apply]
"""

import argparse
import json
import os
from pathlib import Path
import time
import uuid
from urllib.parse import urlparse

from database import SessionLocal
from models import Organization, Persona, PersonaOrganizationMembership, PersonaRole
from routers.public_bundle import invalidate_public_bundle_cache


SNAPSHOT = Path(__file__).with_name("data") / "cien_2026_creator_rates_2026-11-12.json"
SOURCE = "https://ci-en.dlsite.com/creator/38579/article/1882753"
IDS = {
    "安里": "809f8b27-f151-4759-8283-dab3dc2e823f",
    "葉月": "ff30cc06-e8a7-4db2-830a-9b709eaf764b",
    "草草龍": "b2c05820-0f99-57a3-a2ba-a951bbaa8fae",
    "Kirara": "a2844a64-b983-5e1b-89d0-f5f7c551ca74",
    "湘湘": "cb2a7c63-2c91-56c0-bc4c-b8c96a79b6e3",
    "芽瑪": "2c67052d-ce2b-50dc-b990-9c52b05d83c1",
    "香水百合": "384e4d79-2bc3-4a9c-959c-378e9f2fc1e6",
    "凜峰": "c3fd5edd-98b3-4489-8896-214942281574",
    "逸綺": "301b1fae-71e9-4294-8cd9-e48e95c2986b",
    "蜘蛛K": "8d64485b-6f55-4234-81a7-53a86b88f421",
    "白野蓮子": "192a22c2-8d69-428a-a733-f19229f26e86",
    "毛捲捲": "e29da18d-8f1d-49d3-b614-c503326bfb2b",
    "大白": "1f2366db-b959-4b69-aa16-53087e425e09",
    "赤赤": "c8b732b3-a32d-4303-9860-380dc8708780",
    "恩恩": "e223ee6a-2996-4be6-8a9e-19bddaf46fa9",
    "韾笙重工": "bf57e72c-8f4e-4157-bc69-0c57fcd39188",
    "風蓮/Hong Liân": str(uuid.uuid5(uuid.NAMESPACE_URL, "https://www.hongliantw.com/")),
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if urlparse(os.environ.get("DATABASE_URL", "")).path != "/write_project":
        raise SystemExit("Refusing to modify a database other than production write_project")
    snapshot = json.loads(SNAPSHOT.read_text())
    people = snapshot["people"]
    if snapshot["sourceUrl"] != SOURCE or len(people) != 17 or {p["name"] for p in people} != set(IDS):
        raise SystemExit("Expected 17 distinct, reviewed creator identities")
    now = int(time.time() * 1000)
    changes = 0
    with SessionLocal() as db:
        for item in people:
            name = item["name"]
            person_id = IDS[name]
            person = db.get(Persona, person_id)
            if name == "風蓮/Hong Liân" and person is None:
                if db.query(Persona).filter_by(displayName=name).first():
                    raise SystemExit("Windlian name already belongs to a different identity")
                person = Persona(
                    id=person_id, ownerId=None, displayName=name, avatar="", bannerUrl="",
                    bio=item["bio"], website=item["website"], links=[],
                    organizationIds=[], tags=["台本師", "後製", "錄音師"],
                    voiceActorHidden=False, createdAt=now, updatedAt=now,
                )
                db.add(person)
                changes += 1
                db.flush()
            if person is None or person.displayName != name:
                raise SystemExit(f"Creator identity mismatch: {name}")
            if name == "風蓮/Hong Liân":
                for field in ("bio", "website"):
                    if getattr(person, field) != item[field]:
                        setattr(person, field, item[field])
                        person.updatedAt = now
                        changes += 1
                for org_name, affiliation in (("風橙實驗室 HR Lab.", "founder"), ("Handoru 寒濤旅社", "owner")):
                    orgs = db.query(Organization).filter_by(name=org_name).all()
                    if len(orgs) != 1:
                        raise SystemExit(f"Verified Windlian organization is missing or ambiguous: {org_name}")
                    membership = db.query(PersonaOrganizationMembership).filter_by(
                        personaId=person_id, orgId=orgs[0].id
                    ).first()
                    if not membership:
                        db.add(PersonaOrganizationMembership(
                            id=str(uuid.uuid4()), personaId=person_id, orgId=orgs[0].id,
                            role=affiliation, createdAt=now, updatedAt=now,
                        ))
                        changes += 1
            links = list(person.links or [])
            for link in item["contacts"] + [{"label": "2026 音聲委託參考價", "url": SOURCE}]:
                if not any(isinstance(old, dict) and old.get("url") == link["url"] for old in links):
                    links.append(link)
            if links != (person.links or []):
                person.links = links
                person.updatedAt = now
                changes += 1
            offers_by_role = {}
            for offer in item["offers"]:
                if offer["role"] not in {"voice_actor", "scriptwriter", "post_production", "recording_studio"}:
                    raise SystemExit(f"Unexpected role: {name} {offer['role']}")
                if not offer["details"] or not offer["service"]:
                    raise SystemExit(f"Incomplete commission data: {name}")
                offers_by_role.setdefault(offer["role"], []).append({
                    "service": offer["service"], "details": offer["details"],
                    "scope": snapshot["scope"], "sourceUrl": SOURCE,
                    "sourceUpdatedOn": snapshot["sourceUpdatedOn"],
                })
            for role_name, offers in offers_by_role.items():
                role = db.query(PersonaRole).filter_by(personaId=person_id, role=role_name).first()
                if role is None:
                    role = PersonaRole(
                        id=str(uuid.uuid4()), personaId=person_id, role=role_name,
                        isVisible=True, sourceTypes=["admin"], profile={},
                        createdAt=now, updatedAt=now,
                    )
                    db.add(role)
                    changes += 1
                elif not role.isVisible:
                    raise SystemExit(f"Creator role is hidden: {name} {role_name}")
                profile = dict(role.profile or {})
                if profile.get("commissionOffers") != offers:
                    profile["commissionOffers"] = offers
                    role.profile = profile
                    role.updatedAt = now
                    changes += 1
        print(f"Ci-en 2026 commission reference: {len(people)} identities, {changes} changes")
        if args.apply:
            db.commit()
            invalidate_public_bundle_cache()
            print("Applied to production database")
        else:
            db.rollback()
            print("Dry run only")


if __name__ == "__main__":
    main()
