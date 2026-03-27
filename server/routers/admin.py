from fastapi import APIRouter, Body, Depends, HTTPException, Request
from typing import Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
import time
import uuid
import json
import crud_ops as crud
import models
import schemas
from dependencies import get_db, get_current_user_id, is_admin_user, _admin_user_emails
from rate_limit import limiter
from utils import normalize_homepage_banner_value, safe_json_list

router = APIRouter(prefix="/api/admin", tags=["admin"])
HOMEPAGE_BANNER_SETTING_KEY = "homepage_banner"


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
        db.query(models.PersonaOrganizationMembership).filter(
            models.PersonaOrganizationMembership.orgId == org_id
        ).delete(synchronize_session=False)
        personas = db.query(models.Persona).all()
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
    return schemas.HomepageBannerSetting(**clean)


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
    rows = query.order_by(models.User.lastLogin.desc()).offset(safe_offset).limit(safe_limit).all()
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
    query = db.query(models.Organization)
    normalized_q = (q or "").strip().lower()
    if normalized_q:
        like_q = f"%{normalized_q}%"
        query = query.filter(
            func.lower(models.Organization.name).like(like_q)
            | models.Organization.id.like(like_q)
            | func.lower(models.Organization.ownerId).like(like_q)
        )
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
    query = db.query(models.Persona)
    normalized_q = (q or "").strip().lower()
    if normalized_q:
        like_q = f"%{normalized_q}%"
        query = query.filter(
            func.lower(models.Persona.displayName).like(like_q)
            | models.Persona.id.like(like_q)
            | func.lower(models.Persona.ownerId).like(like_q)
        )
    rows = query.order_by(models.Persona.updatedAt.desc()).offset(safe_offset).limit(safe_limit).all()
    for p in rows:
        p.tags = crud._ensure_list(p.tags)
        p.links = crud._ensure_list(p.links)
        p.organizationIds = crud._ensure_list(p.organizationIds)
        p.defaultLicenseSpecialTerms = crud._ensure_list(p.defaultLicenseSpecialTerms)
    return rows


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
    query = db.query(models.Script)
    normalized_q = (q or "").strip().lower()
    if normalized_q:
        like_q = f"%{normalized_q}%"
        query = query.filter(
            func.lower(models.Script.title).like(like_q)
            | models.Script.id.like(like_q)
            | func.lower(models.Script.ownerId).like(like_q)
        )
    rows = query.order_by(models.Script.lastModified.desc()).offset(safe_offset).limit(safe_limit).all()
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
