import time
import uuid

from sqlalchemy.orm import Session

import models
import schemas
from media_crop import normalize_media_with_crop
from .common import _ensure_list
from .organizations_query import ensure_persona_org_memberships, get_persona_org_ids, is_user_org_manager


def _sanitize_persona_org_ids(db: Session, owner_id: str, org_ids) -> list:
    return [
        str(org_id or "").strip()
        for org_id in _ensure_list(org_ids)
        if str(org_id or "").strip() and is_user_org_manager(db, owner_id, str(org_id).strip())
    ]


def create_persona(db: Session, persona: schemas.PersonaCreate, ownerId: str):
    org_ids = _sanitize_persona_org_ids(db, ownerId, persona.organizationIds or [])
    avatar_url, avatar_crop = normalize_media_with_crop(persona.avatar or "", persona.avatarCrop)
    banner_url, banner_crop = normalize_media_with_crop(persona.bannerUrl or "", persona.bannerCrop)
    db_persona = models.Persona(
        id=str(uuid.uuid4()),
        ownerId=ownerId,
        displayName=persona.displayName,
        bio=persona.bio,
        avatar=avatar_url,
        avatarCrop=avatar_crop,
        bannerUrl=banner_url,
        bannerCrop=banner_crop,
        website=persona.website or "",
        links=persona.links or [],
        organizationIds=org_ids,
        tags=persona.tags or [],
        defaultLicenseCommercial=persona.defaultLicenseCommercial or "",
        defaultLicenseDerivative=persona.defaultLicenseDerivative or "",
        defaultLicenseNotify=persona.defaultLicenseNotify or "",
        defaultLicenseSpecialTerms=persona.defaultLicenseSpecialTerms or [],
    )
    db.add(db_persona)
    db.flush()
    ensure_persona_org_memberships(db, db_persona, org_ids)
    db.commit()
    db.refresh(db_persona)
    return db_persona


def update_persona(db: Session, persona_id: str, persona: schemas.PersonaCreate, ownerId: str):
    db_persona = db.query(models.Persona).filter(models.Persona.id == persona_id, models.Persona.ownerId == ownerId).first()
    if not db_persona:
        return None
    update_data = persona.model_dump(exclude_unset=True)
    if "avatar" in update_data or "avatarCrop" in update_data:
        avatar_url, avatar_crop = normalize_media_with_crop(
            update_data.pop("avatar", db_persona.avatar),
            update_data.pop("avatarCrop", db_persona.avatarCrop),
        )
        update_data["avatar"] = avatar_url
        update_data["avatarCrop"] = avatar_crop
    if "bannerUrl" in update_data or "bannerCrop" in update_data:
        banner_url, banner_crop = normalize_media_with_crop(
            update_data.pop("bannerUrl", db_persona.bannerUrl),
            update_data.pop("bannerCrop", db_persona.bannerCrop),
        )
        update_data["bannerUrl"] = banner_url
        update_data["bannerCrop"] = banner_crop
    if "tags" in update_data and update_data["tags"] is None:
        update_data["tags"] = []
    if "defaultLicenseSpecialTerms" in update_data and update_data["defaultLicenseSpecialTerms"] is None:
        update_data["defaultLicenseSpecialTerms"] = []
    if "links" in update_data and update_data["links"] is None:
        update_data["links"] = []

    new_org_ids = None
    if "organizationIds" in update_data:
        new_org_ids = _sanitize_persona_org_ids(db, ownerId, update_data.pop("organizationIds"))

    for key, value in update_data.items():
        setattr(db_persona, key, value)

    if new_org_ids is not None:
        ensure_persona_org_memberships(db, db_persona, new_org_ids)

    db_persona.updatedAt = int(time.time() * 1000)
    db.commit()
    db.refresh(db_persona)

    db_persona.tags = _ensure_list(db_persona.tags)
    db_persona.organizationIds = get_persona_org_ids(db, db_persona)
    db_persona.defaultLicenseSpecialTerms = _ensure_list(db_persona.defaultLicenseSpecialTerms)
    db_persona.links = _ensure_list(db_persona.links)

    return db_persona


def get_user_personas(db: Session, ownerId: str):
    personas = db.query(models.Persona).filter(models.Persona.ownerId == ownerId).all()
    for p in personas:
        p.organizationIds = get_persona_org_ids(db, p)
        p.tags = _ensure_list(p.tags)
        p.defaultLicenseSpecialTerms = _ensure_list(p.defaultLicenseSpecialTerms)
        p.links = _ensure_list(p.links)
    return personas


def delete_persona(db: Session, persona_id: str):
    persona = db.query(models.Persona).filter(models.Persona.id == persona_id).first()
    if persona:
        db.query(models.PersonaOrganizationMembership).filter(
            models.PersonaOrganizationMembership.personaId == persona_id
        ).delete()
        db.query(models.Script).filter(models.Script.personaId == persona_id).update({models.Script.personaId: None})
        db.delete(persona)
        db.commit()
        return True
    return False


__all__ = [
    "create_persona",
    "update_persona",
    "get_user_personas",
    "delete_persona",
]
