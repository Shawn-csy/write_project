from sqlalchemy.orm import Session

import models
import schemas
from .publish_state import refresh_script_publish_state


def get_tags(db: Session, ownerId: str):
    return db.query(models.Tag).filter(models.Tag.ownerId == ownerId).all()


def create_tag(db: Session, tag: schemas.TagCreate, ownerId: str):
    db_tag = models.Tag(ownerId=ownerId, name=tag.name, color=tag.color)
    db.add(db_tag)
    try:
        db.commit()
        db.refresh(db_tag)
        return db_tag
    except Exception:
        db.rollback()
        return None


def delete_tag(db: Session, tag_id: int, ownerId: str):
    script_ids = [
        row.scriptId
        for row in db.query(models.ScriptTag.scriptId)
        .join(models.Script, models.Script.id == models.ScriptTag.scriptId)
        .filter(models.ScriptTag.tagId == tag_id, models.Script.ownerId == ownerId)
        .all()
    ]
    db.query(models.Tag).filter(models.Tag.id == tag_id, models.Tag.ownerId == ownerId).delete()
    db.flush()
    for script_id in script_ids:
        script = db.query(models.Script).filter(models.Script.id == script_id).first()
        if script:
            refresh_script_publish_state(db, script)
    db.commit()


def add_tag_to_script(db: Session, script_id: str, tag_id: int):
    existing = (
        db.query(models.ScriptTag)
        .filter(models.ScriptTag.scriptId == script_id, models.ScriptTag.tagId == tag_id)
        .first()
    )
    if existing:
        script = db.query(models.Script).filter(models.Script.id == script_id).first()
        if script:
            refresh_script_publish_state(db, script)
            db.commit()
        return True

    link = models.ScriptTag(scriptId=script_id, tagId=tag_id)
    db.add(link)
    try:
        db.flush()
        script = db.query(models.Script).filter(models.Script.id == script_id).first()
        if script:
            refresh_script_publish_state(db, script)
        db.commit()
        return True
    except Exception:
        db.rollback()
        return False


def remove_tag_from_script(db: Session, script_id: str, tag_id: int):
    db.query(models.ScriptTag).filter(models.ScriptTag.scriptId == script_id, models.ScriptTag.tagId == tag_id).delete()
    db.flush()
    script = db.query(models.Script).filter(models.Script.id == script_id).first()
    if script:
        refresh_script_publish_state(db, script)
    db.commit()


__all__ = [
    "get_tags",
    "create_tag",
    "delete_tag",
    "add_tag_to_script",
    "remove_tag_from_script",
]
