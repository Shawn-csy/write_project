from typing import Any, Dict, List, Optional

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

import models
from .common import _ensure_list
from .organizations_query import list_my_invites
from .personas import get_user_personas
from .organizations_query import get_user_organizations
from .publish_state import PUBLISH_READINESS_VALUES, metadata_entries_to_map
from .series import get_series
from .tags import get_tags


def _tag_dict(tag_id: Any, owner_id: str, name: str, color: str) -> Dict[str, Any]:
    return {"id": tag_id, "ownerId": owner_id, "name": name or "", "color": color or "bg-gray-500"}


def _series_dict(row: Any) -> Optional[Dict[str, Any]]:
    if not row.series_id:
        return None
    return {
        "id": row.series_id,
        "name": row.series_name or "",
        "summary": row.series_summary or "",
        "coverUrl": row.series_cover_url or "",
        "coverCrop": row.series_cover_crop,
    }


def _base_script_query(db: Session, owner_id: str):
    return (
        db.query(
            models.Script.id,
            models.Script.ownerId,
            models.Script.title,
            models.Script.customMetadata,
            models.Script.createdAt,
            models.Script.lastModified,
            models.Script.author,
            models.Script.draftDate,
            models.Script.isPublic,
            models.Script.status,
            models.Script.coverUrl,
            models.Script.coverCrop,
            models.Script.coverDesign,
            models.Script.coverIsAiGenerated,
            models.Script.views,
            models.Script.likes,
            models.Script.type,
            models.Script.folder,
            models.Script.sortOrder,
            models.Script.markerThemeId,
            models.Script.disableCopy,
            models.Script.licenseCommercial,
            models.Script.licenseDerivative,
            models.Script.licenseNotify,
            models.Script.personaId,
            models.Script.organizationId,
            models.Script.seriesId,
            models.Script.seriesOrder,
            models.Script.synopsis,
            models.Script.hasPublishIdentity,
            models.Script.metadataSeriesName,
            models.Script.publishReadiness,
            models.Series.id.label("series_id"),
            models.Series.name.label("series_name"),
            models.Series.summary.label("series_summary"),
            models.Series.coverUrl.label("series_cover_url"),
            models.Series.coverCrop.label("series_cover_crop"),
        )
        .outerjoin(models.Series, models.Series.id == models.Script.seriesId)
        .filter(models.Script.ownerId == owner_id)
        .filter(models.Script.type != "folder")
    )


def _load_tags_by_script_id(db: Session, script_ids: List[str]) -> Dict[str, List[Dict[str, Any]]]:
    if not script_ids:
        return {}
    rows = (
        db.query(models.ScriptTag.scriptId, models.Tag.id, models.Tag.ownerId, models.Tag.name, models.Tag.color)
        .join(models.Tag, models.Tag.id == models.ScriptTag.tagId)
        .filter(models.ScriptTag.scriptId.in_(script_ids))
        .all()
    )
    tags_by_script_id: Dict[str, List[Dict[str, Any]]] = {script_id: [] for script_id in script_ids}
    for script_id, tag_id, owner_id, name, color in rows:
        tags_by_script_id.setdefault(script_id, []).append(_tag_dict(tag_id, owner_id, name, color))
    return tags_by_script_id


def _row_to_studio_script(row: Any, tags: List[Dict[str, Any]]) -> Dict[str, Any]:
    meta = metadata_entries_to_map(row.customMetadata)
    publish_as = meta.get("publishas", "")
    return {
        "id": row.id,
        "ownerId": row.ownerId,
        "title": row.title or "",
        "contentLength": 0,
        "createdAt": row.createdAt or 0,
        "lastModified": row.lastModified or 0,
        "author": row.author or "",
        "draftDate": row.draftDate or "",
        "isPublic": 1 if row.isPublic else 0,
        "status": row.status or "Private",
        "coverUrl": row.coverUrl or "",
        "coverCrop": row.coverCrop,
        "coverDesign": row.coverDesign,
        "coverIsAiGenerated": bool(row.coverIsAiGenerated),
        "views": row.views or 0,
        "likes": row.likes or 0,
        "type": row.type or "script",
        "folder": row.folder or "/",
        "sortOrder": row.sortOrder or 0,
        "markerThemeId": row.markerThemeId,
        "tags": tags,
        "disableCopy": bool(row.disableCopy),
        "licenseCommercial": row.licenseCommercial or "",
        "licenseDerivative": row.licenseDerivative or "",
        "licenseNotify": row.licenseNotify or "",
        "personaId": row.personaId,
        "organizationId": row.organizationId,
        "seriesId": row.seriesId,
        "seriesOrder": row.seriesOrder,
        "series": _series_dict(row),
        "synopsis": row.synopsis,
        "hasPublishIdentity": bool(row.hasPublishIdentity or row.personaId or publish_as.startswith("persona:")),
        "metadataSeriesName": row.metadataSeriesName or meta.get("series") or meta.get("seriesname") or "",
        "publishReadiness": row.publishReadiness or "needs_work",
    }


