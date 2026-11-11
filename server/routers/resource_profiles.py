"""Visitor contributions to production resource profiles, reviewed before publication."""

import time
import uuid
from urllib.parse import urlparse

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from sqlalchemy.orm import Session

import models
import schemas
from dependencies import get_db, get_current_user_id, is_admin_user
from rate_limit import limiter
from services.admin_notifications import notify_approval_request
from routers import public_bundle
from routers.admin import _send_public_paths_revalidation

router = APIRouter(prefix="/api", tags=["public"])
admin_router = APIRouter(prefix="/api/admin", tags=["admin"])
PROFILE_FIELDS = {"displayName", "bio", "avatarUrl", "profileUrl", "links"}
RESOURCE_ROLES = {"post_production", "cover_art", "recording_studio"}
WORK_TYPES = {"audio", "game", "video", "other"}


def _public_url(value: object, *, image: bool = False) -> str:
    raw = str(value or "").strip()[:2000]
    if not raw:
        return ""
    if image and raw.startswith("/media/"):
        return raw
    parsed = urlparse(raw)
    if parsed.scheme in {"http", "https"} and parsed.hostname:
        return raw
    raise HTTPException(status_code=400, detail="請使用有效的公開 http(s) 網址")


def _resources(db: Session) -> dict[str, dict]:
    bundle = public_bundle._build_bundle_sections(db, frozenset({"productionResources"}))
    return {item["id"]: item for item in bundle["productionResources"]}


def _current_profile(item: dict) -> dict:
    return {
        "displayName": item.get("name") or "",
        "bio": item.get("bio") or item.get("summary") or "",
        "avatarUrl": item.get("avatarUrl") or "",
        "profileUrl": item.get("profileUrl") or "",
        "profileLabel": item.get("profileLabel") or "",
        "links": item.get("links") or [],
        "works": item.get("works") or [],
        "contributors": item.get("contributors") or [],
    }


def _record(row: models.ProductionResourceProfileSubmission, resources: dict[str, dict]) -> schemas.ProductionResourceProfileSubmissionRecord:
    item = resources.get(row.resourceId)
    return schemas.ProductionResourceProfileSubmissionRecord(
        id=row.id, resourceId=row.resourceId,
        resourceName=item["name"] if item else "（資源已移除）",
        submitterName=row.submitterName, contactEmail=row.contactEmail,
        currentProfile=_current_profile(item) if item else {},
        profile=row.profile if isinstance(row.profile, dict) else {},
        acceptedFields=row.acceptedFields if isinstance(row.acceptedFields, list) else [],
        status=row.status, reviewNote=row.reviewNote or "",
        reviewedAt=row.reviewedAt, createdAt=row.createdAt,
    )


