"""Import verified DLsite audio works found through the PTT circle roundup.

Run inside the production API container after copying the reviewed snapshot:
    python -m scripts.import_ptt_chinese_audio_circles SNAPSHOT.json
    python -m scripts.import_ptt_chinese_audio_circles SNAPSHOT.json --apply

The PTT post is a discovery source. Each imported title, URL and cover was
checked against the corresponding DLsite product page on 2026-11-18.
"""

import argparse
from datetime import datetime
import json
import os
from pathlib import Path
import re
import time
from urllib.parse import urlparse
import uuid
from zoneinfo import ZoneInfo

from database import SessionLocal
from models import AudioWorkCredit, Organization, Persona, PersonaCredit, PersonaRole, PublicAudioWorkSubmission, User
from routers.public_bundle import invalidate_public_bundle_cache
from services.work_participations import catalog_participants, finalize_catalog_import, replace_catalog_participants


SOURCE = "https://www.pttweb.cc/bbs/C_Chat/M.1772807118.A.62B"
REVIEWER = "ptt-chinese-audio-circles-2026-11-18"
PRODUCT_ID = re.compile(r"^RJ\d{6,8}$")


def validate(snapshot):
    if snapshot.get("source") != SOURCE or len(snapshot.get("circles", [])) != 17:
        raise ValueError("Unexpected source or circle count")
    circles = {circle["makerId"]: circle for circle in snapshot["circles"]}
    if len(circles) != 17 or len(snapshot.get("items", [])) != 68:
        raise ValueError("Unexpected number of distinct circles or products")
    seen = set()
    for maker_id, circle in circles.items():
        expected = f"https://www.dlsite.com/{circle['category']}/circle/profile/=/maker_id/{maker_id}.html"
        if circle["url"] != expected or not circle["name"] or not circle["productIds"]:
            raise ValueError(f"Invalid circle: {maker_id}")
        if len(circle["productIds"]) != len(set(circle["productIds"])):
            raise ValueError(f"Duplicate circle products: {maker_id}")
    profiles = snapshot.get("resourceProfiles", [])
    retired_ids = set(snapshot.get("retiredResourceIds", []))
    profile_ids = set()
    for profile in profiles:
        if (profile["id"] in profile_ids or profile["id"] in retired_ids or not profile["displayName"]
                or (not profile.get("sourceOnly") and not profile["website"].startswith("https://"))
                or (profile.get("sourceOnly") and (profile["website"] or not profile.get("scopeMakerId")))
                or not profile["roles"] or not profile["sourceUrls"]):
            raise ValueError(f"Invalid resource profile: {profile}")
        profile_ids.add(profile["id"])
    for item in snapshot["items"]:
        product_id = item["id"]
        circle = circles.get(item["sourceMakerId"])
        if (not PRODUCT_ID.fullmatch(product_id) or product_id in seen or not circle
                or product_id not in circle["productIds"]
                or item["url"] != f"https://www.dlsite.com/{circle['category']}/work/=/product_id/{product_id}.html"
                or product_id not in item["coverUrl"] or not item["title"]
                or item["accessType"] not in {"free", "paid"}):
            raise ValueError(f"Invalid product: {product_id}")
        datetime.strptime(item["releasedOn"], "%Y-%m-%d")
        for participant in item.get("participants", []):
            if (participant.get("role") not in {"scriptwriter", "voice_actor", "cover_art",
                                                "post_production", "recording_studio"}
                    or not participant.get("creditedAs") or not participant.get("sourceRole")
                    or participant.get("sourceUrl") != item["url"]):
                raise ValueError(f"Invalid participant source: {product_id}")
            if participant.get("personaId") and not participant.get("identityEvidence"):
                raise ValueError(f"Identity link has no review evidence: {product_id}")
        seen.add(product_id)
    if seen != {product_id for circle in circles.values() for product_id in circle["productIds"]}:
        raise ValueError("Snapshot omits a listed audio product")
    return circles


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if urlparse(os.environ.get("DATABASE_URL", "")).path != "/write_project":
        raise SystemExit("Refusing to modify a database other than production write_project")
    snapshot = json.loads(args.snapshot.read_text())
    circles = validate(snapshot)
    retired_ids = set(snapshot.get("retiredResourceIds", []))
    now = int(time.time() * 1000)
    with SessionLocal() as db:
        platform = db.query(Organization).filter_by(name="泛用型產品作坊").one()
        if not platform.ownerId or not db.get(User, platform.ownerId):
            raise ValueError("Production platform owner is missing")
        existing_orgs = db.query(Organization).all()
        existing_works = db.query(PublicAudioWorkSubmission).all()
        # The URL contains a stable DLsite product ID, including across locale variants.
        by_product = {}
        for work in existing_works:
            for product_id in re.findall(r"R[JB]\d{6,8}", work.url or ""):
                by_product.setdefault(product_id, []).append(work)
        created_orgs = 0
        for circle in circles.values():
            org_id = str(uuid.uuid5(uuid.NAMESPACE_URL, circle["url"]))
            collisions = [org for org in existing_orgs if org.id == org_id or org.name == circle["name"]
                          or org.website == circle["url"]]
            if len(collisions) > 1 or (collisions and collisions[0].id != org_id):
                raise ValueError(f"Organization identity conflict: {circle['name']}")
            if not collisions:
                org = Organization(id=org_id, name=circle["name"],
                                   description="DLsite 中文音聲社團。", website=circle["url"],
                                   logoUrl="", bannerUrl="", tags=["中文音聲"],
                                   ownerId=platform.ownerId, createdAt=now, updatedAt=now)
                db.add(org)
                existing_orgs.append(org)
                created_orgs += 1
        db.flush()
        created_personas = 0
        created_roles = 0
        existing_personas = db.query(Persona).all()
        existing_roles = {(role.personaId, role.role) for role in db.query(PersonaRole).all()}
        for profile in snapshot.get("resourceProfiles", []):
            if profile.get("sourceOnly"):
                # A source-only card is scoped to one DLsite maker. A same-named
                # identity elsewhere is not evidence that these people match.
                collisions = [person for person in existing_personas if person.id == profile["id"]]
            else:
                collisions = [person for person in existing_personas if person.id not in retired_ids
                              and (
                              person.id == profile["id"] or person.displayName == profile["displayName"]
                              or person.website == profile["website"])]
            if len(collisions) > 1 or (collisions and collisions[0].id != profile["id"]):
                raise ValueError(f"Resource identity conflict: {profile['displayName']}")
            if collisions:
                person = collisions[0]
                if person.displayName != profile["displayName"] or person.website != profile["website"]:
                    raise ValueError(f"Resource profile changed: {profile['displayName']}")
            else:
                person = Persona(id=profile["id"], ownerId=None,
                                 displayName=profile["displayName"], website=profile["website"],
                                 avatar="", bannerUrl="", bio="", links=[], organizationIds=[],
                                 tags=[], voiceActorHidden=False, createdAt=now, updatedAt=now)
                db.add(person)
                existing_personas.append(person)
                created_personas += 1
            for role_name in profile["roles"]:
                if (person.id, role_name) not in existing_roles:
                    role_profile = {}
                    if role_name == "recording_studio" and profile.get("recordingEntityType"):
                        role_profile = {"entityType": profile["recordingEntityType"],
                                        "entityTypeSourceUrl": profile["sourceUrls"][0]}
                    db.add(PersonaRole(id=str(uuid.uuid5(uuid.NAMESPACE_URL, person.id + ':' + role_name)),
                                       personaId=person.id, role=role_name, isVisible=True,
                                       sourceTypes=["catalog_import"], profile=role_profile,
                                       createdAt=now, updatedAt=now))
                    existing_roles.add((person.id, role_name))
                    created_roles += 1
        db.flush()
        created_works = 0
        updated_works = 0
        replaced_rosters = 0
        removed_bad_source_credits = 0
        work_ids = []
        for item in snapshot["items"]:
            product_id = item["id"]
            circle = circles[item["sourceMakerId"]]
            org_id = str(uuid.uuid5(uuid.NAMESPACE_URL, circle["url"]))
            released_at = int(datetime.strptime(item["releasedOn"], "%Y-%m-%d")
                              .replace(hour=12, tzinfo=ZoneInfo("Asia/Tokyo")).timestamp() * 1000)
            existing = by_product.get(product_id, [])
            if len(existing) > 1:
                raise ValueError(f"Duplicate existing product ID: {product_id}")
            if existing:
                work = existing[0]
                if (work.organizationId != org_id or work.status != "approved"
                        or work.url != item["url"] or work.reviewedBy != REVIEWER):
                    raise ValueError(f"Product is managed elsewhere: {product_id}")
                if work.title != item["title"] or work.coverUrl != item["coverUrl"]:
                    raise ValueError(f"Existing product differs from reviewed source: {product_id}")
                if work.publishedAt != released_at:
                    work.publishedAt = released_at
                    updated_works += 1
            else:
                description = item["summary"]
                if item["adult"]:
                    description = (description + "\n\nR18・成人向").strip()
                work = PublicAudioWorkSubmission(
                    id=str(uuid.uuid5(uuid.NAMESPACE_URL, item["url"])),
                    title=item["title"], url=item["url"], coverUrl=item["coverUrl"],
                    description=description, creatorName=circle["name"],
                    creatorUrl=circle["url"], organizationId=org_id,
                    voiceActorIds=[], accessType=item["accessType"], contactEmail="",
                    status="approved", reviewedAt=now, reviewedBy=REVIEWER,
                    publishedAt=released_at, createdAt=now)
                db.add(work)
                created_works += 1
            work_ids.append(work.id)
        db.flush()
        current_rosters = catalog_participants(db, work_ids)
        by_url = {work.url: work for work in db.query(PublicAudioWorkSubmission).filter(
            PublicAudioWorkSubmission.id.in_(work_ids)).all()}
        for item in snapshot["items"]:
            work = by_url[item["url"]]
            expected = {(p["role"], p["creditedAs"], p.get("personaId"))
                        for p in item.get("participants", [])}
            current = {(p["role"], p["creditedAs"], p.get("personaId"))
                       for p in current_rosters.get(work.id, [])}
            if current != expected:
                replace_catalog_participants(db, work, item.get("participants", []), reviewed=True)
                replaced_rosters += 1
            for bad_name in ("伊橙 (", "小語 ("):
                for source in db.query(AudioWorkCredit).filter_by(
                        audioWorkId=work.id, role="音效", creditedAs=bad_name,
                        provenance="source_import").all():
                    db.delete(source)
                    removed_bad_source_credits += 1
        report = finalize_catalog_import(db, work_ids=work_ids, source_items=snapshot["items"])
        retired_personas = 0
        for retired_id in snapshot.get("retiredResourceIds", []):
            person = db.get(Persona, retired_id)
            if not person:
                continue
            if (person.ownerId or person.website or db.query(PersonaCredit).filter_by(personaId=retired_id).first()):
                raise ValueError(f"Retired resource has independent content: {retired_id}")
            db.query(PersonaRole).filter_by(personaId=retired_id).delete(synchronize_session=False)
            db.delete(person)
            retired_personas += 1
        print(json.dumps({"organizationsCreated": created_orgs, "resourcesCreated": created_personas,
                          "resourceRolesCreated": created_roles, "resourcesRetired": retired_personas,
                          "worksCreated": created_works,
                          "worksUpdated": updated_works, "rostersCorrected": replaced_rosters,
                          "invalidSourceCreditsRemoved": removed_bad_source_credits,
                          "linkedCreditsInSnapshot": sum(bool(p.get("personaId"))
                                                          for item in snapshot["items"]
                                                          for p in item.get("participants", [])),
                          "additionalLinksFromFinalization": report["newIdentityLinks"],
                          "unresolvedCredits": len(report["unresolved"])}, ensure_ascii=False))
        if args.apply:
            db.commit()
            invalidate_public_bundle_cache()
            print("Applied to production")
        else:
            db.rollback()
            print("Dry run only")


if __name__ == "__main__":
    main()
