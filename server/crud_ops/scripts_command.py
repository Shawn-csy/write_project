from typing import List
import time
import uuid

from sqlalchemy.orm import Session

import models
import schemas
from .common import touch_parent_folders
from .scripts_query import get_script


def create_script(db: Session, script: schemas.ScriptCreate, ownerId: str):
    if script.seriesId:
        series = db.query(models.Series).filter(models.Series.id == script.seriesId, models.Series.ownerId == ownerId).first()
        if not series:
            script.seriesId = None
            script.seriesOrder = None

    if script.type == "folder":
        folder_path = script.folder or "/"
        existing = (
            db.query(models.Script)
            .filter(
                models.Script.ownerId == ownerId,
                models.Script.type == "folder",
                models.Script.title == (script.title or "Untitled"),
                models.Script.folder == folder_path,
            )
            .first()
        )
        if existing:
            return existing

    db_script = models.Script(
        id=str(uuid.uuid4()),
        ownerId=ownerId,
        title=script.title or "Untitled",
        content=script.content or "",
        type=script.type,
        folder=script.folder or "/",
        author=script.author or "",
        draftDate=script.draftDate or "",
        isPublic=1 if script.isPublic else 0,
        markerThemeId=script.markerThemeId,
        seriesId=script.seriesId,
        seriesOrder=script.seriesOrder,
    )
    max_order = (
        db.query(models.Script)
        .filter(models.Script.ownerId == ownerId, models.Script.folder == script.folder)
        .order_by(models.Script.sortOrder.desc())
        .first()
    )
    db_script.sortOrder = max_order.sortOrder + 1000.0 if max_order else 0.0

    db.add(db_script)
    db.commit()
    db.refresh(db_script)

    touch_parent_folders(db, db_script.folder, ownerId, int(time.time() * 1000))
    db.commit()

    return db_script


def update_script(db: Session, script_id: str, script: schemas.ScriptUpdate, ownerId: str):
    db_script = get_script(db, script_id, ownerId)
    if not db_script:
        return None

    if script.title and db_script.type == "folder" and db_script.title != script.title:
        old_path_prefix = f"{db_script.folder}/{db_script.title}" if db_script.folder != "/" else f"/{db_script.title}"
        new_path_prefix = f"{db_script.folder}/{script.title}" if db_script.folder != "/" else f"/{script.title}"

        children = (
            db.query(models.Script)
            .filter(models.Script.ownerId == ownerId, models.Script.folder.like(f"{old_path_prefix}%"))
            .all()
        )
        for child in children:
            child.folder = new_path_prefix + child.folder[len(old_path_prefix):]

    update_data = script.model_dump(exclude_unset=True)
    if "seriesId" in update_data:
        new_series_id = update_data.get("seriesId")
        if new_series_id:
            series = db.query(models.Series).filter(models.Series.id == new_series_id, models.Series.ownerId == ownerId).first()
            if not series:
                update_data["seriesId"] = None
                update_data["seriesOrder"] = None
        else:
            update_data["seriesOrder"] = None
    for key, value in update_data.items():
        if key == "isPublic":
            setattr(db_script, key, 1 if value else 0)
        else:
            setattr(db_script, key, value)

    db_script.lastModified = int(time.time() * 1000)
    touch_parent_folders(db, db_script.folder, ownerId, db_script.lastModified)
    db.commit()
    return db_script


def delete_script(db: Session, script_id: str, ownerId: str):
    db_script = get_script(db, script_id, ownerId)
    if not db_script:
        return False

    if db_script.type == "folder":
        folder_path = f"{db_script.folder}/{db_script.title}" if db_script.folder != "/" else f"/{db_script.title}"
        db.query(models.Script).filter(
            models.Script.ownerId == ownerId,
            models.Script.folder.like(f"{folder_path}%"),
        ).delete(synchronize_session=False)

    db.delete(db_script)
    db.commit()
    return True


def reorder_scripts(db: Session, updates: List[schemas.ScriptReorderItem], ownerId: str):
    try:
        for item in updates:
            db.query(models.Script).filter(
                models.Script.id == item.id,
                models.Script.ownerId == ownerId,
            ).update({"sortOrder": item.sortOrder})
        db.commit()
        return True
    except Exception as e:
        db.rollback()
        print(f"Reorder failed: {e}")
        return False


def increment_script_view(db: Session, script_id: str):
    db.query(models.Script).filter(models.Script.id == script_id).update({models.Script.views: models.Script.views + 1})
    db.commit()


def toggle_script_like(db: Session, script_id: str, user_id: str):
    existing = (
        db.query(models.ScriptLike)
        .filter(models.ScriptLike.scriptId == script_id, models.ScriptLike.userId == user_id)
        .first()
    )

    if existing:
        db.delete(existing)
        db.query(models.Script).filter(models.Script.id == script_id).update({models.Script.likes: models.Script.likes - 1})
        db.commit()
        return False

    like = models.ScriptLike(scriptId=script_id, userId=user_id)
    db.add(like)
    db.query(models.Script).filter(models.Script.id == script_id).update({models.Script.likes: models.Script.likes + 1})
    db.commit()
    return True


__all__ = [
    "create_script",
    "update_script",
    "delete_script",
    "reorder_scripts",
    "increment_script_view",
    "toggle_script_like",
]
