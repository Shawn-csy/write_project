import json
import time

from sqlalchemy import or_
from sqlalchemy.orm import Session

import models
import schemas
from media_crop import normalize_media_with_crop


def get_user(db: Session, user_id: str):
    return db.query(models.User).filter(models.User.id == user_id).first()


def update_user(db: Session, user_id: str, user_update: schemas.UserCreate):
    db_user = get_user(db, user_id)
    if not db_user:
        db_user = models.User(id=user_id)
        db.add(db_user)

    update_data = user_update.model_dump(exclude_unset=True)
    if "settings" in update_data:
        db_user.settings = json.dumps(update_data.pop("settings"))
    if "avatar" in update_data or "avatarCrop" in update_data:
        avatar_url, avatar_crop = normalize_media_with_crop(
            update_data.pop("avatar", db_user.avatar),
            update_data.pop("avatarCrop", db_user.avatarCrop),
        )
        update_data["avatar"] = avatar_url
        update_data["avatarCrop"] = avatar_crop

    for key, value in update_data.items():
        if key == "handle" and db_user.handle:
            continue
        setattr(db_user, key, value)

    db_user.lastLogin = int(time.time() * 1000)
    try:
        db.commit()
    except Exception as e:
        print(f"Error updating user: {e}")
        db.rollback()
        raise e
    return db_user


def search_users(db: Session, query: str):
    normalized = (query or "").strip()
    if not normalized:
        return []

    search = f"%{normalized}%"
    return (
        db.query(models.User)
        .filter(
            or_(
                models.User.handle.ilike(search),
                models.User.displayName.ilike(search),
                models.User.email.ilike(search),
                models.User.id.ilike(search),
            )
        )
        .limit(10)
        .all()
    )


__all__ = [
    "get_user",
    "update_user",
    "search_users",
]
