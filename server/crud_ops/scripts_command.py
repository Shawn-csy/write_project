from typing import List
import time
import uuid

from sqlalchemy import or_
from sqlalchemy.orm import Session

import models
import schemas
from media_crop import normalize_media_with_crop
from .common import touch_parent_folders
from .publish_state import refresh_script_publish_state
from .scripts_query import get_script

VALID_COMMERCIAL = {"allow", "disallow"}
VALID_DERIVATIVE = {"allow", "disallow", "limited"}
VALID_NOTIFY = {"required", "not_required"}


def _norm_key(key: str) -> str:
    return str(key or "").strip().lower().replace(" ", "")


def _norm_choice(value, allowed):
    raw = str(value or "").strip().lower()
    return raw if raw in allowed else ""


def _normalize_custom_metadata(entries):
    if not isinstance(entries, list):
        return []
    normalized = []
    for item in entries:
        if not isinstance(item, dict):
            continue
        key = str(item.get("key") or "").strip()
        if not key:
            continue
        normalized.append(
            {
                "key": key,
                "value": str(item.get("value") or ""),
                "type": "divider" if str(item.get("type") or "").strip().lower() == "divider" else "text",
            }
        )
    return normalized


def _resolve_license_fields(update_data):
    if "licenseCommercial" in update_data:
        update_data["licenseCommercial"] = _norm_choice(update_data.get("licenseCommercial"), VALID_COMMERCIAL)
    if "licenseDerivative" in update_data:
        update_data["licenseDerivative"] = _norm_choice(update_data.get("licenseDerivative"), VALID_DERIVATIVE)
    if "licenseNotify" in update_data:
        update_data["licenseNotify"] = _norm_choice(update_data.get("licenseNotify"), VALID_NOTIFY)

    if "customMetadata" not in update_data:
        return

    custom = _normalize_custom_metadata(update_data.get("customMetadata"))
    update_data["customMetadata"] = custom
    meta_map = {_norm_key(item.get("key")): str(item.get("value") or "") for item in custom}

    if not update_data.get("licenseCommercial"):
        update_data["licenseCommercial"] = _norm_choice(meta_map.get("licensecommercial"), VALID_COMMERCIAL)
    if not update_data.get("licenseDerivative"):
        update_data["licenseDerivative"] = _norm_choice(meta_map.get("licensederivative"), VALID_DERIVATIVE)
    if not update_data.get("licenseNotify"):
        update_data["licenseNotify"] = _norm_choice(meta_map.get("licensenotify"), VALID_NOTIFY)



def _folder_descendants_filter(folder_path: str):
    # Match exactly `/a/b` and descendants like `/a/b/...`; avoid prefix collisions (`/a/b2`).
    escaped = str(folder_path or "").replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return or_(
        models.Script.folder == folder_path,
        models.Script.folder.like(f"{escaped}/%", escape="\\"),
    )


