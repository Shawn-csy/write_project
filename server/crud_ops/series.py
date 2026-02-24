import re
import time
import uuid
from typing import Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

import models
import schemas


def _slugify(name: str) -> str:
    normalized = re.sub(r"\s+", "-", (name or "").strip().lower())
    normalized = re.sub(r"[^a-z0-9\-\u4e00-\u9fff]+", "", normalized)
    normalized = re.sub(r"-{2,}", "-", normalized).strip("-")
    return normalized or "series"


def _ensure_unique_slug(db: Session, owner_id: str, base_slug: str, exclude_id: Optional[str] = None) -> str:
    candidate = base_slug
    idx = 2
    while True:
        q = db.query(models.Series).filter(models.Series.ownerId == owner_id, models.Series.slug == candidate)
        if exclude_id:
            q = q.filter(models.Series.id != exclude_id)
        existing = q.first()
        if not existing:
            return candidate
        candidate = f"{base_slug}-{idx}"
        idx += 1


def get_series(db: Session, owner_id: str):
    rows = (
        db.query(models.Series, func.count(models.Script.id).label("scriptCount"))
        .outerjoin(models.Script, models.Script.seriesId == models.Series.id)
        .filter(models.Series.ownerId == owner_id)
        .group_by(models.Series.id)
        .order_by(models.Series.updatedAt.desc())
        .all()
    )
    out = []
    for series, count in rows:
        series.scriptCount = count or 0
        out.append(series)
    return out


def get_series_by_id(db: Session, series_id: str, owner_id: str):
    return db.query(models.Series).filter(models.Series.id == series_id, models.Series.ownerId == owner_id).first()


def create_series(db: Session, payload: schemas.SeriesCreate, owner_id: str):
    now = int(time.time() * 1000)
    base_slug = _slugify(payload.name)
    slug = _ensure_unique_slug(db, owner_id, base_slug)
    db_series = models.Series(
        id=str(uuid.uuid4()),
        ownerId=owner_id,
        name=payload.name.strip(),
        slug=slug,
        summary=(payload.summary or "").strip(),
        coverUrl=(payload.coverUrl or "").strip(),
        createdAt=now,
        updatedAt=now,
    )
    db.add(db_series)
    db.commit()
    db.refresh(db_series)
    db_series.scriptCount = 0
    return db_series


def update_series(db: Session, series_id: str, payload: schemas.SeriesUpdate, owner_id: str):
    db_series = get_series_by_id(db, series_id, owner_id)
    if not db_series:
        return None
    updates = payload.model_dump(exclude_unset=True)
    if "name" in updates and updates["name"] is not None:
        new_name = updates["name"].strip()
        if new_name:
            db_series.name = new_name
            db_series.slug = _ensure_unique_slug(db, owner_id, _slugify(new_name), exclude_id=series_id)
    if "summary" in updates and updates["summary"] is not None:
        db_series.summary = updates["summary"].strip()
    if "coverUrl" in updates and updates["coverUrl"] is not None:
        db_series.coverUrl = updates["coverUrl"].strip()
    db_series.updatedAt = int(time.time() * 1000)
    db.commit()
    db.refresh(db_series)
    db_series.scriptCount = db.query(models.Script).filter(models.Script.seriesId == db_series.id).count()
    return db_series


def delete_series(db: Session, series_id: str, owner_id: str):
    db_series = get_series_by_id(db, series_id, owner_id)
    if not db_series:
        return False
    db.query(models.Script).filter(models.Script.seriesId == db_series.id, models.Script.ownerId == owner_id).update(
        {models.Script.seriesId: None, models.Script.seriesOrder: None},
        synchronize_session=False,
    )
    db.delete(db_series)
    db.commit()
    return True


__all__ = [
    "get_series",
    "get_series_by_id",
    "create_series",
    "update_series",
    "delete_series",
]