def _apply_search(query, search: str):
    needle = str(search or "").strip()
    if not needle:
        return query
    like = f"%{needle}%"
    return query.filter(
        or_(
            models.Script.title.ilike(like),
            models.Script.author.ilike(like),
            models.Script.synopsis.ilike(like),
            models.Series.name.ilike(like),
        )
    )


def _apply_sort(query, sort: str):
    if sort == "updated_asc":
        return query.order_by(models.Script.lastModified.asc(), models.Script.id.asc())
    if sort == "title_asc":
        return query.order_by(models.Script.title.asc(), models.Script.id.asc())
    if sort == "views_desc":
        return query.order_by(models.Script.views.desc(), models.Script.lastModified.desc(), models.Script.id.asc())
    return query.order_by(models.Script.lastModified.desc(), models.Script.id.asc())


def _base_count_query(db: Session, owner_id: str):
    return (
        db.query(models.Script)
        .outerjoin(models.Series, models.Series.id == models.Script.seriesId)
        .filter(models.Script.ownerId == owner_id)
        .filter(models.Script.type != "folder")
    )


def list_studio_scripts(
    db: Session,
    owner_id: str,
    *,
    limit: int = 24,
    offset: int = 0,
    status_filter: str = "all",
    search: str = "",
    sort: str = "updated_desc",
    include_counts: bool = True,
) -> Dict[str, Any]:
    safe_limit = max(1, min(int(limit or 24), 100))
    safe_offset = max(0, int(offset or 0))
    counts = {"all": 0, "needs_work": 0, "ready": 0, "published": 0}

    page_query = _apply_search(_base_script_query(db, owner_id), search)
    count_query = _apply_search(_base_count_query(db, owner_id), search)
    if status_filter in PUBLISH_READINESS_VALUES:
        page_query = page_query.filter(models.Script.publishReadiness == status_filter)
        count_query = count_query.filter(models.Script.publishReadiness == status_filter)

    if include_counts:
        grouped_rows = (
            _apply_search(
                db.query(models.Script.publishReadiness, func.count(models.Script.id))
                .outerjoin(models.Series, models.Series.id == models.Script.seriesId)
                .filter(models.Script.ownerId == owner_id)
                .filter(models.Script.type != "folder"),
                search,
            )
            .group_by(models.Script.publishReadiness)
            .all()
        )
        for readiness, count in grouped_rows:
            normalized = readiness if readiness in PUBLISH_READINESS_VALUES else "needs_work"
            counts[normalized] += count
        counts["all"] = counts["needs_work"] + counts["ready"] + counts["published"]
        total = counts.get(status_filter, counts["all"]) if status_filter in counts else counts["all"]
    else:
        total = count_query.count()
    page_rows = _apply_sort(page_query, sort).offset(safe_offset).limit(safe_limit).all()
    page_tags = _load_tags_by_script_id(db, [row.id for row in page_rows])
    items = [_row_to_studio_script(row, page_tags.get(row.id, [])) for row in page_rows]
    next_offset = safe_offset + safe_limit if safe_offset + safe_limit < total else None

    return {
        "items": items,
        "total": total,
        "limit": safe_limit,
        "offset": safe_offset,
        "nextOffset": next_offset,
        "counts": counts,
    }


def get_studio_publish_context(db: Session, owner_id: str, script_id: str) -> Optional[Dict[str, Any]]:
    row = _base_script_query(db, owner_id).filter(models.Script.id == script_id).first()
    if not row:
        return None
    tags_by_script_id = _load_tags_by_script_id(db, [row.id])
    return _row_to_studio_script(row, tags_by_script_id.get(row.id, []))


def get_studio_bootstrap(db: Session, owner_id: str, *, limit: int = 24) -> Dict[str, Any]:
    personas = get_user_personas(db, owner_id)
    owned_orgs = get_user_organizations(db, owner_id)
    for persona in personas:
        persona.tags = _ensure_list(persona.tags)
        persona.links = _ensure_list(persona.links)
        persona.defaultLicenseSpecialTerms = _ensure_list(persona.defaultLicenseSpecialTerms)
    seen_org_ids = {org.id for org in owned_orgs if getattr(org, "id", None)}
    extra_org_ids = {
        org_id
        for persona in personas
        for org_id in (persona.organizationIds or [])
        if org_id and org_id not in seen_org_ids
    }
    extra_orgs = []
    if extra_org_ids:
        extra_orgs = db.query(models.Organization).filter(models.Organization.id.in_(list(extra_org_ids))).all()
    return {
        "scripts": list_studio_scripts(db, owner_id, limit=limit, offset=0),
        "personas": personas,
        "organizations": [*owned_orgs, *extra_orgs],
        "tags": get_tags(db, owner_id),
        "series": get_series(db, owner_id),
        "myInvites": list_my_invites(db, owner_id),
    }


__all__ = [
    "get_studio_bootstrap",
    "get_studio_publish_context",
    "list_studio_scripts",
]
