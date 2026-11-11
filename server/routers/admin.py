from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, Request
from typing import Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
from sqlalchemy import orm
import time
import uuid
import json
import os
import re
import math
import httpx
import unicodedata
from urllib.parse import urlparse
import crud_ops as crud
import models
import schemas
from dependencies import get_db, get_current_user_id, is_admin_user, _admin_user_emails
from rate_limit import limiter
from utils import normalize_homepage_banner_value, safe_json_list

router = APIRouter(prefix="/api/admin", tags=["admin"])
HOMEPAGE_BANNER_SETTING_KEY = "homepage_banner"
DEMO_BANNER_SETTING_KEY = "demo_page_banner"
_REVALIDATE_URL = os.getenv("NEXTJS_REVALIDATE_URL", "")
_REVALIDATE_SECRET = os.getenv("REVALIDATE_SECRET", "")


def _send_homepage_revalidation() -> None:
    """Expire the public homepage cache after an admin Banner update."""
    if not _REVALIDATE_URL or not _REVALIDATE_SECRET:
        return
    try:
        httpx.post(
            _REVALIDATE_URL,
            json={"secret": _REVALIDATE_SECRET, "paths": ["/"]},
            timeout=5,
        )
    except Exception:
        # The Banner write has already succeeded; cache invalidation can fail
        # without turning a successful save into an error.
        pass


def _send_demo_banner_revalidation() -> None:
    _send_public_paths_revalidation(["/demos"])


def _send_public_paths_revalidation(paths: list[str]) -> None:
    if not _REVALIDATE_URL or not _REVALIDATE_SECRET or not paths:
        return
    try:
        httpx.post(_REVALIDATE_URL, json={"secret": _REVALIDATE_SECRET, "paths": sorted(set(paths))}, timeout=5)
    except Exception:
        pass


def _queue_demo_revalidation(background_tasks: BackgroundTasks | None, *paths: str) -> None:
    if background_tasks:
        background_tasks.add_task(_send_public_paths_revalidation, list(paths))


def _voice_actor_claim_record(row: models.VoiceActorClaimRequest) -> schemas.VoiceActorClaimRequestRecord:
    return schemas.VoiceActorClaimRequestRecord(
        id=row.id, personaId=row.personaId,
        personaName=row.persona.displayName if row.persona else "（身份已刪除）",
        requesterId=row.requesterId, requesterName=row.requester.displayName if row.requester else "",
        verifiedEmail=row.verifiedEmail, proofUrl=row.proofUrl or "", note=row.note or "",
        status=row.status, reviewNote=row.reviewNote or "", reviewedAt=row.reviewedAt, createdAt=row.createdAt,
    )


def _delete_scripts_owned_by(db: Session, owner_id: str):
    scripts = db.query(models.Script).filter(models.Script.ownerId == owner_id).all()
    for script in scripts:
        if script.type == "folder":
            folder_path = f"{script.folder}/{script.title}" if script.folder != "/" else f"/{script.title}"
            descendants = db.query(models.Script).filter(
                models.Script.ownerId == owner_id,
                (
                    (models.Script.folder == folder_path)
                    | models.Script.folder.like(f"{folder_path}/%")
                ),
            ).all()
            for child in descendants:
                db.delete(child)
        db.delete(script)


def _delete_organizations_owned_by(db: Session, owner_id: str):
    orgs = db.query(models.Organization).filter(models.Organization.ownerId == owner_id).all()
    for org in orgs:
        org_id = org.id
        db.query(models.OrganizationMembership).filter(models.OrganizationMembership.orgId == org_id).delete(synchronize_session=False)
        db.query(models.Script).filter(models.Script.organizationId == org_id).update(
            {models.Script.organizationId: None},
            synchronize_session=False,
        )
        affected_persona_ids = [
            row.personaId
            for row in db.query(models.PersonaOrganizationMembership.personaId).filter(
                models.PersonaOrganizationMembership.orgId == org_id
            ).all()
        ]
        db.query(models.PersonaOrganizationMembership).filter(
            models.PersonaOrganizationMembership.orgId == org_id
        ).delete(synchronize_session=False)
        if affected_persona_ids:
            personas = db.query(models.Persona).filter(models.Persona.id.in_(affected_persona_ids)).all()
            for persona in personas:
                org_ids = crud._ensure_list(persona.organizationIds)
                if org_id in org_ids:
                    persona.organizationIds = [oid for oid in org_ids if oid != org_id]
        users = db.query(models.User).filter(models.User.organizationId == org_id).all()
        for user in users:
            user.organizationId = crud.get_primary_user_org_id(db, user.id, include_legacy=False)
        db.query(models.Organization).filter(models.Organization.id == org_id).delete(synchronize_session=False)


