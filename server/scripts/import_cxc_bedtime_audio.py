"""Reviewed Bedtime Story CXC audio works for the Dev catalog.

Run from /app: python -m scripts.import_cxc_bedtime_audio [--apply]
The script is idempotent and intentionally refuses non-Dev databases.
"""

import argparse
import os
import time
import uuid

from database import SessionLocal
from models import Organization, Persona, PublicAudioWorkSubmission


ORG_ID = "39189f92-73b3-47fd-8f59-343f9367a443"
ANLI = "809f8b27-f151-4759-8283-dab3dc2e823f"
YUEYUE = "ff30cc06-e8a7-4db2-830a-9b709eaf764b"

# These existing listings already have verified credits in their descriptions.
EXISTING = {
    "RJ01543594": [ANLI],
    "RJ01011709": [YUEYUE],
    "RJ01441869": [YUEYUE],
}

# The official homepage links to CXC as a sales channel. Its FreeASMR page
# links the first four items. Credits were checked on each item on 2026-11-09.
FREE = [
    ("56164", "【免費下載版】我與慵懶辣妹交往的經過", "https://cxc.today/fs/book/56164/coverphoto1782467045.png", [ANLI], "與同班同學藍朵兒從偶然搭話開始，逐漸走近彼此。"),
    ("56162", "【免費下載版】我的溫柔女友在床上不放過我", "https://cxc.today/fs/book/56162/coverphoto1782465772.png", [YUEYUE], "與年長女友紀嫻同居，感受她溫柔與熱情的兩面。"),
    ("41527", "【免費下載版】讓女僕依鵑&梟琴同心協力侍奉您♪", "https://cxc.today/fs/book/41527/coverphoto1769969368.png", [YUEYUE, ANLI], "貼身女僕依鵑與另一位女僕梟琴，捲入一段秘密關係。"),
    ("41551", "【免費下載版】我是女強人女友的性慾處理寵物", "https://cxc.today/fs/book/41551/coverphoto1769969344.png", [ANLI], "與事業有成的主管女友玥瀅同居；她在工作之外展露強勢的一面。"),
]
PAID = [
    ("63052", "暗戀的女同學成為了性處理委員", "https://cxc.today/fs/book/63052/coverphoto1792162556.png", [YUEYUE]),
    ("63050", "我與表姊的秘密禁斷假期", "https://cxc.today/fs/book/63050/coverphoto1792162436.png", [YUEYUE]),
    ("61339", "晚安，我們是你的榨精助眠天使♪", "https://cxc.today/fs/book/61339/coverphoto1789409605.png", [YUEYUE, ANLI]),
    ("61171", "身為拯救世界的勇者，接下來該對公主盡情播種了！？", "https://cxc.today/fs/book/61171/coverphoto1789348729.png", [ANLI, YUEYUE]),
]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if "write_project_dev" not in os.getenv("DATABASE_URL", ""):
        raise SystemExit("Refusing to modify a database outside write_project_dev")

    with SessionLocal() as db:
        org = db.get(Organization, ORG_ID)
        if not org or org.name != "被談聲聆":
            raise SystemExit("Expected Bedtime Story organization was not found")
        expected = {ANLI: "安里", YUEYUE: "葉月"}
        for actor_id, name in expected.items():
            actor = db.get(Persona, actor_id)
            if not actor or actor.displayName != name:
                raise SystemExit(f"Expected voice actor {name} was not found")

        changed = 0
        for token, actor_ids in EXISTING.items():
            rows = db.query(PublicAudioWorkSubmission).filter(PublicAudioWorkSubmission.url.contains(token)).all()
            if len(rows) != 1:
                raise SystemExit(f"Expected exactly one existing work for {token}; found {len(rows)}")
            row = rows[0]
            if row.organizationId != ORG_ID or row.status != "approved":
                raise SystemExit(f"Existing work {token} has unexpected organization or status")
            if row.voiceActorIds != actor_ids:
                print(f"LINK {token}: {actor_ids}")
                row.voiceActorIds = actor_ids
                changed += 1

        for item_id, title, cover, actor_ids, summary in [*FREE, *((id, title, cover, actors, "") for id, title, cover, actors in PAID)]:
            url = f"https://cxc.today/zh/@BedtimeStory/item/{item_id}"
            access_type = "free" if item_id in {entry[0] for entry in FREE} else "paid"
            description = (summary + "\n\n" if summary else "") + "聲演：" + "、".join(expected[actor_id] for actor_id in actor_ids) + "\n成人向・R18" + ("\n免費下載版" if summary else "")
            existing = db.query(PublicAudioWorkSubmission).filter_by(url=url).first()
            if existing:
                if existing.organizationId != ORG_ID or (existing.title != title and existing.reviewedBy != "cxc-reviewed-import"):
                    raise SystemExit(f"Existing CXC item {item_id} conflicts with reviewed data")
                if existing.voiceActorIds != actor_ids or existing.description != description or existing.title != title or existing.accessType != access_type:
                    print(f"LINK {item_id}: {actor_ids}")
                    existing.title = title
                    existing.voiceActorIds = actor_ids
                    existing.description = description
                    existing.accessType = access_type
                    changed += 1
                continue
            print(f"PUBLISH {item_id}: {title}")
            db.add(PublicAudioWorkSubmission(
                id=str(uuid.uuid4()), title=title, url=url, coverUrl=cover,
                description=description,
                creatorName="被談聲聆", creatorUrl="https://cxc.today/zh/@BedtimeStory",
                organizationId=ORG_ID, voiceActorIds=actor_ids, accessType=access_type, contactEmail="",
                status="approved", reviewedAt=int(time.time() * 1000), reviewedBy="cxc-reviewed-import",
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
