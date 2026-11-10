"""Import the reviewed CXC 男色研究所 audio catalog into the Dev database.

Run from /app: python -m scripts.import_man_research11_audio [--apply]
Album dates are CXC's last updated dates; track dates are CXC listing dates.
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


SNAPSHOT = Path(__file__).with_name("data") / "man_research11_audio_2026-11-09.json"
ORG_ID = str(uuid.uuid5(uuid.NAMESPACE_URL, "https://cxc.today/zh/@man_research11"))
REVIEWER = "man-research11-reviewed-import"
PLATFORM_OWNER_ID = "FBP0FGybEscMUlfl2uRTUxfq0ZT2"


def work_url(work):
    base = f"https://cxc.today/@man_research11/album/{work.get('album', work['id'])}"
    return base if work["kind"] == "album" else f"{base}/track/{work['id']}"


def work_description(work):
    lines = ["內容簡介", work["summary"], "", "製作資訊"]
    if work["actors"]:
        lines.append("聲演：" + "、".join(work["actors"]))
    lines.extend(f"{key}：{value}" for key, value in work["credits"].items())
    lines.append("分級：" + work["rating"])
    lines.append("CxC " + ("最後更新日" if work["kind"] == "album" else "上架日") + "：" + work["date"])
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if "write_project_dev" not in os.getenv("DATABASE_URL", ""):
        raise SystemExit("Refusing to modify a database outside write_project_dev")
    snapshot = json.loads(SNAPSHOT.read_text())
    works = snapshot["items"]
    if len(works) != 19 or len({work_url(work) for work in works}) != 19:
        raise SystemExit("Expected 19 unique reviewed CXC audio items")
    if any(not work["title"] or not work["summary"] or not work["date"] for work in works):
        raise SystemExit("Incomplete work metadata")
    now = int(time.time() * 1000)
    org_data = snapshot["organization"]
    with SessionLocal() as db:
        matches = db.query(Organization).filter_by(name=org_data["name"]).all()
        if len(matches) > 1 or (matches and matches[0].id != ORG_ID):
            raise SystemExit("Organization name conflicts with an existing record")
        org = db.get(Organization, ORG_ID)
        if org and org.name != org_data["name"]:
            raise SystemExit("Organization ID conflicts with an existing record")
        changed = 0
        if not org:
            org = Organization(
                id=ORG_ID, name=org_data["name"], description=org_data["description"],
                website=org_data["website"], logoUrl="", bannerUrl=org_data["bannerUrl"],
                tags=["女性向", "中文音聲", "ASMR"], ownerId=PLATFORM_OWNER_ID,
                createdAt=now, updatedAt=now,
            )
            db.add(org)
            changed += 1
        elif not org.bannerUrl:
            org.bannerUrl = org_data["bannerUrl"]
            org.updatedAt = now
            changed += 1
        actor_ids = {}
        for name in sorted({name for work in works for name in work["actors"]}):
            found = db.query(Persona).filter_by(displayName=name).all()
            if len(found) > 1:
                raise SystemExit(f"Ambiguous actor identity: {name}")
            if found:
                actor = found[0]
                role = db.query(PersonaRole).filter_by(personaId=actor.id, role="voice_actor").first()
                if actor.voiceActorHidden or not role or not role.isVisible:
                    raise SystemExit(f"Actor identity is not public: {name}")
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
                changed += 1
            actor_ids[name] = actor.id

        for work in works:
            url = work_url(work)
            existing = db.query(PublicAudioWorkSubmission).filter_by(url=url).all()
            if len(existing) > 1:
                raise SystemExit(f"Duplicate work URL: {url}")
            date_ms = int(datetime.strptime(work["date"], "%Y-%m-%d").replace(tzinfo=ZoneInfo("Asia/Taipei")).timestamp() * 1000)
            description = work_description(work)
            actor_list = [actor_ids[name] for name in work["actors"]]
            album_id = work.get("album", work["id"])
            cover = f"https://cxc.today/fs/book/{album_id}/coverphoto{work['coverStamp']}-sm.jpg"
            values = dict(title=work["title"], coverUrl=cover, description=description,
                          voiceActorIds=actor_list, publishedAt=date_ms,
                          accessType=work["access"])
            if existing:
                row = existing[0]
                if row.organizationId != ORG_ID or row.reviewedBy != REVIEWER:
                    raise SystemExit(f"Existing work is externally managed: {url}")
                if any(getattr(row, key) != value for key, value in values.items()):
                    for key, value in values.items():
                        setattr(row, key, value)
                    row.reviewedAt = now
                    changed += 1
                continue
            db.add(PublicAudioWorkSubmission(
                id=str(uuid.uuid4()), url=url, creatorName=org.name,
                creatorUrl=org_data["profile"], organizationId=ORG_ID,
                contactEmail="", status="approved", reviewedAt=now,
                reviewedBy=REVIEWER, createdAt=now, **values,
            ))
            changed += 1
        print(f"{org.name}: {len(works)} works, {changed} changes")
        if args.apply:
            db.commit()
            invalidate_public_bundle_cache()
            print("Applied to Dev database")
        else:
            db.rollback()
            print("Dry run only")


if __name__ == "__main__":
    main()
