"""Import reviewed NEON VOICE DLsite works into the Dev audio catalog.

Run from /app: python -m scripts.import_neon_voice_audio [--apply]
The accompanying JSON was checked against the official DLsite circle and
individual work credit pages on 2026-11-09. This command is idempotent and
refuses non-Dev databases.
"""

import argparse
from datetime import datetime, timezone
import json
import os
import time
import uuid
from pathlib import Path

from database import SessionLocal
from models import Organization, Persona, PersonaRole, PublicAudioWorkSubmission


ORG_ID = "87048680-532d-40db-9450-16617351b77b"
CIRCLE_URL = "https://www.dlsite.com/maniax/circle/profile/=/maker_id/RG65763.html"
WORKS = json.loads(Path(__file__).with_name("neon_voice_works.json").read_text())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if "write_project_dev" not in os.getenv("DATABASE_URL", ""):
        raise SystemExit("Refusing to modify a database outside write_project_dev")
    if len(WORKS) != 29 or len({work["id"] for work in WORKS}) != 29:
        raise SystemExit("Expected 29 unique reviewed DLsite works")
    if any(not work.get("voiceActors") for work in WORKS):
        raise SystemExit("Every reviewed work must have source-verified voice actors")
    if any(not work.get("releasedOn") or not work.get("summary") or not work.get("credits") for work in WORKS):
        raise SystemExit("Every reviewed work must have date, synopsis and production credits")

    with SessionLocal() as db:
        org = db.get(Organization, ORG_ID)
        if not org or org.name != "NEON VOICE 霓聲工作室":
            raise SystemExit("Expected NEON VOICE organization was not found")

        changed = 0
        actor_ids = {}
        for name in sorted({name for work in WORKS for name in work["voiceActors"]}):
            matches = db.query(Persona).filter(Persona.displayName == name).all()
            if len(matches) > 1:
                raise SystemExit(f"Multiple existing personas named {name}")
            if matches:
                actor = matches[0]
                if actor.voiceActorHidden:
                    raise SystemExit(f"Voice actor {name} is hidden")
                print(f"ACTOR EXISTS {name}")
            else:
                print(f"CREATE ACTOR {name}")
                actor = Persona(
                    id=str(uuid.uuid4()), ownerId=None, displayName=name,
                    avatar="", bannerUrl="", bio="", website="", links=[],
                    organizationIds=[], tags=["聲演"], voiceActorHidden=False,
                )
                db.add(actor)
                db.add(PersonaRole(
                    id=str(uuid.uuid4()), personaId=actor.id, role="voice_actor",
                    isVisible=True, sourceTypes=["admin"], profile={},
                ))
                changed += 1
            actor_ids[name] = actor.id

        for work in WORKS:
            product_id = work["id"]
            url = f"https://www.dlsite.com/maniax/work/=/product_id/{product_id}.html"
            credited_ids = [actor_ids[name] for name in work["voiceActors"]]
            published_at = int(datetime.strptime(work["releasedOn"], "%Y-%m-%d").replace(tzinfo=timezone.utc).timestamp() * 1000)
            credit_lines = [f"{role}：{'、'.join(names)}" for role, names in work["credits"].items()]
            description = "內容簡介\n" + work["summary"] + "\n\n製作資訊\n" + "\n".join(credit_lines) + "\n成人向・R18"
            matches = db.query(PublicAudioWorkSubmission).filter(
                PublicAudioWorkSubmission.url.contains(product_id)
            ).all()
            if len(matches) > 1:
                raise SystemExit(f"Multiple existing entries for {product_id}")
            if matches:
                row = matches[0]
                if row.organizationId != ORG_ID or row.url != url:
                    raise SystemExit(f"Conflicting existing entry for {product_id}")
                if row.voiceActorIds != credited_ids or row.publishedAt != published_at or row.description != description:
                    if row.reviewedBy != "neon-voice-reviewed-import":
                        raise SystemExit(f"Work {product_id} has manually managed details")
                    row.voiceActorIds = credited_ids
                    row.publishedAt = published_at
                    row.description = description
                    changed += 1
                    print(f"UPDATE {product_id}: {work['releasedOn']}")
                else:
                    print(f"EXISTS {product_id}: {row.title}")
                continue

            print(f"PUBLISH {product_id}: {work['title']}")
            db.add(PublicAudioWorkSubmission(
                id=str(uuid.uuid4()),
                title=work["title"],
                url=url,
                coverUrl=work["coverUrl"],
                description=description,
                creatorName=org.name,
                creatorUrl=CIRCLE_URL,
                organizationId=ORG_ID,
                voiceActorIds=credited_ids,
                publishedAt=published_at,
                accessType="paid",
                contactEmail="",
                status="approved",
                reviewedAt=int(time.time() * 1000),
                reviewedBy="neon-voice-reviewed-import",
                createdAt=int(time.time() * 1000),
            ))
            changed += 1

        if args.apply:
            db.commit()
            print(f"Applied {changed} changes")
        else:
            db.rollback()
            print(f"Dry run: {changed} changes; rerun with --apply")


if __name__ == "__main__":
    main()
