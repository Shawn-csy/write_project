from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
import time
import uuid
import json
import crud_ops as crud
import models
import schemas
from dependencies import get_db, get_current_user_id, is_admin_user, _admin_user_emails

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/users", response_model=List[schemas.UserPublic])
def search_users(q: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
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
    return [user] if user else []


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
            (models.PublicTermsAcceptance.scriptId.like(like_q))
            | (models.PublicTermsAcceptance.userId.like(like_q))
            | (models.PublicTermsAcceptance.visitorId.like(like_q))
            | (models.PublicTermsAcceptance.ipAddress.like(like_q))
            | (models.PublicTermsAcceptance.userAgent.like(like_q))
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
    if user_id:
        exists_query = exists_query.filter((models.AdminUser.userId == user_id) | (models.AdminUser.email == email))
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

    # Delete owned resources first to avoid leaving orphaned records.
    script_ids = [row.id for row in db.query(models.Script.id).filter(models.Script.ownerId == user_id).all()]
    for script_id in script_ids:
        crud.delete_script(db, script_id, user_id)

    org_rows = db.query(models.Organization).filter(models.Organization.ownerId == user_id).all()
    for org in org_rows:
        crud.delete_organization(db, org.id, user_id)

    persona_ids = [row.id for row in db.query(models.Persona.id).filter(models.Persona.ownerId == user_id).all()]
    for persona_id in persona_ids:
        crud.delete_persona(db, persona_id)

    series_ids = [row.id for row in db.query(models.Series.id).filter(models.Series.ownerId == user_id).all()]
    for series_id in series_ids:
        crud.delete_series(db, series_id, user_id)

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
        if isinstance(org.tags, str):
            try:
                org.tags = json.loads(org.tags)
            except Exception:
                org.tags = []
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
