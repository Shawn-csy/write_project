from typing import Any
import json
import time
import uuid

from sqlalchemy import orm
from sqlalchemy.orm import Session

import models
import schemas

SYSTEM_DEFAULT_THEME_ID = "__system_default_marker_rules__"
SYSTEM_DEFAULT_THEME_NAME = "系統預設標記"


def get_user_themes(db: Session, ownerId: str):
    return db.query(models.MarkerTheme).filter(models.MarkerTheme.ownerId == ownerId).all()


def get_public_themes(db: Session):
    return (
        db.query(models.MarkerTheme)
        .options(orm.joinedload(models.MarkerTheme.owner))
        .filter(models.MarkerTheme.isPublic == True)
        .order_by(models.MarkerTheme.updatedAt.desc())
        .limit(100)
        .all()
    )


def get_system_default_theme(db: Session):
    return db.query(models.MarkerTheme).filter(models.MarkerTheme.id == SYSTEM_DEFAULT_THEME_ID).first()


def get_system_default_configs(db: Session):
    theme = get_system_default_theme(db)
    if not theme:
        return []
    parsed = _parse_theme_configs(theme.configs)
    return parsed if isinstance(parsed, list) else []


def _parse_theme_configs(raw: Any):
    if raw is None:
        return []
    if isinstance(raw, (list, dict)):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            return parsed if isinstance(parsed, (list, dict)) else []
        except Exception:
            return []
    return []


def _serialize_theme_configs(configs: Any) -> str:
    if isinstance(configs, str):
        parsed = _parse_theme_configs(configs)
        return json.dumps(parsed, ensure_ascii=False)
    if isinstance(configs, (list, dict)):
        return json.dumps(configs, ensure_ascii=False)
    return "[]"


def create_theme(db: Session, theme: schemas.MarkerThemeCreate, ownerId: str):
    db_theme = models.MarkerTheme(
        id=theme.id if theme.id else str(uuid.uuid4()),
        ownerId=ownerId,
        name=theme.name,
        configs=_serialize_theme_configs(theme.configs),
        isPublic=theme.isPublic,
        description=theme.description,
    )
    db.add(db_theme)
    db.commit()
    db.refresh(db_theme)
    return db_theme


def update_theme(db: Session, theme_id: str, theme: schemas.MarkerThemeUpdate, ownerId: str):
    db_theme = (
        db.query(models.MarkerTheme)
        .filter(models.MarkerTheme.id == theme_id, models.MarkerTheme.ownerId == ownerId)
        .first()
    )
    if not db_theme:
        return None

    update_data = theme.model_dump(exclude_unset=True)
    if "configs" in update_data:
        update_data["configs"] = _serialize_theme_configs(update_data["configs"])
    for key, value in update_data.items():
        setattr(db_theme, key, value)

    db_theme.updatedAt = int(time.time() * 1000)
    db.commit()
    db.refresh(db_theme)
    return db_theme


def delete_theme(db: Session, theme_id: str, ownerId: str):
    db.query(models.Script).filter(
        models.Script.ownerId == ownerId,
        models.Script.markerThemeId == theme_id,
    ).update({models.Script.markerThemeId: None})

    deleted = db.query(models.MarkerTheme).filter(
        models.MarkerTheme.id == theme_id,
        models.MarkerTheme.ownerId == ownerId,
    ).delete()
    db.commit()
    return deleted > 0


def upsert_system_default_configs(db: Session, configs: Any, ownerId: str):
    serialized = _serialize_theme_configs(configs)
    now_ms = int(time.time() * 1000)
    row = get_system_default_theme(db)
    if row:
        row.configs = serialized
        row.updatedAt = now_ms
        if not row.ownerId:
            row.ownerId = ownerId
        db.commit()
        db.refresh(row)
        return row

    db_theme = models.MarkerTheme(
        id=SYSTEM_DEFAULT_THEME_ID,
        ownerId=ownerId,
        name=SYSTEM_DEFAULT_THEME_NAME,
        configs=serialized,
        isPublic=False,
        description="Global default marker configs managed by super admin.",
        createdAt=now_ms,
        updatedAt=now_ms,
    )
    db.add(db_theme)
    db.commit()
    db.refresh(db_theme)
    return db_theme


__all__ = [
    "SYSTEM_DEFAULT_THEME_ID",
    "SYSTEM_DEFAULT_THEME_NAME",
    "get_user_themes",
    "get_public_themes",
    "get_system_default_theme",
    "get_system_default_configs",
    "_parse_theme_configs",
    "_serialize_theme_configs",
    "create_theme",
    "update_theme",
    "delete_theme",
    "upsert_system_default_configs",
]