@router.post("/production-resource-profile-submissions", response_model=schemas.ProductionResourceProfileSubmissionResponse)
@limiter.limit("5/hour")
def submit_resource_profile(request: Request, payload: schemas.ProductionResourceProfileSubmissionCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    now = int(time.time() * 1000)
    if payload.websiteTrap:
        return schemas.ProductionResourceProfileSubmissionResponse(success=True, submissionId="", createdAt=now)
    item = _resources(db).get(payload.resourceId)
    if not item or not item.get("works"):
        raise HTTPException(status_code=404, detail="找不到公開的資源頁")
    if db.query(models.ProductionResourceProfileSubmission.id).filter_by(resourceId=payload.resourceId, status="pending").first():
        raise HTTPException(status_code=409, detail="這筆資源已有一份資料補充申請正在審核")
    submitter = payload.submitterName.strip()[:120]
    email = payload.contactEmail.strip()[:320]
    contributor = payload.contributorName.strip()[:120]
    name = payload.displayName.strip()[:120]
    if not submitter or not email or "@" not in email or " " in email:
        raise HTTPException(status_code=400, detail="請填寫姓名與有效的聯絡 Email")
    if not contributor or not name:
        raise HTTPException(status_code=400, detail="請填寫公開名稱與資料補充者名稱")
    if len(payload.links) > 30 or len(payload.works) > 30:
        raise HTTPException(status_code=400, detail="連結與參與作品各最多可補充 30 筆")
    links = []
    for link in payload.links:
        label = str(link.get("label") or "").strip()[:120]
        url = _public_url(link.get("url"))
        if url:
            links.append({"label": label or "社群連結", "url": url})
    works = []
    for work in payload.works:
        role = str(work.get("creditRole") or "").strip()
        if role not in RESOURCE_ROLES or role not in item.get("categories", []):
            raise HTTPException(status_code=400, detail="參與作品的製作類別無效")
        url = _public_url(work.get("url"))
        if not url:
            raise HTTPException(status_code=400, detail="參與作品需提供網址")
        title = str(work.get("title") or "").strip()[:200]
        if not title:
            raise HTTPException(status_code=400, detail="參與作品需提供名稱")
        work_type = str(work.get("workType") or "audio").strip()
        if work_type not in WORK_TYPES:
            raise HTTPException(status_code=400, detail="參與作品的類型無效")
        works.append({"title": title, "url": url,
                      "coverUrl": _public_url(work.get("coverUrl"), image=True),
                      "workType": work_type, "creditRole": role})
    profile = {
        "displayName": name, "bio": payload.bio.strip()[:4000],
        "avatarUrl": _public_url(payload.avatarUrl, image=True),
        "profileUrl": _public_url(payload.profileUrl),
        "profileLabel": payload.profileLabel.strip()[:120],
        "links": links, "works": works,
        "contributorName": contributor,
    }
    row = models.ProductionResourceProfileSubmission(
        id=str(uuid.uuid4()), resourceId=payload.resourceId,
        submitterName=submitter, contactEmail=email, profile=profile,
        status="pending", createdAt=now,
    )
    db.add(row)
    db.commit()
    background_tasks.add_task(notify_approval_request, "resource_profile", {
        "id": row.id, "resourceId": row.resourceId, "name": profile.get("displayName"),
        "submitterName": row.submitterName, "contactEmail": row.contactEmail,
    })
    return schemas.ProductionResourceProfileSubmissionResponse(success=True, submissionId=row.id, createdAt=now)


@admin_router.get("/production-resource-profile-submissions", response_model=schemas.ProductionResourceProfileSubmissionListResponse)
def list_resource_profiles(status: str = "pending", limit: int = 100, offset: int = 0,
                           db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    if status not in {"pending", "approved", "rejected", "all"}:
        raise HTTPException(status_code=400, detail="無效的審核狀態")
    query = db.query(models.ProductionResourceProfileSubmission)
    if status != "all":
        query = query.filter_by(status=status)
    total = query.count()
    rows = query.order_by(models.ProductionResourceProfileSubmission.createdAt.desc()).offset(max(offset, 0)).limit(min(max(limit, 1), 200)).all()
    resources = _resources(db)
    return schemas.ProductionResourceProfileSubmissionListResponse(total=total, items=[_record(row, resources) for row in rows])


@admin_router.patch("/production-resource-profile-submissions/{submission_id}/status", response_model=schemas.ProductionResourceProfileSubmissionRecord)
def review_resource_profile(submission_id: str, payload: schemas.ProductionResourceProfileSubmissionStatusUpdate,
                            background_tasks: BackgroundTasks,
                            db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    row = db.query(models.ProductionResourceProfileSubmission).filter_by(id=submission_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="找不到資源資料申請")
    if row.status != "pending":
        raise HTTPException(status_code=409, detail="這筆申請已完成審核")
    resources = _resources(db)
    item = resources.get(row.resourceId)
    if not item:
        raise HTTPException(status_code=404, detail="原資源頁已不存在")
    now = int(time.time() * 1000)
    accepted = set(payload.acceptedFields)
    if payload.status == "approved":
        if not accepted:
            raise HTTPException(status_code=400, detail="請至少選擇一個要採用的資料欄位")
        proposed = row.profile if isinstance(row.profile, dict) else {}
        pending_works = []
        if "works" in accepted:
            for work in proposed.get("works", []):
                match = (db.query(models.PublicAudioWorkSubmission).filter_by(url=work["url"], status="approved").first()
                         if work.get("workType", "audio") == "audio" else None)
                if not match and not work.get("title"):
                    raise HTTPException(status_code=400, detail="站外作品請填寫作品名稱")
                pending_works.append((work, match))
        override = db.query(models.ProductionResourceProfileOverride).filter_by(id=row.resourceId).first()
        if not override:
            override = models.ProductionResourceProfileOverride(id=row.resourceId, profile={}, contributors=[], updatedAt=now)
            db.add(override)
        merged = dict(override.profile or {})
        for field in PROFILE_FIELDS & accepted:
            merged[field] = proposed.get(field, [] if field == "links" else "")
        if "profileUrl" in accepted:
            merged["profileLabel"] = proposed.get("profileLabel") or "創作者連結"
        override.profile = merged
        if "contributorName" in accepted:
            contributors = list(override.contributors or [])
            contributors.append({"name": proposed.get("contributorName") or "訪客協作者", "contributedAt": now})
            override.contributors = contributors[-100:]
        override.updatedAt = now
        curated = db.query(models.ProductionResource).filter_by(id=row.resourceId, status="published").first()
        for work, audio in pending_works:
            role = work["creditRole"]
            if any(existing["url"] == work["url"] and existing["creditRole"] == role for existing in item["works"]):
                continue
            if audio and curated:
                db.add(models.ProductionResourceCredit(
                    resourceId=row.resourceId, audioWorkId=audio.id, creditRole=role,
                    creditedAs=item["name"], createdAt=now,
                ))
            elif audio:
                source_role = "recording" if role == "recording_studio" else role
                credited_as = item["works"][0]["creditedAs"]
                db.add(models.AudioWorkCredit(
                    audioWorkId=audio.id, role=source_role, sourceRole="訪客補充",
                    creditedAs=credited_as, provenance="visitor_submission",
                    sourceUrl=audio.url, checkedAt=now,
                ))
            else:
                db.add(models.ProductionResourceExternalWork(
                    resourceId=row.resourceId, title=work["title"], url=work["url"],
                    coverUrl=work.get("coverUrl") or "", workType=work.get("workType") or "audio",
                    creditRole=role, creditedAs=item["name"], createdAt=now,
                ))
        row.acceptedFields = sorted(accepted)
    else:
        row.acceptedFields = []
    row.status = payload.status
    row.reviewNote = payload.reviewNote.strip()[:1000]
    row.reviewedAt = now
    row.reviewedBy = ownerId
    db.commit()
    public_bundle.invalidate_public_bundle_cache()
    if payload.status == "approved":
        background_tasks.add_task(_send_public_paths_revalidation,
                                  ["/resources", f"/resources/{row.resourceId}", "/sitemap.xml"])
    return _record(row, _resources(db))


def _new_resource_record(row: models.ProductionResourceSubmission) -> schemas.ProductionResourceSubmissionRecord:
    return schemas.ProductionResourceSubmissionRecord(
        id=row.id, submitterName=row.submitterName, contactEmail=row.contactEmail,
        profile=row.profile or {}, status=row.status, reviewNote=row.reviewNote or "",
        publishedId=row.publishedId, reviewedAt=row.reviewedAt, createdAt=row.createdAt,
    )


@router.post("/production-resource-submissions", response_model=schemas.ProductionResourceProfileSubmissionResponse)
@limiter.limit("5/hour")
def submit_new_resource(request: Request, payload: schemas.ProductionResourceSubmissionCreate, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    now = int(time.time() * 1000)
    if payload.websiteTrap:
        return schemas.ProductionResourceProfileSubmissionResponse(success=True, submissionId="", createdAt=now)
    name = payload.name.strip()[:120]
    submitter = payload.submitterName.strip()[:120]
    email = payload.contactEmail.strip()[:320]
    if not name or not submitter or not email or "@" not in email or " " in email:
        raise HTTPException(status_code=400, detail="請填寫資源名稱、投稿人與有效的聯絡 Email")
    pending = db.query(models.ProductionResourceSubmission).filter_by(status="pending").all()
    if any((row.profile or {}).get("name", "").casefold() == name.casefold() and
           (row.profile or {}).get("category") == payload.category for row in pending):
        raise HTTPException(status_code=409, detail="這筆資源已經在審核中")
    if payload.category == "voice_actor":
        if db.query(models.Persona).filter(models.Persona.displayName == name).first():
            raise HTTPException(status_code=409, detail="這位聲演已有頁面，請使用頁面上的補充功能")
    elif any(item["name"].casefold() == name.casefold() and payload.category in item.get("categories", [])
             for item in _resources(db).values()):
        raise HTTPException(status_code=409, detail="這筆資源已有頁面，請使用頁面上的補充功能")
    if len(payload.links) > 12 or len(payload.works) > 20:
        raise HTTPException(status_code=400, detail="連結最多 12 筆，參與作品最多 20 筆")
    links = []
    for link in payload.links:
        url = _public_url(link.get("url"))
        if url:
            links.append({"label": str(link.get("label") or "社群連結").strip()[:120], "url": url})
    profile_url = _public_url(payload.profileUrl)
    if payload.category != "voice_actor" and not (profile_url or links):
        raise HTTPException(status_code=400, detail="請提供官方、委託或社群連結，方便核對資源")
    works = []
    for work in payload.works:
        url = _public_url(work.get("url"))
        if not url and any(str(work.get(field) or "").strip() for field in ("title", "role", "coverUrl")):
            raise HTTPException(status_code=400, detail="每部已填寫的參與作品都需提供網址")
        if url:
            work_type = str(work.get("workType") or "audio").strip()
            if work_type not in WORK_TYPES:
                raise HTTPException(status_code=400, detail="參與作品的類型無效")
            title = str(work.get("title") or "").strip()[:200]
            if not title:
                raise HTTPException(status_code=400, detail="請填寫參與作品名稱")
            works.append({"url": url, "title": title,
                          "coverUrl": _public_url(work.get("coverUrl"), image=True),
                          "workType": work_type, "role": str(work.get("role") or "").strip()[:120]})
    if payload.category != "voice_actor" and not works:
        raise HTTPException(status_code=400, detail="請至少提供一部參與作品，才能建立製作資源頁")
    profile = {"name": name, "category": payload.category, "bio": payload.bio.strip()[:4000],
               "avatarUrl": _public_url(payload.avatarUrl, image=True), "profileUrl": profile_url,
               "links": links, "works": works}
    row = models.ProductionResourceSubmission(id=str(uuid.uuid4()), submitterName=submitter,
                                               contactEmail=email, profile=profile, status="pending", createdAt=now)
    db.add(row)
    db.commit()
    background_tasks.add_task(notify_approval_request, "new_resource", {
        "id": row.id, "name": profile.get("name"), "category": profile.get("category"),
        "submitterName": row.submitterName, "contactEmail": row.contactEmail,
    })
    return schemas.ProductionResourceProfileSubmissionResponse(success=True, submissionId=row.id, createdAt=now)


@admin_router.get("/production-resource-submissions", response_model=schemas.ProductionResourceSubmissionListResponse)
def list_new_resources(status: str = "pending", limit: int = 100, offset: int = 0,
                       db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    if status not in {"pending", "approved", "rejected", "all"}:
        raise HTTPException(status_code=400, detail="無效的審核狀態")
    query = db.query(models.ProductionResourceSubmission)
    if status != "all":
        query = query.filter_by(status=status)
    total = query.count()
    rows = query.order_by(models.ProductionResourceSubmission.createdAt.desc()).offset(max(offset, 0)).limit(min(max(limit, 1), 200)).all()
    return schemas.ProductionResourceSubmissionListResponse(total=total, items=[_new_resource_record(row) for row in rows])


@admin_router.patch("/production-resource-submissions/{submission_id}/status", response_model=schemas.ProductionResourceSubmissionRecord)
def review_new_resource(submission_id: str, payload: schemas.ProductionResourceSubmissionStatusUpdate,
                        background_tasks: BackgroundTasks,
                        db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    row = db.query(models.ProductionResourceSubmission).filter_by(id=submission_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="找不到資源投稿")
    if row.status != "pending":
        raise HTTPException(status_code=409, detail="這筆投稿已完成審核")
    profile = row.profile or {}
    name = profile.get("name", "")
    category = profile.get("category", "")
    now = int(time.time() * 1000)
    if payload.status == "approved":
        if category == "voice_actor":
            if db.query(models.Persona).filter(models.Persona.displayName == name).first():
                raise HTTPException(status_code=409, detail="這位聲演已有頁面")
            persona_id = str(uuid.uuid4())
            db.add(models.Persona(id=persona_id, ownerId=None, displayName=name,
                                  avatar=profile.get("avatarUrl") or "", bio=profile.get("bio") or "",
                                  website=profile.get("profileUrl") or "", links=profile.get("links") or [],
                                  voiceActorWorks=[{"title": item.get("title") or "", "role": item.get("role") or "",
                                                    "url": item["url"], "coverUrl": item.get("coverUrl") or ""} for item in profile.get("works", [])],
                                  voiceActorContributors=[{"name": row.submitterName, "contributedAt": now}],
                                  createdAt=now, updatedAt=now))
            db.add(models.PersonaRole(personaId=persona_id, role="voice_actor", isVisible=True,
                                      sourceTypes=["resource_submission"], createdAt=now, updatedAt=now))
            row.publishedId = persona_id
        else:
            if any(item["name"].casefold() == name.casefold() and category in item.get("categories", [])
                   for item in _resources(db).values()):
                raise HTTPException(status_code=409, detail="這筆資源已有頁面")
            prepared_works = []
            for work in profile.get("works", []):
                audio = (db.query(models.PublicAudioWorkSubmission).filter_by(url=work["url"], status="approved").first()
                         if work.get("workType", "audio") == "audio" else None)
                prepared_works.append((work, audio))
            if not prepared_works:
                raise HTTPException(status_code=400, detail="需至少有一部參與作品")
            resource_id = str(uuid.uuid4())
            source_url = profile.get("profileUrl") or (profile.get("links") or [{}])[0].get("url", "")
            db.add(models.ProductionResource(id=resource_id, name=name, categories=[category],
                                             summary=profile.get("bio") or "", websiteUrl=source_url,
                                             sourceUrl=source_url, status="published",
                                             reviewedAt=now, createdAt=now, updatedAt=now))
            db.add(models.ProductionResourceProfileOverride(id=resource_id,
                      profile={"bio": profile.get("bio") or "", "avatarUrl": profile.get("avatarUrl") or "",
                               "profileUrl": profile.get("profileUrl") or "", "profileLabel": "官方／委託頁" if profile.get("profileUrl") else (profile.get("links") or [{}])[0].get("label", "聯絡方式"),
                               "links": profile.get("links") or []},
                      contributors=[{"name": row.submitterName, "contributedAt": now}], updatedAt=now))
            seen_urls = set()
            for work, audio in prepared_works:
                if work["url"] in seen_urls:
                    continue
                seen_urls.add(work["url"])
                if audio:
                    db.add(models.ProductionResourceCredit(resourceId=resource_id, audioWorkId=audio.id,
                             creditRole=category, creditedAs=name, createdAt=now))
                else:
                    db.add(models.ProductionResourceExternalWork(resourceId=resource_id, title=work["title"],
                             url=work["url"], coverUrl=work.get("coverUrl") or "",
                             workType=work.get("workType") or "audio", creditRole=category,
                             creditedAs=name, createdAt=now))
            row.publishedId = resource_id
    row.status = payload.status
    row.reviewNote = payload.reviewNote.strip()[:1000]
    row.reviewedAt = now
    row.reviewedBy = ownerId
    db.commit()
    public_bundle.invalidate_public_bundle_cache()
    if payload.status == "approved" and row.publishedId:
        paths = (["/resources", "/voice-actors", f"/author/{row.publishedId}", "/sitemap.xml"]
                 if category == "voice_actor" else
                 ["/resources", f"/resources/{row.publishedId}", "/sitemap.xml"])
        background_tasks.add_task(_send_public_paths_revalidation, paths)
    return _new_resource_record(row)