@router.get("/default-marker-configs", response_model=List[dict])
def get_default_marker_configs(
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.get_system_default_configs(db)


@router.put("/default-marker-configs", response_model=List[dict])
def update_default_marker_configs(
    payload: Any = Body(...),
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    configs = payload if isinstance(payload, list) else []
    row = crud.upsert_system_default_configs(db, configs, ownerId)
    parsed = crud._parse_theme_configs(getattr(row, "configs", "[]"))
    return parsed if isinstance(parsed, list) else []

@router.get("/users", response_model=List[schemas.UserPublic])
@limiter.limit("20/minute")
def search_users(
    request: Request,
    q: str,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if is_admin_user(db, ownerId):
        return crud.search_users(db, q)

    normalized = (q or "").strip()
    if not normalized:
        return []

    # Non-admin can only resolve transfer target by exact email.
    # This enables ownership transfer UX without exposing broad user directory search.
    if "@" not in normalized:
        raise HTTPException(status_code=403, detail="Not authorized")

    user = (
        db.query(models.User)
        .filter(func.lower(models.User.email) == normalized.lower())
        .first()
    )
    if not user:
        return []

    # For non-admin callers, return minimal profile only to reduce PII exposure.
    return [
        schemas.UserPublic(
            id=user.id,
            displayName=user.displayName or user.handle or "User",
            handle=None,
            email=None,
            avatar=None,
            website=None,
            organizationRole=None,
        )
    ]


@router.get("/public-terms-acceptances", response_model=schemas.PublicTermsAcceptanceListResponse)
def list_public_terms_acceptances(
    q: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")

    safe_limit = max(1, min(limit, 200))
    safe_offset = max(offset, 0)
    normalized_q = (q or "").strip()

    query = db.query(models.PublicTermsAcceptance)
    if normalized_q:
        like_q = f"%{normalized_q}%"
        query = query.filter(
            (models.PublicTermsAcceptance.scriptId.ilike(like_q))
            | (models.PublicTermsAcceptance.userId.ilike(like_q))
            | (models.PublicTermsAcceptance.visitorId.ilike(like_q))
            | (models.PublicTermsAcceptance.ipAddress.ilike(like_q))
            | (models.PublicTermsAcceptance.userAgent.ilike(like_q))
        )

    total = query.count()
    rows = (
        query.order_by(models.PublicTermsAcceptance.acceptedAt.desc())
        .offset(safe_offset)
        .limit(safe_limit)
        .all()
    )

    return schemas.PublicTermsAcceptanceListResponse(total=total, items=rows)


@router.get("/public-feedback", response_model=schemas.PublicFeedbackListResponse)
def list_public_feedback(
    q: Optional[str] = None,
    excludeKind: Optional[str] = None,
    status: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")

    safe_limit = max(1, min(limit, 200))
    safe_offset = max(offset, 0)
    normalized_q = (q or "").strip()
    query = db.query(models.PublicFeedback)
    if status:
        if status not in {"new", "reviewed", "closed"}:
            raise HTTPException(status_code=400, detail="Invalid feedback status")
        query = query.filter(models.PublicFeedback.status == status)
    if excludeKind:
        query = query.filter(models.PublicFeedback.kind != excludeKind)
    if normalized_q:
        like_q = f"%{normalized_q}%"
        query = query.filter(
            (models.PublicFeedback.contactName.ilike(like_q))
            | (models.PublicFeedback.contactEmail.ilike(like_q))
            | (models.PublicFeedback.scriptTitle.ilike(like_q))
            | (models.PublicFeedback.scriptSummary.ilike(like_q))
            | (models.PublicFeedback.authorName.ilike(like_q))
            | (models.PublicFeedback.authorBio.ilike(like_q))
            | (models.PublicFeedback.authorSocialUrl.ilike(like_q))
            | (models.PublicFeedback.documentUrl.ilike(like_q))
            | (models.PublicFeedback.seriesName.ilike(like_q))
            | (models.PublicFeedback.notes.ilike(like_q))
            | (models.PublicFeedback.content.ilike(like_q))
            | (models.PublicFeedback.pageUrl.ilike(like_q))
        )

    total = query.count()
    rows = (
        query.order_by(models.PublicFeedback.createdAt.desc())
        .offset(safe_offset)
        .limit(safe_limit)
        .all()
    )
    return schemas.PublicFeedbackListResponse(total=total, items=rows)


@router.delete("/public-feedback/{feedback_id}")
def delete_public_feedback(
    feedback_id: str,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")

    row = db.query(models.PublicFeedback).filter(models.PublicFeedback.id == feedback_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Public feedback not found")

    db.delete(row)
    db.commit()
    return {"success": True}


@router.patch("/public-feedback/{feedback_id}/status", response_model=schemas.PublicFeedbackRecord)
def update_public_feedback_status(
    feedback_id: str,
    payload: schemas.PublicFeedbackStatusUpdate,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")

    row = db.query(models.PublicFeedback).filter(models.PublicFeedback.id == feedback_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Public feedback not found")

    row.status = payload.status
    row.updatedAt = int(time.time() * 1000)
    db.commit()
    db.refresh(row)
    return row


@router.get("/public-demo-submissions", response_model=schemas.PublicDemoSubmissionListResponse)
def list_public_demo_submissions(
    status: Optional[str] = "pending",
    q: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    if status not in {None, "all", "pending", "approved", "rejected"}:
        raise HTTPException(status_code=400, detail="Invalid status")

    query = db.query(models.PublicDemoSubmission)
    if status and status != "all":
        query = query.filter(models.PublicDemoSubmission.status == status)
    normalized_q = (q or "").strip()
    if normalized_q:
        like_q = f"%{normalized_q}%"
        query = query.filter(
            models.PublicDemoSubmission.scriptTitle.ilike(like_q)
            | models.PublicDemoSubmission.demoName.ilike(like_q)
            | models.PublicDemoSubmission.demoUrl.ilike(like_q)
            | models.PublicDemoSubmission.cast.ilike(like_q)
            | models.PublicDemoSubmission.displayName.ilike(like_q)
            | models.PublicDemoSubmission.contactEmail.ilike(like_q)
        )
    total = query.count()
    rows = query.order_by(models.PublicDemoSubmission.createdAt.desc()).offset(max(offset, 0)).limit(max(1, min(limit, 200))).all()
    return schemas.PublicDemoSubmissionListResponse(total=total, items=[_serialize_demo_submission(db, row) for row in rows])


@router.patch("/public-demo-submissions/{submission_id}/status", response_model=schemas.PublicDemoSubmissionRecord)
def update_public_demo_submission_status(
    submission_id: str,
    payload: schemas.PublicDemoSubmissionStatusUpdate,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    row = db.query(models.PublicDemoSubmission).filter(models.PublicDemoSubmission.id == submission_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Demo submission not found")

    if payload.status == "approved":
        _ensure_manual_voice_actor_personas(db, row)
    row.status = payload.status
    row.reviewedAt = int(time.time() * 1000) if payload.status != "pending" else None
    row.reviewedBy = ownerId if payload.status != "pending" else None
    db.commit()
    db.refresh(row)
    from routers import public_bundle
    public_bundle.invalidate_public_bundle_cache()
    return _serialize_demo_submission(db, row)


@router.delete("/public-demo-submissions/{submission_id}")
def delete_public_demo_submission(
    submission_id: str,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    row = db.query(models.PublicDemoSubmission).filter(models.PublicDemoSubmission.id == submission_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Demo submission not found")
    db.delete(row)
    db.commit()
    from routers import public_bundle
    public_bundle.invalidate_public_bundle_cache()
    return {"success": True, "id": submission_id}


def _serialize_audio_work_submission(row: models.PublicAudioWorkSubmission) -> dict:
    return {
        "id": row.id,
        "title": row.title,
        "url": row.url,
        "coverUrl": row.coverUrl or "",
        "description": row.description or "",
        "creatorName": row.creatorName or "",
        "creatorUrl": row.creatorUrl or "",
        "organizationId": row.organizationId,
        "voiceActorIds": row.voiceActorIds or [],
        "accessType": row.accessType or "paid",
        "contactEmail": row.contactEmail or "",
        "status": row.status,
        "reviewedAt": row.reviewedAt,
        "publishedAt": row.publishedAt,
        "createdAt": row.createdAt,
    }


@router.get("/public-audio-work-submissions", response_model=schemas.PublicAudioWorkSubmissionListResponse)
def list_public_audio_work_submissions(
    status: Optional[str] = "pending",
    q: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    if status not in {None, "all", "pending", "approved", "rejected"}:
        raise HTTPException(status_code=400, detail="Invalid status")

    query = db.query(models.PublicAudioWorkSubmission)
    if status and status != "all":
        query = query.filter(models.PublicAudioWorkSubmission.status == status)
    normalized_q = (q or "").strip()
    if normalized_q:
        like_q = f"%{normalized_q}%"
        query = query.filter(
            models.PublicAudioWorkSubmission.title.ilike(like_q)
            | models.PublicAudioWorkSubmission.url.ilike(like_q)
            | models.PublicAudioWorkSubmission.creatorName.ilike(like_q)
            | models.PublicAudioWorkSubmission.contactEmail.ilike(like_q)
        )
    total = query.count()
    rows = query.order_by(models.PublicAudioWorkSubmission.createdAt.desc()).offset(max(offset, 0)).limit(max(1, min(limit, 200))).all()
    return schemas.PublicAudioWorkSubmissionListResponse(total=total, items=[_serialize_audio_work_submission(row) for row in rows])


@router.patch("/public-audio-work-submissions/{submission_id}/status", response_model=schemas.PublicAudioWorkSubmissionRecord)
def update_public_audio_work_submission_status(
    submission_id: str,
    payload: schemas.PublicAudioWorkSubmissionStatusUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    row = db.query(models.PublicAudioWorkSubmission).filter(models.PublicAudioWorkSubmission.id == submission_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Audio work submission not found")

    if "organizationId" in payload.model_fields_set:
        if payload.organizationId and not db.query(models.Organization.id).filter(models.Organization.id == payload.organizationId).first():
            raise HTTPException(status_code=400, detail="找不到所屬組織")
        row.organizationId = payload.organizationId
    if "voiceActorIds" in payload.model_fields_set:
        actor_ids = list(dict.fromkeys(payload.voiceActorIds or []))
        if actor_ids and db.query(models.Persona.id).filter(models.Persona.id.in_(actor_ids)).count() != len(actor_ids):
            raise HTTPException(status_code=400, detail="找不到聲演身份")
        row.voiceActorIds = actor_ids
    if "accessType" in payload.model_fields_set and payload.accessType:
        row.accessType = payload.accessType
    if payload.status == "approved" and not row.organizationId:
        raise HTTPException(status_code=400, detail="請先指定所屬組織")
    row.status = payload.status
    row.reviewedAt = int(time.time() * 1000) if payload.status != "pending" else None
    row.reviewedBy = ownerId if payload.status != "pending" else None
    db.commit()
    db.refresh(row)
    from routers import public_bundle
    public_bundle.invalidate_public_bundle_cache()
    _queue_demo_revalidation(background_tasks, "/audio-works", "/sitemap.xml")
    return _serialize_audio_work_submission(row)


def _admin_demo_links(value: Any) -> list[dict]:
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except (TypeError, ValueError):
            value = []
    if not isinstance(value, list):
        return []
    result = []
    for index, item in enumerate(value):
        if not isinstance(item, dict) or not str(item.get("url") or "").strip():
            continue
        normalized = dict(item)
        normalized["id"] = str(normalized.get("id") or f"demo-{index + 1}")
        result.append(normalized)
    return result


def _admin_demo_link_record(kind: str, parent_id: str, link: dict, script_title: str, script_url: str, status: str, created_at: int = 0) -> dict:
    return {
        "id": str(link.get("id") or ""), "sourceKind": kind, "parentId": parent_id,
        "scriptTitle": script_title, "scriptUrl": script_url,
        "demoName": str(link.get("name") or ""), "demoUrl": str(link.get("url") or ""),
        "coverUrl": str(link.get("coverUrl") or ""), "cast": str(link.get("cast") or ""),
        "voiceTypes": link.get("voiceTypes") if isinstance(link.get("voiceTypes"), list) else [],
        "voiceActorIds": list(dict.fromkeys(str(item) for item in link.get("voiceActorIds", []) if item)) if isinstance(link.get("voiceActorIds"), list) else [],
        "description": str(link.get("description") or ""), "displayName": "", "contactEmail": "",
        "status": status, "createdAt": created_at,
    }


@router.get("/all-demos", response_model=schemas.AdminDemoListResponse)
def list_all_demos(
    q: Optional[str] = None,
    status: Optional[str] = "all",
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    """List all managed demo links, including script metadata and moderated submissions."""
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    if status not in {None, "all", "pending", "approved", "rejected"}:
        raise HTTPException(status_code=400, detail="Invalid status")

    records: list[dict] = []
    for row in db.query(models.PublicDemoSubmission).all():
        records.append({**_serialize_demo_submission(db, row), "sourceKind": "submission", "parentId": row.id})

    for script in db.query(models.Script).filter(models.Script.type == "script").all():
        for index, link in enumerate(_admin_demo_links(script.activityDemoLinks)):
            link_id = str(link.get("id") or f"demo-{index + 1}")
            link["id"] = link_id
            records.append(_admin_demo_link_record(
                "internal", script.id, link, str(script.title or ""), f"/read/{script.id}",
                "approved" if bool(script.isPublic) or str(script.status or "").lower() in {"public", "published"} else "pending",
                int(script.lastModified or script.createdAt or 0),
            ))

    for script in db.query(models.ExternalPublicScript).all():
        for index, link in enumerate(_admin_demo_links(script.demoLinks)):
            link_id = str(link.get("id") or f"demo-{index + 1}")
            link["id"] = link_id
            records.append(_admin_demo_link_record(
                "external", script.id, link,
                str(script.titleOverride or script.remoteTitle or "外部台本"), str(script.sourceUrl or ""),
                "approved" if str(script.status or "").lower() == "published" else "pending",
                int(script.updatedAt or script.createdAt or 0),
            ))

    normalized_q = (q or "").strip().casefold()
    if normalized_q:
        records = [record for record in records if normalized_q in " ".join(str(record.get(field) or "") for field in ("scriptTitle", "demoName", "demoUrl", "cast", "description", "displayName", "contactEmail")).casefold()]
    if status and status != "all":
        records = [record for record in records if record.get("status") == status]
    records.sort(key=lambda record: (int(record.get("createdAt") or 0), str(record.get("scriptTitle") or "").casefold()), reverse=True)
    total = len(records)
    page = records[max(offset, 0):max(offset, 0) + max(1, min(limit, 200))]
    return schemas.AdminDemoListResponse(total=total, items=page)


@router.get("/all-demos/targets", response_model=List[schemas.AdminDemoTarget])
def list_all_demo_targets(db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    targets = []
    for script in db.query(models.Script).filter(models.Script.type == "script").order_by(models.Script.title).all():
        targets.append({"id": script.id, "sourceKind": "internal", "title": str(script.title or "未命名台本"), "authorName": str(script.author or "")})
    for script in db.query(models.ExternalPublicScript).order_by(models.ExternalPublicScript.titleOverride, models.ExternalPublicScript.remoteTitle).all():
        targets.append({"id": script.id, "sourceKind": "external", "title": str(script.titleOverride or script.remoteTitle or "外部台本"), "authorName": str(script.authorName or "")})
    return targets


@router.post("/all-demos", response_model=schemas.AdminDemoRecord)
def create_all_demo(payload: schemas.AdminDemoMutation, background_tasks: BackgroundTasks, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    if payload.sourceKind == "submission":
        raise HTTPException(status_code=400, detail="新增 Demo 請選擇一個台本作為來源")
    parent_id = str(payload.parentId or "").strip()
    parent = db.query(models.Script if payload.sourceKind == "internal" else models.ExternalPublicScript).filter_by(id=parent_id).first()
    if not parent:
        raise HTTPException(status_code=404, detail="台本不存在")
    links = _admin_demo_links(parent.activityDemoLinks if payload.sourceKind == "internal" else parent.demoLinks)
    if len(links) >= 40:
        raise HTTPException(status_code=400, detail="單一本台本最多可管理 40 筆 Demo")
    link = {"id": str(uuid.uuid4()), "name": payload.demoName, "url": payload.demoUrl, "coverUrl": payload.coverUrl, "cast": payload.cast, "description": payload.description, "voiceTypes": payload.voiceTypes, "voiceActorIds": payload.voiceActorIds}
    links.append(link)
    if payload.sourceKind == "internal":
        parent.activityDemoLinks = json.dumps(links, ensure_ascii=False)
        script_url = f"/read/{parent.id}"
        script_title = str(parent.title or "")
    else:
        parent.demoLinks = json.dumps(links, ensure_ascii=False)
        parent.updatedAt = int(time.time() * 1000)
        script_url = str(parent.sourceUrl or "")
        script_title = str(parent.titleOverride or parent.remoteTitle or "")
    db.commit()
    from routers import public_bundle
    public_bundle.invalidate_public_bundle_cache()
    _queue_demo_revalidation(background_tasks, "/demos", "/voice-actors", script_url if payload.sourceKind == "internal" else "/")
    return _admin_demo_link_record(payload.sourceKind, parent.id, link, script_title, script_url, "approved", int(time.time() * 1000))


@router.put("/all-demos/{source_kind}/{parent_id}/{demo_id}", response_model=schemas.AdminDemoRecord)
def update_all_demo(source_kind: str, parent_id: str, demo_id: str, payload: schemas.AdminDemoMutation, background_tasks: BackgroundTasks, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    if source_kind != payload.sourceKind:
        raise HTTPException(status_code=400, detail="Demo 來源不一致")
    if source_kind == "submission":
        row = db.query(models.PublicDemoSubmission).filter(models.PublicDemoSubmission.id == demo_id).first()
        if not row:
            raise HTTPException(status_code=404, detail="Demo 不存在")
        row.scriptTitle, row.scriptUrl = payload.scriptTitle, payload.scriptUrl
        row.demoName, row.demoUrl, row.coverUrl = payload.demoName, payload.demoUrl, payload.coverUrl
        row.cast, row.voiceTypes, row.description = payload.cast, payload.voiceTypes, payload.description
        selected_actor_ids = list(dict.fromkeys(payload.voiceActorIds))
        row.voiceActorPersonaId = selected_actor_ids[0] if selected_actor_ids else None
        row.voiceActorIds = selected_actor_ids[1:] if selected_actor_ids else []
        row.displayName, row.contactEmail, row.status = payload.displayName, payload.contactEmail, payload.status
        if payload.status == "approved":
            _ensure_manual_voice_actor_personas(db, row)
        row.reviewedAt = int(time.time() * 1000) if payload.status != "pending" else None
        row.reviewedBy = ownerId if payload.status != "pending" else None
        db.commit()
        db.refresh(row)
        result = {**_serialize_demo_submission(db, row), "sourceKind": "submission", "parentId": row.id}
    elif source_kind in {"internal", "external"}:
        model = models.Script if source_kind == "internal" else models.ExternalPublicScript
        parent = db.query(model).filter_by(id=parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="台本不存在")
        links = _admin_demo_links(parent.activityDemoLinks if source_kind == "internal" else parent.demoLinks)
        link = next((item for item in links if str(item.get("id") or "") == demo_id), None)
        if not link:
            raise HTTPException(status_code=404, detail="Demo 不存在")
        link.update({"name": payload.demoName, "url": payload.demoUrl, "coverUrl": payload.coverUrl, "cast": payload.cast, "description": payload.description, "voiceTypes": payload.voiceTypes, "voiceActorIds": payload.voiceActorIds})
        updated_at = int(time.time() * 1000)
        if source_kind == "internal":
            parent.activityDemoLinks = json.dumps(links, ensure_ascii=False)
            parent.lastModified = updated_at
            script_url, script_title = f"/read/{parent.id}", str(parent.title or "")
            next_status = "approved" if bool(parent.isPublic) or str(parent.status or "").lower() in {"public", "published"} else "pending"
        else:
            parent.demoLinks = json.dumps(links, ensure_ascii=False)
            parent.updatedAt = updated_at
            script_url, script_title = str(parent.sourceUrl or ""), str(parent.titleOverride or parent.remoteTitle or "")
            next_status = "approved" if str(parent.status or "").lower() == "published" else "pending"
        db.commit()
        result = _admin_demo_link_record(source_kind, parent.id, link, script_title, script_url, next_status, updated_at)
    else:
        raise HTTPException(status_code=400, detail="無效的 Demo 來源")
    from routers import public_bundle
    public_bundle.invalidate_public_bundle_cache()
    revalidate_paths = ["/demos", "/voice-actors"]
    if source_kind == "internal": revalidate_paths.append(f"/read/{parent_id}")
    if source_kind == "external":
        from routers import external_public_scripts
        revalidate_paths.extend(external_public_scripts._external_public_paths(parent))
    _queue_demo_revalidation(background_tasks, *revalidate_paths)
    return result


@router.delete("/all-demos/{source_kind}/{parent_id}/{demo_id}")
def delete_all_demo(source_kind: str, parent_id: str, demo_id: str, background_tasks: BackgroundTasks, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    if source_kind == "submission":
        row = db.query(models.PublicDemoSubmission).filter(models.PublicDemoSubmission.id == demo_id).first()
        if not row:
            raise HTTPException(status_code=404, detail="Demo 不存在")
        db.delete(row)
    elif source_kind in {"internal", "external"}:
        model = models.Script if source_kind == "internal" else models.ExternalPublicScript
        parent = db.query(model).filter_by(id=parent_id).first()
        if not parent:
            raise HTTPException(status_code=404, detail="台本不存在")
        links = _admin_demo_links(parent.activityDemoLinks if source_kind == "internal" else parent.demoLinks)
        next_links = [item for item in links if str(item.get("id") or "") != demo_id]
        if len(next_links) == len(links):
            raise HTTPException(status_code=404, detail="Demo 不存在")
        if source_kind == "internal":
            parent.activityDemoLinks = json.dumps(next_links, ensure_ascii=False)
        else:
            parent.demoLinks = json.dumps(next_links, ensure_ascii=False)
            parent.updatedAt = int(time.time() * 1000)
    else:
        raise HTTPException(status_code=400, detail="無效的 Demo 來源")
    db.commit()
    from routers import public_bundle
    public_bundle.invalidate_public_bundle_cache()
    revalidate_paths = ["/demos", "/voice-actors"]
    if source_kind == "internal": revalidate_paths.append(f"/read/{parent_id}")
    if source_kind == "external":
        from routers import external_public_scripts
        revalidate_paths.extend(external_public_scripts._external_public_paths(parent))
    _queue_demo_revalidation(background_tasks, *revalidate_paths)
    return {"success": True, "id": demo_id}


def _ensure_manual_voice_actor_personas(db: Session, row: models.PublicDemoSubmission) -> None:
    """Create unclaimed public voice-actor identities when a Demo is approved."""
    raw_actors = row.manualVoiceActors if isinstance(row.manualVoiceActors, list) else []
    normalized_actors = []
    created_for_submission: dict[tuple[str, str], str] = {}

    for raw_actor in raw_actors:
        if not isinstance(raw_actor, dict):
            continue
        actor = dict(raw_actor)
        name = str(actor.get("name") or "").strip()[:120]
        social_url = str(actor.get("socialUrl") or "").strip()[:2000]
        if not name:
            continue

        persona_id = str(actor.get("personaId") or "").strip()
        persona = db.query(models.Persona).filter(models.Persona.id == persona_id).first() if persona_id else None
        if not persona:
            dedupe_key = (name.casefold(), social_url.casefold())
            persona_id = created_for_submission.get(dedupe_key, "")
            persona = db.query(models.Persona).filter(models.Persona.id == persona_id).first() if persona_id else None

        if not persona and social_url:
            # Reuse an existing public voice identity when the same social URL is provided.
            candidates = db.query(models.Persona).filter(models.Persona.displayName == name).all()
            for candidate in candidates:
                tags = safe_json_list(candidate.tags)
                if not any("聲演" in str(tag) or "配音" in str(tag) or "voice actor" in str(tag).casefold() for tag in tags):
                    continue
                links = safe_json_list(candidate.links)
                urls = {str(link.get("url") or "").strip().casefold() for link in links if isinstance(link, dict)}
                if social_url.casefold() in urls or str(candidate.website or "").strip().casefold() == social_url.casefold():
                    persona = candidate
                    break

        if not persona:
            links = [{"label": "社群", "url": social_url}] if social_url else []
            persona = models.Persona(
                id=str(uuid.uuid4()),
                ownerId=None,
                displayName=name,
                avatar="",
                bannerUrl="",
                bio="",
                website="",
                links=links,
                organizationIds=[],
                tags=["聲演", "Demo 投稿建立"],
                defaultLicenseCommercial="",
                defaultLicenseDerivative="",
                defaultLicenseNotify="",
                defaultLicenseSpecialTerms=[],
                createdAt=int(time.time() * 1000),
                updatedAt=int(time.time() * 1000),
            )
            db.add(persona)
            db.flush()
            created_for_submission[(name.casefold(), social_url.casefold())] = persona.id

        actor["name"] = persona.displayName or name
        actor["socialUrl"] = social_url
        actor["personaId"] = persona.id
        normalized_actors.append(actor)

    row.manualVoiceActors = normalized_actors


def _serialize_demo_submission(db: Session, row: models.PublicDemoSubmission) -> dict:
    voice_actor_ids = row.voiceActorIds if isinstance(row.voiceActorIds, list) else []
    all_voice_actor_ids = list(dict.fromkeys([*voice_actor_ids, *([row.voiceActorPersonaId] if row.voiceActorPersonaId else [])]))
    personas = db.query(models.Persona).filter(models.Persona.id.in_(all_voice_actor_ids)).all() if all_voice_actor_ids else []
    return {
        "id": row.id,
        "ownerId": row.ownerId,
        "voiceActorPersonaId": row.voiceActorPersonaId,
        "scriptType": row.scriptType,
        "scriptId": row.scriptId,
        "externalScriptId": row.externalScriptId,
        "activityPageId": row.activityPageId,
        "scriptTitle": row.scriptTitle,
        "scriptUrl": row.scriptUrl,
        "demoName": row.demoName,
        "demoUrl": row.demoUrl,
        "coverUrl": row.coverUrl or "",
        "cast": row.cast,
        "voiceTypes": row.voiceTypes if isinstance(row.voiceTypes, list) else [],
        "voiceActorIds": all_voice_actor_ids,
        "manualVoiceActors": row.manualVoiceActors if isinstance(row.manualVoiceActors, list) else [],
        "voiceActorNames": [persona.displayName for persona in personas],
        "description": row.description,
        "displayName": row.displayName,
        "contactEmail": row.contactEmail,
        "status": row.status,
        "reviewedAt": row.reviewedAt,
        "createdAt": row.createdAt,
    }


@router.get("/admin-users", response_model=List[schemas.AdminUserRecord])
def list_admin_users(
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")

    rows = db.query(models.AdminUser).order_by(models.AdminUser.createdAt.desc()).all()
    existing_emails = {str(getattr(r, "email", "") or "").strip().lower() for r in rows}

    for email in _admin_user_emails():
        if not email or email in existing_emails:
            continue
        rows.append(
            models.AdminUser(
                id=f"env-email:{email}",
                email=email,
                userId=None,
                createdBy=None,
                createdAt=0,
            )
        )

    return rows


@router.post("/admin-users", response_model=schemas.AdminUserRecord)
def create_admin_user(
    payload: schemas.AdminUserCreate,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")

    user_id = str(payload.userId or "").strip() or None
    email = str(payload.email or "").strip().lower() or None
    if not user_id and not email:
        raise HTTPException(status_code=400, detail="Either userId or email is required")

    if user_id:
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        if not email:
            email = str(getattr(user, "email", "") or "").strip().lower() or None
    elif email:
        user = db.query(models.User).filter(func.lower(models.User.email) == email).first()
        if user:
            user_id = user.id

    exists_query = db.query(models.AdminUser)
    if user_id and email:
        exists_query = exists_query.filter((models.AdminUser.userId == user_id) | (models.AdminUser.email == email))
    elif user_id:
        exists_query = exists_query.filter(models.AdminUser.userId == user_id)
    else:
        exists_query = exists_query.filter(models.AdminUser.email == email)
    if exists_query.first():
        raise HTTPException(status_code=409, detail="Admin user already exists")

    row = models.AdminUser(
        id=str(uuid.uuid4()),
        userId=user_id,
        email=email,
        createdBy=ownerId,
        createdAt=int(time.time() * 1000),
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/admin-users/{admin_id}")
def delete_admin_user(
    admin_id: str,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    if admin_id.startswith("env-email:"):
        raise HTTPException(status_code=400, detail="Env-based admin cannot be removed from UI; edit ADMIN_USER_EMAILS")

    row = db.query(models.AdminUser).filter(models.AdminUser.id == admin_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Admin user not found")

    db.delete(row)
    db.commit()
    return {"success": True}


@router.get("/homepage-banner", response_model=schemas.HomepageBannerSetting)
def get_homepage_banner(
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")

    row = db.query(models.SiteSetting).filter(models.SiteSetting.key == HOMEPAGE_BANNER_SETTING_KEY).first()
    if not row or not str(getattr(row, "value", "") or "").strip():
        return schemas.HomepageBannerSetting(items=[])
    return schemas.HomepageBannerSetting(**normalize_homepage_banner_value(row.value))


@router.put("/homepage-banner", response_model=schemas.HomepageBannerSetting)
def update_homepage_banner(
    background_tasks: BackgroundTasks,
    payload: schemas.HomepageBannerSetting,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")

    incoming_items = payload.items if isinstance(payload.items, list) else []
    normalized_items = []
    for idx, item in enumerate(incoming_items):
        normalized = {
            "id": str(getattr(item, "id", "") or f"slide-{idx + 1}").strip() or f"slide-{idx + 1}",
            "title": str(getattr(item, "title", "") or "").strip(),
            "content": str(getattr(item, "content", "") or "").strip(),
            "link": str(getattr(item, "link", "") or "").strip(),
            "imageUrl": str(getattr(item, "imageUrl", "") or "").strip(),
        }
        eyebrow = getattr(item, "eyebrow", None)
        if isinstance(eyebrow, str) and eyebrow.strip():
            normalized["eyebrow"] = eyebrow.strip()
        # Hero placement fields — preserve as-is.
        image_alt = getattr(item, "imageAlt", None)
        if isinstance(image_alt, str) and image_alt.strip():
            normalized["imageAlt"] = image_alt.strip()
        for crop_key in ("imageCrop", "imageMobileCrop", "imageDesktopCrop", "imageUltraWideCrop"):
            crop = getattr(item, crop_key, None)
            if isinstance(crop, dict):
                normalized[crop_key] = crop
        bg_mode = getattr(item, "imageBackgroundMode", None)
        if bg_mode in ("cover", "blur-fill"):
            normalized["imageBackgroundMode"] = bg_mode
        if normalized["title"] or normalized["content"] or normalized["link"] or normalized["imageUrl"]:
            normalized_items.append(normalized)

    if not normalized_items and (payload.title or payload.content or payload.link or payload.imageUrl):
        normalized_items.append({
            "id": "slide-1",
            "title": str(payload.title or "").strip(),
            "content": str(payload.content or "").strip(),
            "link": str(payload.link or "").strip(),
            "imageUrl": str(payload.imageUrl or "").strip(),
        })

    first = normalized_items[0] if normalized_items else {"title": "", "content": "", "link": "", "imageUrl": ""}
    clean = {
        "title": str(first.get("title") or ""),
        "content": str(first.get("content") or ""),
        "link": str(first.get("link") or ""),
        "imageUrl": str(first.get("imageUrl") or ""),
        "items": normalized_items,
    }
    now_ms = int(time.time() * 1000)
    row = db.query(models.SiteSetting).filter(models.SiteSetting.key == HOMEPAGE_BANNER_SETTING_KEY).first()
    if not row:
        row = models.SiteSetting(
            key=HOMEPAGE_BANNER_SETTING_KEY,
            value=json.dumps(clean, ensure_ascii=False),
            updatedBy=ownerId,
            updatedAt=now_ms,
        )
        db.add(row)
    else:
        row.value = json.dumps(clean, ensure_ascii=False)
        row.updatedBy = ownerId
        row.updatedAt = now_ms
    db.commit()
    # Invalidate public-route caches so the next public read reflects the update immediately.
    import routers.public as _public_router
    _public_router._banner_cache = None
    import routers.public_bundle as _public_bundle_router
    _public_bundle_router.invalidate_public_bundle_cache()
    background_tasks.add_task(_send_homepage_revalidation)
    return schemas.HomepageBannerSetting(**clean)


@router.get("/demo-banner", response_model=schemas.DemoBannerSetting)
def get_demo_banner(db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    row = db.query(models.SiteSetting).filter(models.SiteSetting.key == DEMO_BANNER_SETTING_KEY).first()
    value = normalize_homepage_banner_value(row.value) if row and str(getattr(row, "value", "") or "").strip() else {"items": []}
    return schemas.DemoBannerSetting(**value)


@router.put("/demo-banner", response_model=schemas.DemoBannerSetting)
def update_demo_banner(
    background_tasks: BackgroundTasks,
    payload: schemas.DemoBannerSetting,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    items = []
    for index, item in enumerate(payload.items or []):
        normalized = {
            "id": str(item.id or f"demo-slide-{index + 1}").strip() or f"demo-slide-{index + 1}",
            "title": str(item.title or "").strip(),
            "content": str(item.content or "").strip(),
            "link": str(item.link or "").strip(),
            "imageUrl": str(item.imageUrl or "").strip(),
        }
        if item.eyebrow and item.eyebrow.strip():
            normalized["eyebrow"] = item.eyebrow.strip()
        if item.imageAlt and item.imageAlt.strip():
            normalized["imageAlt"] = item.imageAlt.strip()
        for crop_key in ("imageCrop", "imageMobileCrop", "imageDesktopCrop", "imageUltraWideCrop"):
            crop = getattr(item, crop_key, None)
            if isinstance(crop, dict):
                normalized[crop_key] = crop
        if item.imageBackgroundMode in ("cover", "blur-fill"):
            normalized["imageBackgroundMode"] = item.imageBackgroundMode
        if normalized["title"] or normalized["content"] or normalized["link"] or normalized["imageUrl"]:
            items.append(normalized)

    clean = {"items": items}
    now_ms = int(time.time() * 1000)
    row = db.query(models.SiteSetting).filter(models.SiteSetting.key == DEMO_BANNER_SETTING_KEY).first()
    if row is None:
        row = models.SiteSetting(key=DEMO_BANNER_SETTING_KEY, value=json.dumps(clean, ensure_ascii=False), updatedBy=ownerId, updatedAt=now_ms)
        db.add(row)
    else:
        row.value = json.dumps(clean, ensure_ascii=False)
        row.updatedBy = ownerId
        row.updatedAt = now_ms
    db.commit()
    import routers.public_bundle as _public_bundle_router
    _public_bundle_router.invalidate_public_bundle_cache()
    background_tasks.add_task(_send_demo_banner_revalidation)
    return schemas.DemoBannerSetting(**clean)


def _activity_page_payload_values(payload: schemas.ActivityPagePayload) -> dict:
    slug = re.sub(r"[^a-z0-9]+", "-", payload.slug.strip().lower()).strip("-")[:100]
    title = payload.title.strip()[:160]
    if not slug:
        raise HTTPException(status_code=400, detail="請使用英數字與連字號設定活動網址代稱")
    if not title:
        raise HTTPException(status_code=400, detail="活動標題不可空白")
    cover_url = payload.coverUrl.strip()[:2000]
    if cover_url and not (cover_url.startswith("https://") or cover_url.startswith("http://") or cover_url.startswith("/media/")):
        raise HTTPException(status_code=400, detail="封面請使用 http(s) 網址或站內媒體路徑")
    cover_crop = None
    if cover_url and payload.coverCrop:
        def clamp_crop(key: str, default: float, minimum: float, maximum: float) -> float:
            value = float(payload.coverCrop.get(key, default))
            if not math.isfinite(value):
                return default
            return min(maximum, max(minimum, value))
        cover_crop = {
            "cx": clamp_crop("cx", 0, -1, 1),
            "cy": clamp_crop("cy", 0, -1, 1),
            "zoom": clamp_crop("zoom", 1, 0.35, 3),
        }
    return {
        "slug": slug,
        "title": title,
        "summary": payload.summary.strip()[:1000],
        "coverUrl": cover_url,
        "coverCrop": cover_crop,
        "body": payload.body[:50_000],
        "scriptIds": list(dict.fromkeys(str(value) for value in payload.scriptIds if str(value).strip()))[:100],
        "externalScriptIds": list(dict.fromkeys(str(value) for value in payload.externalScriptIds if str(value).strip()))[:100],
        "acceptingSubmissions": bool(payload.acceptingSubmissions),
        "status": payload.status,
        "sortOrder": payload.sortOrder,
    }


def _invalidate_activity_pages():
    from routers import public_bundle
    public_bundle.invalidate_public_bundle_cache()


@router.get("/activity-pages", response_model=List[schemas.ActivityPageRecord])
def list_activity_pages_admin(
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    return db.query(models.ActivityPage).order_by(models.ActivityPage.sortOrder, models.ActivityPage.updatedAt.desc()).all()


@router.post("/activity-pages", response_model=schemas.ActivityPageRecord)
def create_activity_page_admin(
    payload: schemas.ActivityPagePayload,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    values = _activity_page_payload_values(payload)
    if db.query(models.ActivityPage.id).filter(models.ActivityPage.slug == values["slug"]).first():
        raise HTTPException(status_code=409, detail="這個活動網址代稱已被使用")
    now_ms = int(time.time() * 1000)
    row = models.ActivityPage(id=str(uuid.uuid4()), **values, createdAt=now_ms, updatedAt=now_ms, publishedAt=now_ms if values["status"] == "published" else None)
    db.add(row)
    db.commit()
    db.refresh(row)
    _invalidate_activity_pages()
    return row


@router.put("/activity-pages/{page_id}", response_model=schemas.ActivityPageRecord)
def update_activity_page_admin(
    page_id: str,
    payload: schemas.ActivityPagePayload,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    row = db.query(models.ActivityPage).filter(models.ActivityPage.id == page_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="找不到活動頁")
    values = _activity_page_payload_values(payload)
    conflict = db.query(models.ActivityPage.id).filter(models.ActivityPage.slug == values["slug"], models.ActivityPage.id != page_id).first()
    if conflict:
        raise HTTPException(status_code=409, detail="這個活動網址代稱已被使用")
    for key, value in values.items():
        setattr(row, key, value)
    row.updatedAt = int(time.time() * 1000)
    row.publishedAt = row.publishedAt or row.updatedAt if row.status == "published" else None
    db.commit()
    db.refresh(row)
    _invalidate_activity_pages()
    return row


@router.delete("/activity-pages/{page_id}")
def delete_activity_page_admin(
    page_id: str,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    row = db.query(models.ActivityPage).filter(models.ActivityPage.id == page_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="找不到活動頁")
    db.delete(row)
    db.commit()
    _invalidate_activity_pages()
    return {"success": True, "id": page_id}


@router.get("/activity-pages/{page_id}/submissions", response_model=schemas.ActivitySubmissionListResponse)
def list_activity_submissions_admin(
    page_id: str,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    page = db.query(models.ActivityPage).filter(models.ActivityPage.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="找不到活動頁")
    items = []
    for row in db.query(models.PublicDemoSubmission).filter(models.PublicDemoSubmission.activityPageId == page_id).order_by(models.PublicDemoSubmission.createdAt.desc()).all():
        items.append({"id": row.id, "activityPageId": page_id, "kind": "demo", "title": row.demoName or row.scriptTitle, "summary": row.description or "", "link": row.demoUrl, "coverUrl": row.coverUrl or "", "scriptType": row.scriptType, "scriptId": row.scriptId, "externalScriptId": row.externalScriptId, "voiceTypes": row.voiceTypes or [], "createdAt": row.createdAt})
    for row in db.query(models.PublicFeedback).filter(models.PublicFeedback.activityPageId == page_id, models.PublicFeedback.kind == "listing", models.PublicFeedback.activityScriptId.isnot(None)).order_by(models.PublicFeedback.createdAt.desc()).all():
        script = db.query(models.ExternalPublicScript).filter(models.ExternalPublicScript.id == row.activityScriptId).first()
        if not script:
            continue
        items.append({"id": row.id, "activityPageId": page_id, "kind": "script", "title": script.titleOverride or script.remoteTitle or row.scriptTitle, "summary": script.summaryOverride or script.remoteSummary or row.scriptSummary, "link": script.sourceUrl, "coverUrl": script.coverUrlOverride or script.remoteCoverUrl or row.coverUrl, "scriptType": "external", "externalScriptId": script.id, "createdAt": row.createdAt})
    items.sort(key=lambda item: item["createdAt"], reverse=True)
    return schemas.ActivitySubmissionListResponse(items=items)


@router.put("/activity-pages/{page_id}/submissions/{kind}/{submission_id}", response_model=schemas.ActivitySubmissionRecord)
def update_activity_submission_admin(
    page_id: str,
    kind: str,
    submission_id: str,
    payload: schemas.ActivitySubmissionUpdate,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    page = db.query(models.ActivityPage).filter(models.ActivityPage.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="找不到活動頁")
    now_ms = int(time.time() * 1000)
    if kind == "demo":
        row = db.query(models.PublicDemoSubmission).filter(models.PublicDemoSubmission.id == submission_id, models.PublicDemoSubmission.activityPageId == page_id).first()
        if not row:
            raise HTTPException(status_code=404, detail="找不到活動 Demo")
        if not payload.title.strip() or not payload.link.strip().lower().startswith("https://"):
            raise HTTPException(status_code=400, detail="Demo 名稱不可空白，連結需使用 HTTPS")
        if payload.coverUrl.strip() and not payload.coverUrl.strip().lower().startswith("https://"):
            raise HTTPException(status_code=400, detail="封面連結需使用 HTTPS")
        row.demoName = payload.title.strip()[:160]
        row.description = payload.summary[:2000]
        row.demoUrl = payload.link.strip()[:2000]
        row.coverUrl = payload.coverUrl.strip()[:2000]
        row.voiceTypes = payload.voiceTypes
        db.commit()
        from routers import public_bundle
        public_bundle.invalidate_public_bundle_cache()
        return {"id": row.id, "activityPageId": page_id, "kind": "demo", "title": row.demoName or row.scriptTitle, "summary": row.description or "", "link": row.demoUrl, "coverUrl": row.coverUrl or "", "scriptType": row.scriptType, "scriptId": row.scriptId, "externalScriptId": row.externalScriptId, "voiceTypes": row.voiceTypes or [], "createdAt": row.createdAt}
    if kind == "script":
        feedback = db.query(models.PublicFeedback).filter(models.PublicFeedback.id == submission_id, models.PublicFeedback.activityPageId == page_id, models.PublicFeedback.kind == "listing").first()
        if not feedback or not feedback.activityScriptId:
            raise HTTPException(status_code=404, detail="找不到活動台本投稿")
        script = db.query(models.ExternalPublicScript).filter(models.ExternalPublicScript.id == feedback.activityScriptId).first()
        if not script:
            raise HTTPException(status_code=404, detail="找不到活動外部台本")
        next_link = payload.link.strip()[:2000]
        if not next_link.lower().startswith("https://"):
            raise HTTPException(status_code=400, detail="台本連結需使用 HTTPS")
        duplicate = db.query(models.ExternalPublicScript.id).filter(models.ExternalPublicScript.sourceUrl == next_link, models.ExternalPublicScript.id != script.id).first()
        if duplicate:
            raise HTTPException(status_code=409, detail="這個台本連結已經存在")
        if not payload.title.strip():
            raise HTTPException(status_code=400, detail="台本名稱不可空白")
        if payload.coverUrl.strip() and not payload.coverUrl.strip().lower().startswith("https://"):
            raise HTTPException(status_code=400, detail="封面連結需使用 HTTPS")
        script.titleOverride = payload.title.strip()[:300]
        script.summaryOverride = payload.summary[:4000]
        script.sourceUrl = next_link
        from urllib.parse import urlparse
        script.sourceDomain = (urlparse(next_link).hostname or "").lower()[:255]
        script.canonicalUrl = next_link
        script.coverUrlOverride = payload.coverUrl.strip()[:2000]
        script.updatedAt = now_ms
        feedback.scriptTitle = script.titleOverride
        feedback.scriptSummary = script.summaryOverride
        feedback.documentUrl = script.sourceUrl
        feedback.coverUrl = script.coverUrlOverride
        feedback.updatedAt = now_ms
        db.commit()
        _invalidate_activity_pages()
        return {"id": feedback.id, "activityPageId": page_id, "kind": "script", "title": script.titleOverride or script.remoteTitle, "summary": script.summaryOverride or script.remoteSummary or "", "link": script.sourceUrl, "coverUrl": script.coverUrlOverride or "", "scriptType": "external", "externalScriptId": script.id, "createdAt": feedback.createdAt}
    raise HTTPException(status_code=400, detail="無效的活動投稿類型")


@router.delete("/activity-pages/{page_id}/submissions/{kind}/{submission_id}")
def delete_activity_submission_admin(
    page_id: str,
    kind: str,
    submission_id: str,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    if kind == "demo":
        row = db.query(models.PublicDemoSubmission).filter(models.PublicDemoSubmission.id == submission_id, models.PublicDemoSubmission.activityPageId == page_id).first()
        if not row:
            raise HTTPException(status_code=404, detail="找不到活動 Demo")
        db.delete(row)
    elif kind == "script":
        row = db.query(models.PublicFeedback).filter(models.PublicFeedback.id == submission_id, models.PublicFeedback.activityPageId == page_id, models.PublicFeedback.kind == "listing").first()
        if not row:
            raise HTTPException(status_code=404, detail="找不到活動台本投稿")
        page = db.query(models.ActivityPage).filter(models.ActivityPage.id == page_id).first()
        if page and row.activityScriptId:
            page.externalScriptIds = [value for value in (page.externalScriptIds if isinstance(page.externalScriptIds, list) else []) if value != row.activityScriptId]
            page.updatedAt = int(time.time() * 1000)
        row.activityPageId = None
        row.activityScriptId = None
    else:
        raise HTTPException(status_code=400, detail="無效的活動投稿類型")
    db.commit()
    from routers import public_bundle
    public_bundle.invalidate_public_bundle_cache()
    return {"success": True}


def _external_author_key(value: Any) -> str:
    return unicodedata.normalize("NFKC", str(value or "").strip()).lower()


def _external_author_url(value: Any, *, image: bool = False) -> str:
    raw = str(value or "").strip()[:2000]
    if image and raw.startswith("/media/"):
        return raw
    if raw.startswith("/") and not raw.startswith("//") and not image:
        return raw
    parsed = urlparse(raw)
    if parsed.scheme in {"http", "https"} and parsed.hostname:
        return raw
    if raw:
        raise HTTPException(status_code=400, detail="作者社群與頭像請填有效的 http(s) 網址")
    return ""


def _external_author_page_rows(db: Session, author_key: str) -> list[models.ExternalPublicScript]:
    rows = (
        db.query(models.ExternalPublicScript)
        .filter(models.ExternalPublicScript.status == "published")
        .order_by(models.ExternalPublicScript.mountedAt.desc(), models.ExternalPublicScript.updatedAt.desc())
        .all()
    )
    return [row for row in rows if _external_author_key(row.authorName) == author_key]


def _external_author_current_profile(db: Session, author_key: str, rows: list[models.ExternalPublicScript]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    defaults = _external_author_page_defaults(author_key, rows)
    override = db.query(models.ExternalAuthorPageProfile).filter_by(authorKey=author_key).first()
    supplement = db.query(models.ExternalAuthorPageSupplement).filter_by(authorKey=author_key).first()
    details = supplement.profile if supplement and isinstance(supplement.profile, dict) else {}
    current = {
        "displayName": override.displayName if override and override.displayName else defaults["displayName"],
        "bio": override.bio if override and override.bio else defaults["bio"],
        "avatar": override.avatarUrl if override and override.avatarUrl else defaults["avatarUrl"],
        "profileUrl": override.profileUrl if override and override.profileUrl else defaults["profileUrl"],
        "website": str(details.get("website") or ""),
        "links": details.get("links") if isinstance(details.get("links"), list) else [],
        "organizations": details.get("organizations") if isinstance(details.get("organizations"), list) else [],
        "works": details.get("works") if isinstance(details.get("works"), list) else [],
    }
    contributors = supplement.contributors if supplement and isinstance(supplement.contributors, list) else []
    return current, contributors


def _external_author_page_profile_record(profile: models.ExternalAuthorPageProfile) -> dict[str, Any]:
    return {
        "authorKey": profile.authorKey,
        "linkedPersonaId": profile.linkedPersonaId,
        "displayName": profile.displayName or "",
        "bio": profile.bio or "",
        "profileUrl": profile.profileUrl or "",
        "avatarUrl": profile.avatarUrl or "",
        "isHidden": bool(profile.isHidden),
        "createdAt": int(profile.createdAt or 0),
        "updatedAt": int(profile.updatedAt or 0),
    }


def _external_author_page_defaults(author_key: str, rows: list[models.ExternalPublicScript]) -> dict[str, str]:
    def first_value(field: str) -> str:
        return next((str(getattr(row, field, "") or "").strip() for row in rows if str(getattr(row, field, "") or "").strip()), "")

    return {
        "authorKey": author_key,
        "displayName": first_value("authorName"),
        "bio": first_value("authorBio"),
        "profileUrl": first_value("authorUrl"),
        "avatarUrl": first_value("authorAvatarUrl"),
    }


@router.get("/external-author-profile-submissions", response_model=schemas.ExternalAuthorProfileSubmissionListResponse)
def list_external_author_profile_submissions_admin(
    q: Optional[str] = None,
    status: str = "pending",
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    query = db.query(models.ExternalAuthorProfileSubmission)
    if status != "all":
        if status not in {"pending", "approved", "rejected"}:
            raise HTTPException(status_code=400, detail="無效的審核狀態")
        query = query.filter(models.ExternalAuthorProfileSubmission.status == status)
    if q and q.strip():
        needle = f"%{q.strip()}%"
        query = query.filter(
            models.ExternalAuthorProfileSubmission.authorName.ilike(needle)
            | models.ExternalAuthorProfileSubmission.submitterName.ilike(needle)
            | models.ExternalAuthorProfileSubmission.contactEmail.ilike(needle)
        )
    total = query.count()
    rows = query.order_by(models.ExternalAuthorProfileSubmission.createdAt.desc()).offset(max(0, offset)).limit(min(max(limit, 1), 200)).all()
    items = []
    for row in rows:
        source_rows = _external_author_page_rows(db, row.authorKey)
        current_profile, collaborators = _external_author_current_profile(db, row.authorKey, source_rows)
        items.append(schemas.ExternalAuthorProfileSubmissionRecord(
            id=row.id, authorKey=row.authorKey, authorName=row.authorName or "（作者已不存在）",
            submitterName=row.submitterName, contactEmail=row.contactEmail,
            contributorName=str((row.profile or {}).get("contributorName") or ""),
            collaborators=collaborators, currentProfile=current_profile, profile=row.profile or {},
            acceptedFields=row.acceptedFields if isinstance(row.acceptedFields, list) else [],
            status=row.status, reviewNote=row.reviewNote or "", reviewedAt=row.reviewedAt, createdAt=row.createdAt,
        ))
    return schemas.ExternalAuthorProfileSubmissionListResponse(total=total, items=items)


@router.patch("/external-author-profile-submissions/{submission_id}/status", response_model=schemas.ExternalAuthorProfileSubmissionRecord)
def review_external_author_profile_submission_admin(
    submission_id: str,
    payload: schemas.ExternalAuthorProfileSubmissionStatusUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    row = db.query(models.ExternalAuthorProfileSubmission).filter_by(id=submission_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="找不到外部作者資料申請")
    if row.status != "pending":
        raise HTTPException(status_code=409, detail="這筆申請已完成審核")
    source_rows = _external_author_page_rows(db, row.authorKey)
    if not source_rows:
        raise HTTPException(status_code=404, detail="原外部作者已沒有公開作品")
    profile_data = row.profile if isinstance(row.profile, dict) else {}
    current_profile, collaborators = _external_author_current_profile(db, row.authorKey, source_rows)
    now_ms = int(time.time() * 1000)
    if payload.status == "approved":
        accepted_fields = set(payload.acceptedFields or ["displayName", "bio", "avatar", "profileUrl", "website", "links", "organizations", "works", "contributorName"])
        override = db.query(models.ExternalAuthorPageProfile).filter_by(authorKey=row.authorKey).first()
        if not override:
            defaults = _external_author_page_defaults(row.authorKey, source_rows)
            override = models.ExternalAuthorPageProfile(**{key: value for key, value in defaults.items() if key != "authorKey"}, authorKey=row.authorKey, createdAt=now_ms, updatedAt=now_ms)
            db.add(override)
        if "displayName" in accepted_fields:
            override.displayName = str(profile_data.get("displayName") or override.displayName or row.authorName).strip()[:200]
        if "bio" in accepted_fields:
            override.bio = str(profile_data.get("bio") or "").strip()[:10000]
        if "avatar" in accepted_fields:
            override.avatarUrl = str(profile_data.get("avatar") or "").strip()[:2000]
        if "profileUrl" in accepted_fields:
            override.profileUrl = str(profile_data.get("profileUrl") or "").strip()[:2000]
        override.updatedAt = now_ms

        supplement = db.query(models.ExternalAuthorPageSupplement).filter_by(authorKey=row.authorKey).first()
        if not supplement:
            supplement = models.ExternalAuthorPageSupplement(authorKey=row.authorKey, profile={}, contributors=[], updatedAt=now_ms)
            db.add(supplement)
        details = dict(supplement.profile or {}) if isinstance(supplement.profile, dict) else {}
        for field in ("website", "links", "organizations", "works"):
            if field in accepted_fields:
                details[field] = profile_data.get(field) or ([] if field in {"links", "organizations", "works"} else "")
        supplement.profile = details
        contributor_name = str(profile_data.get("contributorName") or "").strip()[:120]
        if "contributorName" in accepted_fields and contributor_name:
            collaborators = [*collaborators, {"name": contributor_name, "contributedAt": now_ms}]
            supplement.contributors = collaborators[:100]
        supplement.updatedAt = now_ms
        row.acceptedFields = sorted(accepted_fields)
    else:
        row.acceptedFields = []
    row.status = payload.status
    row.reviewNote = payload.reviewNote.strip()[:1000]
    row.reviewedAt = now_ms
    row.reviewedBy = ownerId
    db.commit()
    import routers.external_public_scripts as external_scripts_router
    external_scripts_router._invalidate_public_bundle_cache()
    from routers import public_bundle
    public_bundle.invalidate_public_bundle_cache()
    previous_item = models.ExternalPublicScript(id="author-profile-before", authorName=row.authorName)
    current_item = models.ExternalPublicScript(id="author-profile-after", authorName=row.authorName)
    external_scripts_router._queue_external_revalidation(background_tasks, previous_item, current_item)
    current_profile, collaborators = _external_author_current_profile(db, row.authorKey, source_rows)
    return schemas.ExternalAuthorProfileSubmissionRecord(
        id=row.id, authorKey=row.authorKey, authorName=row.authorName or "", submitterName=row.submitterName,
        contactEmail=row.contactEmail, contributorName=str(profile_data.get("contributorName") or ""),
        collaborators=collaborators, currentProfile=current_profile, profile=profile_data,
        acceptedFields=row.acceptedFields if isinstance(row.acceptedFields, list) else [],
        status=row.status, reviewNote=row.reviewNote or "", reviewedAt=row.reviewedAt, createdAt=row.createdAt,
    )


@router.get("/external-author-pages", response_model=List[schemas.ExternalAuthorPageProfileRecord])
def list_external_author_page_profiles_admin(
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    rows = db.query(models.ExternalAuthorPageProfile).order_by(models.ExternalAuthorPageProfile.displayName.asc()).all()
    return [_external_author_page_profile_record(row) for row in rows]


@router.put("/external-author-pages", response_model=schemas.ExternalAuthorPageProfileRecord)
def save_external_author_page_profile_admin(
    payload: schemas.ExternalAuthorPageProfilePayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    author_key = _external_author_key(payload.authorKey)
    if not author_key:
        raise HTTPException(status_code=400, detail="找不到外部作者頁")
    rows = _external_author_page_rows(db, author_key)
    if not rows:
        raise HTTPException(status_code=404, detail="這位作者目前沒有已發布的外部台本")
    display_name = payload.displayName.strip()[:200]
    if not display_name:
        raise HTTPException(status_code=400, detail="作者名稱不可空白")

    profile = db.query(models.ExternalAuthorPageProfile).filter_by(authorKey=author_key).first()
    defaults = _external_author_page_defaults(author_key, rows)
    previous_name = profile.displayName if profile and profile.displayName else defaults["displayName"]
    now_ms = int(time.time() * 1000)
    if not profile:
        profile = models.ExternalAuthorPageProfile(
            **{key: value for key, value in defaults.items() if key != "authorKey"},
            authorKey=author_key,
            createdAt=now_ms,
            updatedAt=now_ms,
        )
        db.add(profile)
    linked_persona_id = str(payload.linkedPersonaId or "").strip() or None
    if linked_persona_id and not db.query(models.Persona).filter_by(id=linked_persona_id).first():
        raise HTTPException(status_code=400, detail="找不到要連結的公開身份")
    profile.linkedPersonaId = linked_persona_id
    profile.displayName = display_name
    profile.bio = payload.bio.strip()[:10000]
    profile.profileUrl = _external_author_url(payload.profileUrl)
    profile.avatarUrl = _external_author_url(payload.avatarUrl, image=True)
    profile.isHidden = bool(payload.isHidden)
    profile.updatedAt = now_ms
    external_author_ids = {str(row.externalAuthorId or "") for row in rows if str(row.externalAuthorId or "")}
    if external_author_ids:
        external_authors = db.query(models.ExternalAuthor).filter(models.ExternalAuthor.id.in_(external_author_ids)).all()
        for external_author in external_authors:
            external_author.linkedPersonaId = linked_persona_id
            external_author.displayName = display_name
            external_author.bio = profile.bio
            external_author.profileUrl = profile.profileUrl
            external_author.avatarUrl = profile.avatarUrl
            external_author.isHidden = profile.isHidden
            external_author.updatedAt = now_ms
    if linked_persona_id:
        role = db.query(models.PersonaRole).filter_by(personaId=linked_persona_id, role="scriptwriter").first()
        if not role:
            role = models.PersonaRole(
                id=str(uuid.uuid4()), personaId=linked_persona_id, role="scriptwriter",
                isVisible=True, sourceTypes=["external_script"], profile={},
                createdAt=now_ms, updatedAt=now_ms,
            )
            db.add(role)
        elif "external_script" not in (role.sourceTypes or []):
            role.sourceTypes = [*(role.sourceTypes or []), "external_script"]
            role.updatedAt = now_ms
    db.commit()
    db.refresh(profile)

    import routers.external_public_scripts as external_scripts_router
    external_scripts_router._invalidate_public_bundle_cache()
    previous_item = models.ExternalPublicScript(id="author-profile-before", authorName=previous_name)
    current_item = models.ExternalPublicScript(id="author-profile-after", authorName=profile.displayName)
    external_scripts_router._queue_external_revalidation(background_tasks, previous_item, current_item)
    return _external_author_page_profile_record(profile)


@router.delete("/external-author-pages", response_model=schemas.ExternalAuthorPageProfileRecord)
def hide_external_author_page_admin(
    authorKey: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    author_key = _external_author_key(authorKey)
    rows = _external_author_page_rows(db, author_key)
    profile = db.query(models.ExternalAuthorPageProfile).filter_by(authorKey=author_key).first()
    if not profile and not rows:
        raise HTTPException(status_code=404, detail="找不到外部作者頁")
    defaults = _external_author_page_defaults(author_key, rows)
    previous_name = profile.displayName if profile and profile.displayName else defaults["displayName"]
    now_ms = int(time.time() * 1000)
    if not profile:
        profile = models.ExternalAuthorPageProfile(
            **{key: value for key, value in defaults.items() if key != "authorKey"},
            authorKey=author_key,
            createdAt=now_ms,
            updatedAt=now_ms,
        )
        db.add(profile)
    profile.isHidden = True
    profile.updatedAt = now_ms
    db.commit()
    db.refresh(profile)

    import routers.external_public_scripts as external_scripts_router
    external_scripts_router._invalidate_public_bundle_cache()
    previous_item = models.ExternalPublicScript(id="author-profile-before", authorName=previous_name)
    external_scripts_router._queue_external_revalidation(background_tasks, previous_item)
    return _external_author_page_profile_record(profile)


def _directory_users_query(db: Session, q: Optional[str]):
    query = db.query(models.User)
    normalized_q = (q or "").strip().lower()
    if normalized_q:
        like_q = f"%{normalized_q}%"
        query = query.filter(
            func.lower(models.User.email).like(like_q)
            | func.lower(models.User.displayName).like(like_q)
            | func.lower(models.User.handle).like(like_q)
            | models.User.id.like(like_q)
        )
    return query


def _directory_organizations_query(db: Session, q: Optional[str]):
    query = db.query(models.Organization)
    normalized_q = (q or "").strip().lower()
    if normalized_q:
        like_q = f"%{normalized_q}%"
        query = query.filter(
            func.lower(models.Organization.name).like(like_q)
            | models.Organization.id.like(like_q)
            | func.lower(models.Organization.ownerId).like(like_q)
        )
    return query


def _directory_personas_query(db: Session, q: Optional[str]):
    query = db.query(models.Persona)
    normalized_q = (q or "").strip().lower()
    if normalized_q:
        like_q = f"%{normalized_q}%"
        query = query.filter(
            func.lower(models.Persona.displayName).like(like_q)
            | models.Persona.id.like(like_q)
            | func.lower(models.Persona.ownerId).like(like_q)
        )
    return query


def _directory_scripts_query(db: Session, q: Optional[str]):
    query = db.query(models.Script)
    normalized_q = (q or "").strip().lower()
    if normalized_q:
        like_q = f"%{normalized_q}%"
        query = query.filter(
            func.lower(models.Script.title).like(like_q)
            | models.Script.id.like(like_q)
            | func.lower(models.Script.ownerId).like(like_q)
        )
    return query


@router.get("/directory-overview")
def directory_overview_admin(
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")

    # Match the limits and ordering of the four directory lists, but transfer
    # only columns needed for summary cards, owner labels, and author filtering.
    users = _directory_users_query(db, q).with_entities(
        models.User.id, models.User.displayName, models.User.email, models.User.handle
    ).order_by(models.User.lastLogin.desc(), models.User.id.desc()).limit(300).all()
    organization_count = min(_directory_organizations_query(db, q).count(), 300)
    personas = _directory_personas_query(db, q).with_entities(
        models.Persona.id, models.Persona.tags
    ).order_by(models.Persona.updatedAt.desc(), models.Persona.id.desc()).limit(300).all()
    scripts = _directory_scripts_query(db, q).with_entities(
        models.Script.type, models.Script.personaId
    ).order_by(models.Script.lastModified.desc(), models.Script.id.desc()).limit(600).all()
    script_persona_ids = {persona_id for kind, persona_id in scripts if kind != "folder" and persona_id}
    writer_tag_pattern = re.compile(r"台本師|編劇|劇本師|作者|script\s*writer|writer", re.IGNORECASE)
    writer_persona_ids = [
        persona_id for persona_id, tags in personas
        if persona_id in script_persona_ids
        or any(writer_tag_pattern.search(str(tag)) for tag in crud._ensure_list(tags))
    ]
    return {
        "users": len(users),
        "organizations": organization_count,
        "personas": len(personas),
        "authors": len(writer_persona_ids),
        "scripts": sum(kind != "folder" for kind, _ in scripts),
        "writerPersonaIds": writer_persona_ids,
        "ownerLabels": {
            user_id: display_name or email or handle or user_id
            for user_id, display_name, email, handle in users
        },
    }


@router.get("/all-users", response_model=List[schemas.UserPublic])
def list_all_users(
    q: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")

    safe_limit = max(1, min(limit, 500))
    safe_offset = max(offset, 0)
    query = _directory_users_query(db, q)
    rows = query.order_by(models.User.lastLogin.desc(), models.User.id.desc()).offset(safe_offset).limit(safe_limit).all()
    return rows


@router.delete("/all-users/{user_id}")
def admin_delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    if user_id == ownerId:
        raise HTTPException(status_code=400, detail="Cannot delete current admin user")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    email = str(getattr(user, "email", "") or "").strip().lower()
    try:
        _delete_scripts_owned_by(db, user_id)
        _delete_organizations_owned_by(db, user_id)

        db.query(models.PersonaOrganizationMembership).filter(
            models.PersonaOrganizationMembership.personaId.in_(
                db.query(models.Persona.id).filter(models.Persona.ownerId == user_id)
            )
        ).delete(synchronize_session=False)
        db.query(models.Script).filter(models.Script.personaId.in_(
            db.query(models.Persona.id).filter(models.Persona.ownerId == user_id)
        )).update({models.Script.personaId: None}, synchronize_session=False)
        db.query(models.Persona).filter(models.Persona.ownerId == user_id).delete(synchronize_session=False)

        db.query(models.Script).filter(models.Script.ownerId == user_id).update(
            {models.Script.seriesId: None, models.Script.seriesOrder: None},
            synchronize_session=False,
        )
        db.query(models.Series).filter(models.Series.ownerId == user_id).delete(synchronize_session=False)

        db.query(models.OrganizationInvite).filter(
            (models.OrganizationInvite.invitedUserId == user_id)
            | (models.OrganizationInvite.inviterUserId == user_id)
        ).delete(synchronize_session=False)
        db.query(models.OrganizationRequest).filter(
            models.OrganizationRequest.requesterUserId == user_id
        ).delete(synchronize_session=False)
        db.query(models.OrganizationMembership).filter(
            models.OrganizationMembership.userId == user_id
        ).delete(synchronize_session=False)
        db.query(models.ScriptLike).filter(models.ScriptLike.userId == user_id).delete(synchronize_session=False)
        db.query(models.MarkerTheme).filter(models.MarkerTheme.ownerId == user_id).delete(synchronize_session=False)
        db.query(models.Tag).filter(models.Tag.ownerId == user_id).delete(synchronize_session=False)
        db.query(models.PublicTermsAcceptance).filter(
            models.PublicTermsAcceptance.userId == user_id
        ).delete(synchronize_session=False)

        if email:
            db.query(models.AdminUser).filter(
                (models.AdminUser.userId == user_id) | (func.lower(models.AdminUser.email) == email)
            ).delete(synchronize_session=False)
        else:
            db.query(models.AdminUser).filter(models.AdminUser.userId == user_id).delete(synchronize_session=False)

        db.delete(user)
        db.commit()
    except Exception:
        db.rollback()
        raise HTTPException(status_code=500, detail="Failed to delete user")
    return {"success": True}


@router.get("/all-organizations", response_model=List[schemas.Organization])
def list_all_organizations(
    q: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    safe_limit = max(1, min(limit, 500))
    safe_offset = max(offset, 0)
    query = _directory_organizations_query(db, q)
    rows = query.order_by(models.Organization.updatedAt.desc()).offset(safe_offset).limit(safe_limit).all()
    for org in rows:
        org.tags = safe_json_list(org.tags)
    return rows


@router.get("/all-personas", response_model=List[schemas.Persona])
def list_all_personas(
    q: Optional[str] = None,
    limit: int = 200,
    offset: int = 0,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    safe_limit = max(1, min(limit, 500))
    safe_offset = max(offset, 0)
    query = _directory_personas_query(db, q)
    rows = query.order_by(models.Persona.updatedAt.desc(), models.Persona.id.desc()).offset(safe_offset).limit(safe_limit).all()
    for p in rows:
        p.tags = crud._ensure_list(p.tags)
        p.links = crud._ensure_list(p.links)
        p.organizationIds = crud._ensure_list(p.organizationIds)
        p.defaultLicenseSpecialTerms = crud._ensure_list(p.defaultLicenseSpecialTerms)
    return rows


@router.get("/voice-actors", response_model=List[schemas.AdminVoiceActorRecord])
def list_voice_actors_admin(
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    approved = db.query(models.PublicDemoSubmission).filter(models.PublicDemoSubmission.status == "approved").all()
    demo_sources: dict[str, set[str]] = {}
    for demo in approved:
        ids = [demo.voiceActorPersonaId, *crud._ensure_list(demo.voiceActorIds)]
        ids.extend(actor.get("personaId") for actor in crud._ensure_list(demo.manualVoiceActors) if isinstance(actor, dict))
        source = "本站 Demo" if demo.scriptType == "internal" else "外部台本 Demo"
        for persona_id in ids:
            if persona_id:
                demo_sources.setdefault(str(persona_id), set()).add(source)
    demo_counts: dict[str, dict[str, int]] = {}
    for demo in approved:
        ids = {str(value) for value in [demo.voiceActorPersonaId, *crud._ensure_list(demo.voiceActorIds)] if value}
        ids.update(str(actor.get("personaId")) for actor in crud._ensure_list(demo.manualVoiceActors) if isinstance(actor, dict) and actor.get("personaId"))
        key = "internalDemoCount" if demo.scriptType == "internal" else "externalDemoCount"
        for persona_id in ids:
            counts = demo_counts.setdefault(persona_id, {"internalDemoCount": 0, "externalDemoCount": 0})
            counts[key] += 1
    script_counts: dict[str, int] = {}
    for persona_id, in db.query(models.Script.personaId).filter(models.Script.personaId.isnot(None)).all():
        if persona_id:
            script_counts[str(persona_id)] = script_counts.get(str(persona_id), 0) + 1
    query = (q or "").strip().casefold()
    result = []
    for persona in db.query(models.Persona).all():
        tags = crud._ensure_list(persona.tags)
        is_tagged = any(any(mark in str(tag).casefold() for mark in ("聲演", "配音", "voice actor", "voice-actor", "voiceactor")) for tag in tags)
        sources = demo_sources.get(persona.id, set())
        if not is_tagged and not sources:
            continue
        owner = db.query(models.User).filter(models.User.id == persona.ownerId).first() if persona.ownerId else None
        searchable = f"{persona.displayName or ''} {persona.id} {persona.ownerId or ''} {owner.displayName if owner else ''} {' '.join(tags)}".casefold()
        if query and query not in searchable:
            continue
        types = []
        if is_tagged:
            types.append("公開身份")
        types.extend(sorted(sources))
        counts = demo_counts.get(persona.id, {"internalDemoCount": 0, "externalDemoCount": 0})
        item = schemas.AdminVoiceActorRecord.model_validate(persona).model_dump()
        item.update({"ownerName": owner.displayName if owner else "", "sourceTypes": types, "demoCount": sum(counts.values()), **counts, "scriptCount": script_counts.get(persona.id, 0)})
        result.append(item)
    return sorted(result, key=lambda item: (bool(item["voiceActorHidden"]), str(item["displayName"]).casefold()))


@router.put("/voice-actors/{persona_id}", response_model=schemas.AdminVoiceActorRecord)
def update_voice_actor_admin(
    persona_id: str,
    payload: schemas.AdminVoiceActorUpdate,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    persona = db.query(models.Persona).filter(models.Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="找不到聲演身份")
    display_name = payload.displayName.strip()[:120]
    if not display_name:
        raise HTTPException(status_code=400, detail="顯示名稱不可空白")
    persona.displayName = display_name
    persona.bio = payload.bio.strip()[:4000]
    persona.avatar = payload.avatar.strip()[:2000]
    persona.website = payload.website.strip()[:2000]
    persona.links = [item for item in payload.links if isinstance(item, dict)][:30]
    persona.voiceActorHidden = payload.voiceActorHidden
    persona.updatedAt = int(time.time() * 1000)
    role = db.query(models.PersonaRole).filter_by(personaId=persona.id, role="voice_actor").first()
    if not role:
        role = models.PersonaRole(
            id=str(uuid.uuid4()), personaId=persona.id, role="voice_actor",
            isVisible=not payload.voiceActorHidden, sourceTypes=["admin"], profile={},
            createdAt=persona.updatedAt, updatedAt=persona.updatedAt,
        )
        db.add(role)
    else:
        role.isVisible = not payload.voiceActorHidden
        role.updatedAt = persona.updatedAt
    db.commit()
    db.refresh(persona)
    from routers import public_bundle
    public_bundle.invalidate_public_bundle_cache()
    item = schemas.AdminVoiceActorRecord.model_validate(persona).model_dump()
    item.update({"ownerName": persona.owner.displayName if persona.owner else "", "sourceTypes": [], "demoCount": 0, "internalDemoCount": 0, "externalDemoCount": 0, "scriptCount": 0})
    return item


@router.delete("/voice-actors/{persona_id}")
def delete_voice_actor_admin(
    persona_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    """Remove a voice-actor identity while preserving shared author identities and demo history."""
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    persona = db.query(models.Persona).filter(models.Persona.id == persona_id).first()
    if not persona:
        raise HTTPException(status_code=404, detail="找不到聲演身份")

    scripts = db.query(models.Script).filter(models.Script.personaId == persona_id).count()
    writer_role = db.query(models.PersonaRole).filter_by(personaId=persona_id, role="scriptwriter").first()
    writer_tags = {"作者", "台本師", "scriptwriter", "script writer"}
    is_also_writer = scripts > 0 or writer_role is not None or any(
        str(tag).strip().casefold() in writer_tags for tag in crud._ensure_list(persona.tags)
    )

    # Detach the structured identity references but keep the credited name on
    # existing demos, so removing a profile does not erase historical credits.
    for demo in db.query(models.PublicDemoSubmission).all():
        voice_actor_ids = crud._ensure_list(demo.voiceActorIds)
        manual_actors = crud._ensure_list(demo.manualVoiceActors)
        matched_manual = [
            actor for actor in manual_actors
            if isinstance(actor, dict) and str(actor.get("personaId") or "") == persona_id
        ]
        referenced = (
            str(demo.voiceActorPersonaId or "") == persona_id
            or any(str(value) == persona_id for value in voice_actor_ids)
            or bool(matched_manual)
        )
        if not referenced:
            continue

        preserved_actors = []
        preserved_names = set()
        for actor in manual_actors:
            if isinstance(actor, dict) and str(actor.get("personaId") or "") == persona_id:
                preserved = {key: value for key, value in actor.items() if key != "personaId"}
                name = str(preserved.get("name") or persona.displayName or "").strip()
                if name:
                    preserved["name"] = name
                    preserved_names.add(name.casefold())
                preserved_actors.append(preserved)
            else:
                preserved_actors.append(actor)
                if isinstance(actor, dict) and actor.get("name"):
                    preserved_names.add(str(actor["name"]).strip().casefold())

        display_name = str(persona.displayName or "").strip()
        if display_name and display_name.casefold() not in preserved_names:
            preserved_actors.append({"name": display_name})
        demo.voiceActorPersonaId = None if str(demo.voiceActorPersonaId or "") == persona_id else demo.voiceActorPersonaId
        demo.voiceActorIds = [value for value in voice_actor_ids if str(value) != persona_id]
        demo.manualVoiceActors = preserved_actors

    if is_also_writer:
        # Persona is shared with the writer profile. Remove only its voice-actor
        # role and voice-actor classification; the author and authored scripts stay.
        voice_tags = ("聲演", "配音", "voice actor", "voice-actor", "voiceactor")
        persona.tags = [
            tag for tag in crud._ensure_list(persona.tags)
            if not any(marker in str(tag).casefold() for marker in voice_tags)
        ]
        db.query(models.PersonaRole).filter_by(personaId=persona_id, role="voice_actor").delete(synchronize_session=False)
        persona.updatedAt = int(time.time() * 1000)
        db.commit()
    else:
        # For a voice-actor-only identity, fully remove the profile and its
        # dependent voice-actor submissions after preserving demo name credits.
        crud.delete_persona(db, persona_id)

    from routers import public_bundle
    public_bundle.invalidate_public_bundle_cache()
    _queue_demo_revalidation(background_tasks, "/voice-actors", "/demos", f"/author/{persona_id}")
    return {"success": True, "preservedAuthor": is_also_writer}


@router.post("/voice-actors", response_model=schemas.AdminVoiceActorRecord)
def create_voice_actor_admin(
    payload: schemas.AdminVoiceActorCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    now_ms = int(time.time() * 1000)
    persona = models.Persona(
        id=str(uuid.uuid4()),
        ownerId=None,
        displayName=payload.displayName,
        avatar="",
        bannerUrl="",
        bio="",
        website="",
        links=[],
        organizationIds=[],
        tags=["聲演"],
        voiceActorHidden=False,
        defaultLicenseCommercial="",
        defaultLicenseDerivative="",
        defaultLicenseNotify="",
        defaultLicenseSpecialTerms=[],
        createdAt=now_ms,
        updatedAt=now_ms,
    )
    db.add(persona)
    db.add(models.PersonaRole(
        id=str(uuid.uuid4()), personaId=persona.id, role="voice_actor",
        isVisible=True, sourceTypes=["admin"], profile={},
        createdAt=now_ms, updatedAt=now_ms,
    ))
    db.commit()
    db.refresh(persona)
    item = schemas.AdminVoiceActorRecord.model_validate(persona).model_dump()
    item.update({"ownerName": "", "sourceTypes": ["公開身份"], "demoCount": 0, "internalDemoCount": 0, "externalDemoCount": 0, "scriptCount": 0})
    from routers import public_bundle
    public_bundle.invalidate_public_bundle_cache()
    _queue_demo_revalidation(background_tasks, "/voice-actors")
    return item


@router.get("/voice-actor-claims", response_model=schemas.VoiceActorClaimRequestListResponse)
def list_voice_actor_claims_admin(
    q: Optional[str] = None,
    status: str = "pending",
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    query = db.query(models.VoiceActorClaimRequest)
    if status != "all":
        if status not in {"pending", "approved", "rejected"}:
            raise HTTPException(status_code=400, detail="無效的審核狀態")
        query = query.filter(models.VoiceActorClaimRequest.status == status)
    if q and q.strip():
        needle = f"%{q.strip()}%"
        persona_ids = [item[0] for item in db.query(models.Persona.id).filter(models.Persona.displayName.ilike(needle)).all()]
        query = query.filter((models.VoiceActorClaimRequest.verifiedEmail.ilike(needle)) | (models.VoiceActorClaimRequest.requesterId.ilike(needle)) | (models.VoiceActorClaimRequest.personaId.in_(persona_ids)))
    total = query.count()
    rows = query.order_by(models.VoiceActorClaimRequest.createdAt.desc()).offset(max(0, offset)).limit(min(max(limit, 1), 200)).all()
    return schemas.VoiceActorClaimRequestListResponse(total=total, items=[_voice_actor_claim_record(row) for row in rows])


@router.patch("/voice-actor-claims/{claim_id}/status", response_model=schemas.VoiceActorClaimRequestRecord)
def review_voice_actor_claim_admin(
    claim_id: str,
    payload: schemas.VoiceActorClaimRequestStatusUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    row = db.query(models.VoiceActorClaimRequest).filter_by(id=claim_id).with_for_update().first()
    if not row:
        raise HTTPException(status_code=404, detail="找不到聲演認領申請")
    if row.status != "pending":
        raise HTTPException(status_code=409, detail="這筆認領申請已完成審核")
    persona = db.query(models.Persona).filter_by(id=row.personaId).first()
    if not persona:
        raise HTTPException(status_code=404, detail="聲演身份已不存在")
    now_ms = int(time.time() * 1000)
    if payload.status == "approved":
        if persona.ownerId:
            raise HTTPException(status_code=409, detail="此身份已由其他帳戶管理，不能直接覆寫；請先處理身份移轉")
        claimed = db.query(models.Persona).filter(
            models.Persona.id == persona.id,
            models.Persona.ownerId.is_(None),
        ).update({models.Persona.ownerId: row.requesterId}, synchronize_session=False)
        if claimed != 1:
            db.rollback()
            raise HTTPException(status_code=409, detail="此身份已由其他帳戶管理，請重新整理審核列表")
        user = db.query(models.User).filter_by(id=row.requesterId).first()
        if not user:
            user = models.User(id=row.requesterId, email=row.verifiedEmail, createdAt=now_ms, lastLogin=now_ms)
            db.add(user)
        persona.ownerId = row.requesterId
        persona.tags = [tag for tag in crud._ensure_list(persona.tags) if str(tag).strip() != "待認領"]
        persona.updatedAt = now_ms
        role = db.query(models.PersonaRole).filter_by(personaId=persona.id, role="voice_actor").first()
        if not role:
            role = models.PersonaRole(id=str(uuid.uuid4()), personaId=persona.id, role="voice_actor", isVisible=not persona.voiceActorHidden, sourceTypes=["claim"], profile={"collaborationEnabled": True}, createdAt=now_ms, updatedAt=now_ms)
            db.add(role)
        else:
            role_profile = dict(role.profile) if isinstance(role.profile, dict) else {}
            role_profile.setdefault("collaborationEnabled", True)
            role.profile = role_profile
            role.updatedAt = now_ms
        db.query(models.VoiceActorClaimRequest).filter(
            models.VoiceActorClaimRequest.personaId == persona.id,
            models.VoiceActorClaimRequest.id != row.id,
            models.VoiceActorClaimRequest.status == "pending",
        ).update({
            models.VoiceActorClaimRequest.status: "rejected",
            models.VoiceActorClaimRequest.reviewNote: "另一筆認領申請已核准。",
            models.VoiceActorClaimRequest.reviewedAt: now_ms,
            models.VoiceActorClaimRequest.reviewedBy: ownerId,
        }, synchronize_session=False)
    row.status = payload.status
    row.reviewNote = payload.reviewNote.strip()[:1000]
    row.reviewedAt = now_ms
    row.reviewedBy = ownerId
    db.commit()
    from routers import public_bundle
    public_bundle.invalidate_public_bundle_cache()
    _queue_demo_revalidation(background_tasks, f"/author/{persona.id}", "/voice-actors")
    return _voice_actor_claim_record(row)


@router.get("/voice-actor-profile-submissions", response_model=schemas.VoiceActorProfileSubmissionListResponse)
def list_voice_actor_profile_submissions_admin(
    q: Optional[str] = None,
    status: str = "pending",
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    query = db.query(models.VoiceActorProfileSubmission).join(
        models.Persona,
        models.Persona.id == models.VoiceActorProfileSubmission.personaId,
    ).filter(
        models.Persona.ownerId.is_(None)
        | (models.VoiceActorProfileSubmission.profile["profileKind"].as_string() == "author")
    )
    if status != "all":
        if status not in {"pending", "approved", "rejected"}:
            raise HTTPException(status_code=400, detail="無效的審核狀態")
        query = query.filter(models.VoiceActorProfileSubmission.status == status)
    if q and q.strip():
        needle = f"%{q.strip()}%"
        persona_ids = [row[0] for row in db.query(models.Persona.id).filter(models.Persona.displayName.ilike(needle)).all()]
        query = query.filter(
            (models.VoiceActorProfileSubmission.submitterName.ilike(needle))
            | (models.VoiceActorProfileSubmission.contactEmail.ilike(needle))
            | (models.VoiceActorProfileSubmission.personaId.in_(persona_ids))
        )
    total = query.count()
    rows = query.order_by(models.VoiceActorProfileSubmission.createdAt.desc()).offset(max(0, offset)).limit(min(max(limit, 1), 200)).all()
    items = []
    for row in rows:
        persona = db.query(models.Persona).filter(models.Persona.id == row.personaId).first()
        items.append(schemas.VoiceActorProfileSubmissionRecord(
            id=row.id, personaId=row.personaId, personaName=persona.displayName if persona else "（身份已刪除）",
            profileKind="author" if str((row.profile or {}).get("profileKind") or "voice_actor") == "author" else "voice_actor",
            submitterName=row.submitterName, contactEmail=row.contactEmail,
            contributorName=str((row.profile or {}).get("contributorName") or ""),
            collaborators=persona.voiceActorContributors if persona and isinstance(persona.voiceActorContributors, list) else [],
            currentProfile={
                "displayName": persona.displayName or "", "bio": persona.bio or "", "avatar": persona.avatar or "", "website": persona.website or "",
                "links": crud._ensure_list(persona.links), "organizations": persona.voiceActorOrganizations if isinstance(persona.voiceActorOrganizations, list) else [],
                "works": persona.voiceActorWorks if isinstance(persona.voiceActorWorks, list) else [],
            } if persona else {},
            profile=row.profile or {},
            acceptedFields=row.acceptedFields if isinstance(row.acceptedFields, list) else [],
            status=row.status, reviewNote=row.reviewNote or "", reviewedAt=row.reviewedAt, createdAt=row.createdAt,
        ))
    return schemas.VoiceActorProfileSubmissionListResponse(total=total, items=items)


@router.patch("/voice-actor-profile-submissions/{submission_id}/status", response_model=schemas.VoiceActorProfileSubmissionRecord)
def review_voice_actor_profile_submission_admin(
    submission_id: str,
    payload: schemas.VoiceActorProfileSubmissionStatusUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    row = db.query(models.VoiceActorProfileSubmission).filter(models.VoiceActorProfileSubmission.id == submission_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="找不到聲演資料申請")
    if row.status != "pending":
        raise HTTPException(status_code=409, detail="這筆申請已完成審核")
    persona = db.query(models.Persona).filter(models.Persona.id == row.personaId).first()
    if not persona:
        raise HTTPException(status_code=404, detail="原聲演身份已不存在")
    profile = row.profile if isinstance(row.profile, dict) else {}
    profile_kind = str(profile.get("profileKind") or "voice_actor")
    if profile_kind not in {"voice_actor", "author"}:
        raise HTTPException(status_code=400, detail="無效的資料申請類型")
    if profile_kind != "author" and persona.ownerId:
        raise HTTPException(status_code=409, detail="此聲演已由本人管理，請由本人審核這筆資料補充")
    now_ms = int(time.time() * 1000)
    if payload.status == "approved":
        accepted_fields = set(payload.acceptedFields)
        allowed_fields = {"displayName", "bio", "avatar", "website", "links"}
        if profile_kind == "voice_actor":
            allowed_fields |= {"organizations", "works", "contributorName"}
        if accepted_fields - allowed_fields:
            raise HTTPException(status_code=400, detail="此類型申請包含不支援的資料欄位")
        if not accepted_fields:
            raise HTTPException(status_code=400, detail="請至少選擇一個要採用的資料欄位")
        if "displayName" in accepted_fields:
            persona.displayName = str(profile.get("displayName") or persona.displayName or "").strip()[:120]
        if "bio" in accepted_fields:
            persona.bio = str(profile.get("bio") or "").strip()[:4000]
        if "avatar" in accepted_fields:
            persona.avatar = str(profile.get("avatar") or "").strip()[:2000]
        if "website" in accepted_fields:
            persona.website = str(profile.get("website") or "").strip()[:2000]
        if "links" in accepted_fields:
            persona.links = [item for item in profile.get("links", []) if isinstance(item, dict)][:30]
        if profile_kind == "voice_actor" and "organizations" in accepted_fields:
            persona.voiceActorOrganizations = [item for item in profile.get("organizations", []) if isinstance(item, dict)][:20]
        if profile_kind == "voice_actor" and "works" in accepted_fields:
            persona.voiceActorWorks = [item for item in profile.get("works", []) if isinstance(item, dict)][:50]
        if profile_kind == "voice_actor" and "contributorName" in accepted_fields:
            contributors = persona.voiceActorContributors if isinstance(persona.voiceActorContributors, list) else []
            contributor_name = str(profile.get("contributorName") or "").strip()[:120] or "訪客協作者"
            persona.voiceActorContributors = [*contributors, {"name": contributor_name, "contributedAt": now_ms}][:100]
        persona.updatedAt = now_ms
        if profile_kind == "voice_actor":
            persona.tags = [tag for tag in crud._ensure_list(persona.tags) if str(tag).strip() != "待認領"]
            role = db.query(models.PersonaRole).filter_by(personaId=persona.id, role="voice_actor").first()
            role_profile = {
                "works": persona.voiceActorWorks,
                "organizations": persona.voiceActorOrganizations,
                "contributors": persona.voiceActorContributors,
            }
            if not role:
                role = models.PersonaRole(
                    id=str(uuid.uuid4()), personaId=persona.id, role="voice_actor",
                    isVisible=not persona.voiceActorHidden,
                    sourceTypes=["profile_submission"], profile=role_profile,
                    createdAt=now_ms, updatedAt=now_ms,
                )
                db.add(role)
            else:
                sources = list(role.sourceTypes or [])
                if "profile_submission" not in sources:
                    sources.append("profile_submission")
                role.sourceTypes = sources
                existing_profile = dict(role.profile) if isinstance(role.profile, dict) else {}
                if "collaborationEnabled" in existing_profile:
                    role_profile["collaborationEnabled"] = existing_profile["collaborationEnabled"]
                role.profile = role_profile
                role.isVisible = not persona.voiceActorHidden
                role.updatedAt = now_ms
        row.acceptedFields = sorted(accepted_fields)
    else:
        row.acceptedFields = []
    row.status = payload.status
    row.reviewNote = payload.reviewNote.strip()[:1000]
    row.reviewedAt = now_ms
    row.reviewedBy = ownerId
    db.commit()
    from routers import public_bundle
    public_bundle.invalidate_public_bundle_cache()
    _queue_demo_revalidation(background_tasks, f"/author/{persona.id}", *( ["/voice-actors"] if profile_kind == "voice_actor" else []))
    return schemas.VoiceActorProfileSubmissionRecord(
        id=row.id, personaId=row.personaId, personaName=persona.displayName or "", submitterName=row.submitterName,
        profileKind="author" if profile_kind == "author" else "voice_actor",
        contactEmail=row.contactEmail, contributorName=str((row.profile or {}).get("contributorName") or ""),
        collaborators=persona.voiceActorContributors if isinstance(persona.voiceActorContributors, list) else [],
        currentProfile={
            "displayName": persona.displayName or "", "bio": persona.bio or "", "avatar": persona.avatar or "", "website": persona.website or "",
            "links": crud._ensure_list(persona.links), "organizations": persona.voiceActorOrganizations if isinstance(persona.voiceActorOrganizations, list) else [],
            "works": persona.voiceActorWorks if isinstance(persona.voiceActorWorks, list) else [],
        },
        profile=row.profile or {}, acceptedFields=row.acceptedFields if isinstance(row.acceptedFields, list) else [],
        status=row.status, reviewNote=row.reviewNote or "",
        reviewedAt=row.reviewedAt, createdAt=row.createdAt,
    )


@router.get("/all-scripts", response_model=List[schemas.ScriptSummary])
def list_all_scripts(
    q: Optional[str] = None,
    limit: int = 300,
    offset: int = 0,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    safe_limit = max(1, min(limit, 1000))
    safe_offset = max(offset, 0)
    query = _directory_scripts_query(db, q).options(
        orm.joinedload(models.Script.tags),
        orm.joinedload(models.Script.persona),
        orm.joinedload(models.Script.organization),
        orm.joinedload(models.Script.series),
    )
    rows = query.order_by(models.Script.lastModified.desc(), models.Script.id.desc()).offset(safe_offset).limit(safe_limit).all()
    for s in rows:
        setattr(s, "contentLength", len(s.content or ""))
        s.tags = s.tags or []
    return rows


@router.put("/all-scripts/{script_id}/metadata", response_model=schemas.ScriptSummary)
def update_script_metadata_admin(
    script_id: str,
    payload: schemas.ScriptAdminMetadataUpdate,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    script = db.query(models.Script).filter(models.Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")

    update_data = payload.model_dump(exclude_unset=True)
    tag_ids = update_data.pop("tags", None)
    updated = crud.update_script(
        db,
        script_id=script_id,
        script=schemas.ScriptUpdate(**update_data),
        ownerId=script.ownerId,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Script not found")

    if isinstance(tag_ids, list):
        clean_ids = sorted({int(tag_id) for tag_id in tag_ids if str(tag_id).isdigit()})
        if clean_ids:
            tags = (
                db.query(models.Tag)
                .filter(models.Tag.ownerId == script.ownerId, models.Tag.id.in_(clean_ids))
                .all()
            )
        else:
            tags = []
        updated.tags = tags
        db.commit()
        db.refresh(updated)

    setattr(updated, "contentLength", len(updated.content or ""))
    updated.tags = updated.tags or []
    return updated


@router.get("/all-scripts/{script_id}/metadata", response_model=schemas.ScriptSummary)
def get_script_metadata_admin(
    script_id: str,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    script = db.query(models.Script).filter(models.Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    setattr(script, "contentLength", len(script.content or ""))
    script.tags = script.tags or []
    return script


@router.delete("/all-organizations/{org_id}")
def admin_delete_organization(
    org_id: str,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    success = crud.delete_organization(db, org_id, org.ownerId)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete organization")
    return {"success": True}


@router.delete("/all-personas/{persona_id}")
def admin_delete_persona(
    persona_id: str,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    success = crud.delete_persona(db, persona_id)
    if not success:
        raise HTTPException(status_code=404, detail="Persona not found")
    return {"success": True}


@router.delete("/all-scripts/{script_id}")
def admin_delete_script(
    script_id: str,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    if not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    script = db.query(models.Script).filter(models.Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    success = crud.delete_script(db, script_id, script.ownerId)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to delete script")
    return {"success": True}