def create_script(db: Session, script: schemas.ScriptCreate, ownerId: str):
    seed_license = {
        "licenseCommercial": _norm_choice(script.licenseCommercial, VALID_COMMERCIAL),
        "licenseDerivative": _norm_choice(script.licenseDerivative, VALID_DERIVATIVE),
        "licenseNotify": _norm_choice(script.licenseNotify, VALID_NOTIFY),
        "customMetadata": _normalize_custom_metadata(script.customMetadata or []),
    }
    for _col, _val in (
        ("synopsis", script.synopsis),
        ("outline", script.outline),
        ("activityName", script.activityName),
        ("activityBannerUrl", script.activityBannerUrl),
        ("activityContent", script.activityContent),
        ("activityWorkUrl", script.activityWorkUrl),
        ("activityDemoLinks", script.activityDemoLinks),
    ):
        if _val is not None:
            seed_license[_col] = _val
    _resolve_license_fields(seed_license)

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

    cover_url, cover_crop = normalize_media_with_crop(script.coverUrl or "", script.coverCrop)

    db_script = models.Script(
        id=str(uuid.uuid4()),
        ownerId=ownerId,
        title=script.title or "Untitled",
        content=script.content or "",
        customMetadata=seed_license.get("customMetadata", []),
        type=script.type,
        folder=script.folder or "/",
        author=script.author or "",
        draftDate=script.draftDate or "",
        isPublic=1 if script.isPublic else 0,
        markerThemeId=script.markerThemeId,
        personaId=script.personaId or None,
        seriesId=script.seriesId,
        seriesOrder=script.seriesOrder,
        licenseCommercial=seed_license.get("licenseCommercial", ""),
        licenseDerivative=seed_license.get("licenseDerivative", ""),
        licenseNotify=seed_license.get("licenseNotify", ""),
        synopsis=seed_license.get("synopsis"),
        outline=seed_license.get("outline"),
        activityName=seed_license.get("activityName"),
        activityBannerUrl=seed_license.get("activityBannerUrl"),
        activityContent=seed_license.get("activityContent"),
        activityWorkUrl=seed_license.get("activityWorkUrl"),
        activityDemoLinks=seed_license.get("activityDemoLinks"),
        coverUrl=cover_url,
        coverCrop=cover_crop,
        coverDesign=script.coverDesign,
    )
    max_order = (
        db.query(models.Script)
        .filter(models.Script.ownerId == ownerId, models.Script.folder == script.folder)
        .order_by(models.Script.sortOrder.desc())
        .first()
    )
    db_script.sortOrder = max_order.sortOrder + 1000.0 if max_order else 0.0

    db.add(db_script)
    db.flush()
    refresh_script_publish_state(db, db_script)
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
            .filter(models.Script.ownerId == ownerId, _folder_descendants_filter(old_path_prefix))
            .all()
        )
        for child in children:
            child.folder = new_path_prefix + child.folder[len(old_path_prefix):]

    update_data = script.model_dump(exclude_unset=True)
    if "customMetadata" in update_data:
        update_data["customMetadata"] = _normalize_custom_metadata(update_data.get("customMetadata"))
    if "coverUrl" in update_data or "coverCrop" in update_data:
        cover_url, cover_crop = normalize_media_with_crop(
            update_data.pop("coverUrl", db_script.coverUrl),
            update_data.pop("coverCrop", db_script.coverCrop),
        )
        update_data["coverUrl"] = cover_url
        update_data["coverCrop"] = cover_crop
    if "personaId" in update_data and not str(update_data.get("personaId") or "").strip():
        update_data["personaId"] = None
    if "organizationId" in update_data and not str(update_data.get("organizationId") or "").strip():
        update_data["organizationId"] = None
    if "markerThemeId" in update_data:
        theme_id = str(update_data.get("markerThemeId") or "").strip()
        if theme_id:
            exists = db.query(models.MarkerTheme).filter(models.MarkerTheme.id == theme_id).first()
            update_data["markerThemeId"] = theme_id if exists else None
        else:
            update_data["markerThemeId"] = None
    _resolve_license_fields(update_data)
    if "seriesId" in update_data:
        new_series_id = update_data.get("seriesId")
        if new_series_id:
            series = db.query(models.Series).filter(models.Series.id == new_series_id, models.Series.ownerId == ownerId).first()
            if not series:
                update_data["seriesId"] = None
                update_data["seriesOrder"] = None
        else:
            update_data["seriesOrder"] = None
    # Sync isPublic from status if status is being updated
    if "status" in update_data and "isPublic" not in update_data:
        update_data["isPublic"] = 1 if update_data["status"] == "Public" else 0

    for key, value in update_data.items():
        if key == "isPublic":
            setattr(db_script, key, 1 if value else 0)
        else:
            setattr(db_script, key, value)

    db_script.lastModified = int(time.time() * 1000)
    refresh_script_publish_state(db, db_script)
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
            _folder_descendants_filter(folder_path),
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


def toggle_script_like(db: Session, script_id: str, *, user_id: str = None, visitor_id: str = None):
    """Toggle like for a script. One like per user/visitor."""
    if not user_id and not visitor_id:
        return None

    script = db.query(models.Script).filter(models.Script.id == script_id).first()
    if not script:
        return None

    q = db.query(models.ScriptLike).filter(models.ScriptLike.scriptId == script_id)
    if user_id:
        q = q.filter(models.ScriptLike.userId == user_id)
    else:
        q = q.filter(models.ScriptLike.visitorId == visitor_id)

    existing = q.first()
    if existing:
        db.delete(existing)
        db.query(models.Script).filter(models.Script.id == script_id).update(
            {models.Script.likes: models.Script.likes - 1}
        )
        db.commit()
        db.refresh(script)
        return False, max(0, script.likes or 0)

    like = models.ScriptLike(
        id=str(uuid.uuid4()),
        scriptId=script_id,
        userId=user_id if user_id else None,
        visitorId=visitor_id if not user_id else None,
    )
    db.add(like)
    db.query(models.Script).filter(models.Script.id == script_id).update(
        {models.Script.likes: models.Script.likes + 1}
    )
    db.commit()
    db.refresh(script)
    return True, script.likes or 0


def get_script_like_status(db: Session, script_id: str, *, user_id: str = None, visitor_id: str = None) -> bool:
    """Return whether the given user/visitor has liked the script."""
    if not user_id and not visitor_id:
        return False
    q = db.query(models.ScriptLike).filter(models.ScriptLike.scriptId == script_id)
    if user_id:
        q = q.filter(models.ScriptLike.userId == user_id)
    else:
        q = q.filter(models.ScriptLike.visitorId == visitor_id)
    return q.first() is not None




__all__ = [
    "create_script",
    "update_script",
    "delete_script",
    "reorder_scripts",
    "increment_script_view",
    "toggle_script_like",
    "get_script_like_status",
]
