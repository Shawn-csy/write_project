import json
import time

from sqlalchemy import or_
from sqlalchemy.orm import Session

import models
import schemas
from media_crop import normalize_media_with_crop


class HandleConflictError(Exception):
    """Handle 無法套用。`detail` 會原樣回給呼叫端作為 409 訊息。

    先前這裡沒有任何明確檢查：唯一性完全依賴資料庫約束，而 router 是用
    字串比對 "UNIQUE constraint failed" 來辨識衝突 —— 那是 SQLite 的訊息，
    正式站的 Postgres 會回 "duplicate key value violates unique constraint"，
    因此衝突一律落到 500。另一方面「handle 一旦設定就不可變更」的規則是靜默
    忽略並回 200，使用者會以為修改成功。兩者都改為明確的 409。
    """

    def __init__(self, detail: str):
        super().__init__(detail)
        self.detail = detail


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

    if "handle" in update_data:
        new_handle = (update_data.get("handle") or "").strip()
        if new_handle and new_handle != db_user.handle:
            taken_by = (
                db.query(models.User)
                .filter(models.User.handle == new_handle, models.User.id != user_id)
                .first()
            )
            if taken_by:
                raise HandleConflictError("Handle already taken")
            if db_user.handle:
                raise HandleConflictError("Handle cannot be changed once set")

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
    "HandleConflictError",
    "get_user",
    "update_user",
    "search_users",
]
