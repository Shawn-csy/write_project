"""Import reviewed, published Bedtime Story CxC products into the Dev audio catalog.

Run from /app: python -m scripts.import_cxc_bedtime_catalog [--apply]
The checked-in snapshot records the CxC product ID, cover, credits, price type,
and publication state reviewed on 2026-11-09. Re-running is idempotent.
"""

import argparse
import json
import os
import time
import uuid
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from database import SessionLocal
from models import Organization, Persona, PersonaRole, PublicAudioWorkSubmission


ORG_ID = "39189f92-73b3-47fd-8f59-343f9367a443"
SNAPSHOT = Path(__file__).with_name("data") / "cxc_bedtime_audio_2026-11-09.json"
SOURCE_URL = "https://cxc.today/zh/@BedtimeStory"
REVIEWER = "cxc-reviewed-catalog-import"


def load_snapshot():
    payload = json.loads(SNAPSHOT.read_text())
    if payload.get("storeId") != 6409 or len(payload.get("items", [])) != 93:
        raise SystemExit("Unexpected CxC catalog snapshot")
    items = payload["items"]
    if len({item["id"] for item in items}) != len(items):
        raise SystemExit("Duplicate CxC product IDs in snapshot")
    for item in items:
        if not item["title"].strip() or not item["coverUrl"].startswith(
            f"https://cxc.today/fs/book/{item['id']}/"
        ):
            raise SystemExit(f"Invalid product metadata for {item['id']}")
        if not item["voiceActors"] or item["accessType"] not in {"paid", "free"}:
            raise SystemExit(f"Missing credits or price type for {item['id']}")
        if not isinstance(item.get("credits"), dict) or not item["credits"].get("台本"):
            raise SystemExit(f"Missing production credits for {item['id']}")
        datetime.fromisoformat(item["publishedAt"])
    return items


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if "write_project_dev" not in os.getenv("DATABASE_URL", ""):
        raise SystemExit("Refusing to modify a database outside write_project_dev")
    items = load_snapshot()
    now_ms = int(time.time() * 1000)
    with SessionLocal() as db:
        org = db.get(Organization, ORG_ID)
        if not org or org.name != "被談聲聆":
            raise SystemExit("Expected Bedtime Story organization was not found")

        actor_names = {name for item in items for name in item["voiceActors"]}
        actors = {}
        created_actor = 0
        for name in sorted(actor_names):
            matches = db.query(Persona).filter_by(displayName=name).all()
            if len(matches) > 1:
                raise SystemExit(f"Ambiguous voice actor identity: {name}")
            if matches:
                actor = matches[0]
                role = db.query(PersonaRole).filter_by(personaId=actor.id, role="voice_actor").first()
                if not role or not role.isVisible:
                    raise SystemExit(f"Voice actor identity is not public: {name}")
            elif name == "晚晚":
                actor = Persona(
                    id=str(uuid.uuid4()), ownerId=None, displayName=name, avatar="", bannerUrl="",
                    bio="", website="", links=[], organizationIds=[], tags=["聲演"],
                    voiceActorHidden=False, createdAt=now_ms, updatedAt=now_ms,
                )
                db.add(actor)
                db.add(PersonaRole(
                    id=str(uuid.uuid4()), personaId=actor.id, role="voice_actor",
                    isVisible=True, sourceTypes=["admin"], profile={},
                    createdAt=now_ms, updatedAt=now_ms,
                ))
                created_actor += 1
            else:
                raise SystemExit(f"Missing voice actor identity: {name}")
            actors[name] = actor.id

        existing_rows = db.query(PublicAudioWorkSubmission).filter_by(organizationId=ORG_ID).all()
        by_url = {row.url: row for row in existing_rows}
        created = updated = 0
        for offset, item in enumerate(items):
            url = f"{SOURCE_URL}/item/{item['id']}"
            actor_ids = [actors[name] for name in item["voiceActors"]]
            description = "聲演：" + "、".join(item["voiceActors"])
            published_at = int(datetime.fromisoformat(item["publishedAt"]).replace(tzinfo=ZoneInfo("Asia/Taipei")).timestamp() * 1000)
            if item["isAdult"]:
                description += "\n成人向・R18"
            if item["accessType"] == "free":
                description += "\n免費下載版"
            credit_lines = [f"{key}：{value}" for key, value in item["credits"].items()]
            row = by_url.get(url)
            if row:
                if row.status != "approved":
                    raise SystemExit(f"Existing CxC product {item['id']} is not approved")
                changes = {
                    "title": item["title"], "coverUrl": item["coverUrl"],
                    "voiceActorIds": actor_ids, "accessType": item["accessType"],
                    "creatorName": "被談聲聆", "creatorUrl": SOURCE_URL,
                    "publishedAt": published_at,
                }
                dirty = False
                for field, value in changes.items():
                    if getattr(row, field) != value:
                        setattr(row, field, value)
                        dirty = True
                original_description = row.description or ""
                row.description = original_description + "".join(
                    f"\n{line}" for line in credit_lines if line not in original_description
                )
                dirty = dirty or row.description != original_description
                if dirty:
                    updated += 1
                continue
            db.add(PublicAudioWorkSubmission(
                id=str(uuid.uuid4()), title=item["title"], url=url,
                coverUrl=item["coverUrl"], description=description + "\n" + "\n".join(credit_lines),
                creatorName="被談聲聆", creatorUrl=SOURCE_URL,
                organizationId=ORG_ID, voiceActorIds=actor_ids,
                accessType=item["accessType"], contactEmail="",
                status="approved", reviewedAt=now_ms, reviewedBy=REVIEWER,
                publishedAt=published_at,
                createdAt=now_ms - offset * 1000,
            ))
            created += 1

        print(f"Snapshot: {len(items)} published products; create {created}, update {updated}, voice actors {created_actor}")
        if args.apply:
            db.commit()
            from routers.public_bundle import invalidate_public_bundle_cache
            invalidate_public_bundle_cache()
            print("Applied to Dev database")
        else:
            db.rollback()
            print("Dry run only")


if __name__ == "__main__":
    main()
