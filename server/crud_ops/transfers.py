import time

from sqlalchemy.orm import Session

import models
from .common import ensure_folder_tree, ensure_folders_for_owner


def transfer_organization(db: Session, org_id: str, new_owner_id: str, current_owner_id: str, transfer_scripts: bool = True):
    db_org = db.query(models.Organization).filter(models.Organization.id == org_id, models.Organization.ownerId == current_owner_id).first()
    if not db_org:
        return False

    new_owner = db.query(models.User).filter(models.User.id == new_owner_id).first()
    if not new_owner:
        return False

    try:
        db_org.ownerId = new_owner_id
        db_org.updatedAt = int(time.time() * 1000)

        if transfer_scripts:
            folder_rows = db.query(models.Script.folder).filter(models.Script.organizationId == org_id).distinct().all()
            ensure_folders_for_owner(db, new_owner_id, [r[0] for r in folder_rows])
            db.query(models.Script).filter(models.Script.organizationId == org_id).update({models.Script.ownerId: new_owner_id})

        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"Transfer failed: {e}")
        return False


def transfer_organization_admin(db: Session, org_id: str, new_owner_id: str, transfer_scripts: bool = True):
    db_org = db.query(models.Organization).filter(models.Organization.id == org_id).first()
    if not db_org:
        return False

    new_owner = db.query(models.User).filter(models.User.id == new_owner_id).first()
    if not new_owner:
        return False

    try:
        db_org.ownerId = new_owner_id
        db_org.updatedAt = int(time.time() * 1000)

        if transfer_scripts:
            folder_rows = db.query(models.Script.folder).filter(models.Script.organizationId == org_id).distinct().all()
            ensure_folders_for_owner(db, new_owner_id, [r[0] for r in folder_rows])
            db.query(models.Script).filter(models.Script.organizationId == org_id).update({models.Script.ownerId: new_owner_id})

        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"Transfer failed: {e}")
        return False


def transfer_script_ownership(db: Session, script_id: str, new_owner_id: str, current_owner_id: str):
    db_script = db.query(models.Script).filter(models.Script.id == script_id, models.Script.ownerId == current_owner_id).first()
    if not db_script:
        return False

    ensure_folder_tree(db, new_owner_id, db_script.folder or "/")
    db_script.ownerId = new_owner_id
    db_script.lastModified = int(time.time() * 1000)
    db.commit()
    return True


def transfer_script_ownership_admin(db: Session, script_id: str, new_owner_id: str):
    db_script = db.query(models.Script).filter(models.Script.id == script_id).first()
    if not db_script:
        return False
    ensure_folder_tree(db, new_owner_id, db_script.folder or "/")
    db_script.ownerId = new_owner_id
    db_script.lastModified = int(time.time() * 1000)
    db.commit()
    return True


def transfer_persona_ownership(db: Session, persona_id: str, new_owner_id: str, current_owner_id: str):
    persona = db.query(models.Persona).filter(models.Persona.id == persona_id, models.Persona.ownerId == current_owner_id).first()
    if not persona:
        return False

    new_owner = db.query(models.User).filter(models.User.id == new_owner_id).first()
    if not new_owner:
        return False

    try:
        persona.ownerId = new_owner_id
        persona.updatedAt = int(time.time() * 1000)

        folder_rows = db.query(models.Script.folder).filter(models.Script.personaId == persona_id).distinct().all()
        ensure_folders_for_owner(db, new_owner_id, [r[0] for r in folder_rows])
        db.query(models.Script).filter(models.Script.personaId == persona_id).update({models.Script.ownerId: new_owner_id})

        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"Persona transfer failed: {e}")
        return False


def transfer_persona_ownership_admin(db: Session, persona_id: str, new_owner_id: str):
    persona = db.query(models.Persona).filter(models.Persona.id == persona_id).first()
    if not persona:
        return False

    new_owner = db.query(models.User).filter(models.User.id == new_owner_id).first()
    if not new_owner:
        return False

    try:
        persona.ownerId = new_owner_id
        persona.updatedAt = int(time.time() * 1000)
        folder_rows = db.query(models.Script.folder).filter(models.Script.personaId == persona_id).distinct().all()
        ensure_folders_for_owner(db, new_owner_id, [r[0] for r in folder_rows])
        db.query(models.Script).filter(models.Script.personaId == persona_id).update({models.Script.ownerId: new_owner_id})
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"Persona transfer failed: {e}")
        return False


__all__ = [
    "transfer_organization",
    "transfer_organization_admin",
    "transfer_script_ownership",
    "transfer_script_ownership_admin",
    "transfer_persona_ownership",
    "transfer_persona_ownership_admin",
]
