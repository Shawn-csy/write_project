"""Proposed new directory entries (voice actors and production people), reviewed before publication.

Edits to an existing identity go through the unified profile submissions in routers/public.py."""

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
from services.identity_convergence import _Converger, name_key

router = APIRouter(prefix="/api", tags=["public"])
admin_router = APIRouter(prefix="/api/admin", tags=["admin"])
RESOURCE_ROLES = set(models.PRODUCTION_ROLES)
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


def _existing_identity_with_role(db: Session, name: str, role: str) -> bool:
    key = name_key(name)
    candidates = [persona.id for persona in db.query(models.Persona).all() if name_key(persona.displayName) == key]
    if not candidates:
        return False
    if role == "voice_actor":
        return True
    return db.query(models.PersonaRole.id).filter(
        models.PersonaRole.personaId.in_(candidates), models.PersonaRole.role == role,
    ).first() is not None


def _publish_new_identity(db: Session, row: models.ProductionResourceSubmission, profile: dict, now: int) -> str:
    """Create the identity (or add the role to the one person already using this name)."""
    name = str(profile.get("name") or "").strip()
    category = str(profile.get("category") or "")
    links = [item for item in profile.get("links") or [] if isinstance(item, dict)]
    works = [item for item in profile.get("works") or [] if isinstance(item, dict) and item.get("url")]
    if category != "voice_actor" and not works:
        raise HTTPException(status_code=400, detail="需至少有一部參與作品")
    converger = _Converger(db)
    persona = converger.persona_for(name, avatar=profile.get("avatarUrl") or "", bio=profile.get("bio") or "",
                                    website=profile.get("profileUrl") or "", links=links)
    converger.add_contributors(persona, [{"name": row.submitterName, "contributedAt": now}])
    converger.ensure_role(persona.id, category, "resource_submission")
    if category == "voice_actor":
        existing = [item for item in (persona.voiceActorWorks or []) if isinstance(item, dict)]
        persona.voiceActorWorks = [*existing, *({"title": item.get("title") or "", "role": item.get("role") or "",
                                                 "url": item["url"], "coverUrl": item.get("coverUrl") or ""} for item in works)][:50]
        return persona.id
    converger.ensure_credit_name(persona.id, category, name)
    for work in works:
        audio = (db.query(models.PublicAudioWorkSubmission).filter_by(url=work["url"], status="approved").first()
                 if work.get("workType", "audio") == "audio" else None)
        converger.add_credit(persona.id, category, url=audio.url if audio else work["url"],
                             title=audio.title if audio else work.get("title") or "",
                             cover_url=(audio.coverUrl if audio else work.get("coverUrl")) or "",
                             work_type="audio" if audio else work.get("workType") or "other",
                             credited_as=name, audio_work_id=audio.id if audio else None, source="resource_submission")
    return persona.id


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
    if _existing_identity_with_role(db, name, payload.category):
        raise HTTPException(status_code=409, detail="這位創作者已有頁面，請使用頁面上的「更新資料」補充")
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
        if _existing_identity_with_role(db, name, category):
            raise HTTPException(status_code=409, detail="這位創作者已有頁面")
        persona_id = _publish_new_identity(db, row, profile, now)
        row.publishedId = persona_id
    row.status = payload.status
    row.reviewNote = payload.reviewNote.strip()[:1000]
    row.reviewedAt = now
    row.reviewedBy = ownerId
    db.commit()
    public_bundle.invalidate_public_bundle_cache()
    if payload.status == "approved" and row.publishedId:
        paths = ["/resources", f"/author/{row.publishedId}", "/sitemap.xml",
                 *(["/voice-actors"] if category == "voice_actor" else [])]
        background_tasks.add_task(_send_public_paths_revalidation, paths)
    return _new_resource_record(row)
