import time
import uuid

from sqlalchemy.orm import Session

import models
import schemas
from .common import _ensure_list


def create_persona(db: Session, persona: schemas.PersonaCreate, ownerId: str):
    db_persona = models.Persona(
        id=str(uuid.uuid4()),
        ownerId=ownerId,
        displayName=persona.displayName,
        bio=persona.bio,
        avatar=persona.avatar,
        bannerUrl=persona.bannerUrl or "",
        website=persona.website or "",
        links=persona.links or [],
        organizationIds=persona.organizationIds or [],
        tags=persona.tags or [],
        defaultLicenseCommercial=persona.defaultLicenseCommercial or "",
        defaultLicenseDerivative=persona.defaultLicenseDerivative or "",
        defaultLicenseNotify=persona.defaultLicenseNotify or "",
        defaultLicenseSpecialTerms=persona.defaultLicenseSpecialTerms or [],
    )
    db.add(db_persona)
    db.commit()
    db.refresh(db_persona)
    return db_persona


def update_persona(db: Session, persona_id: str, persona: schemas.PersonaCreate, ownerId: str):
    db_persona = db.query(models.Persona).filter(models.Persona.id == persona_id, models.Persona.ownerId == ownerId).first()
    if not db_persona:
        return None
    update_data = persona.model_dump(exclude_unset=True)
    if "tags" in update_data and update_data["tags"] is None:
        update_data["tags"] = []
    if "defaultLicenseSpecialTerms" in update_data and update_data["defaultLicenseSpecialTerms"] is None:
        update_data["defaultLicenseSpecialTerms"] = []
    if "links" in update_data and update_data["links"] is None:
        update_data["links"] = []

    for key, value in update_data.items():
        setattr(db_persona, key, value)
    db_persona.updatedAt = int(time.time() * 1000)
    db.commit()
    db.refresh(db_persona)

    db_persona.tags = _ensure_list(db_persona.tags)
    db_persona.organizationIds = _ensure_list(db_persona.organizationIds)
    db_persona.defaultLicenseSpecialTerms = _ensure_list(db_persona.defaultLicenseSpecialTerms)
    db_persona.links = _ensure_list(db_persona.links)

    return db_persona


def get_user_personas(db: Session, ownerId: str):
    personas = db.query(models.Persona).filter(models.Persona.ownerId == ownerId).all()
    for p in personas:
        p.organizationIds = _ensure_list(p.organizationIds)
        p.tags = _ensure_list(p.tags)
        p.defaultLicenseSpecialTerms = _ensure_list(p.defaultLicenseSpecialTerms)
        p.links = _ensure_list(p.links)
    return personas


def delete_persona(db: Session, persona_id: str):
    persona = db.query(models.Persona).filter(models.Persona.id == persona_id).first()
    if persona:
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
