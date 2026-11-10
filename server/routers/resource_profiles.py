"""Visitor contributions to production resource profiles, reviewed before publication."""

import time
import uuid
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

import models
import schemas
from dependencies import get_db, get_current_user_id, is_admin_user
from rate_limit import limiter
from routers import public_bundle

router = APIRouter(prefix="/api", tags=["public"])
admin_router = APIRouter(prefix="/api/admin", tags=["admin"])
PROFILE_FIELDS = {"displayName", "bio", "avatarUrl", "profileUrl", "links"}
RESOURCE_ROLES = {"post_production", "cover_art", "recording_studio"}


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
def submit_resource_profile(request: Request, payload: schemas.ProductionResourceProfileSubmissionCreate, db: Session = Depends(get_db)):
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
    links = []
    for link in payload.links[:30]:
        label = str(link.get("label") or "").strip()[:120]
        url = _public_url(link.get("url"))
        if url:
            links.append({"label": label or "社群連結", "url": url})
    works = []
    for work in payload.works[:30]:
        role = str(work.get("creditRole") or "").strip()
        if role not in RESOURCE_ROLES or role not in item.get("categories", []):
            raise HTTPException(status_code=400, detail="參與作品的製作類別無效")
        url = _public_url(work.get("url"))
        if not url:
            raise HTTPException(status_code=400, detail="參與作品需提供網址")
        works.append({"title": str(work.get("title") or "").strip()[:200], "url": url, "creditRole": role})
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
                match = db.query(models.PublicAudioWorkSubmission).filter_by(url=work["url"], status="approved").first()
                if not match:
                    raise HTTPException(status_code=400, detail=f"作品尚未收錄於音聲目錄：{work['url']}")
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
            if any(existing["id"] == audio.id and existing["creditRole"] == role for existing in item["works"]):
                continue
            if curated:
                db.add(models.ProductionResourceCredit(
                    resourceId=row.resourceId, audioWorkId=audio.id, creditRole=role,
                    creditedAs=item["name"], createdAt=now,
                ))
            else:
                source_role = "recording" if role == "recording_studio" else role
                credited_as = item["works"][0]["creditedAs"]
                db.add(models.AudioWorkCredit(
                    audioWorkId=audio.id, role=source_role, sourceRole="訪客補充",
                    creditedAs=credited_as, provenance="visitor_submission",
                    sourceUrl=audio.url, checkedAt=now,
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
    return _record(row, _resources(db))
