from __future__ import annotations

import base64
import hashlib
import os
import re
import time
import uuid
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

import models
import schemas
from dependencies import get_db, get_external_public_scripts_user_id, is_admin_user
from services.external_public_script_metadata import (
    ExternalMetadataError,
    fetch_external_public_script_metadata,
    fetch_google_drive_file_cover_preview,
    fetch_social_avatar_image,
    fetch_social_avatar_url,
    is_google_drive_file_url,
    is_google_docs_url,
    normalize_external_url,
)


router = APIRouter(prefix="/api/admin/external-public-scripts", tags=["external-public-scripts"])
EXTERNAL_COVER_PREFIX = "/media/external-public-scripts/"
EXTERNAL_COVER_FOLDER = "外部台本封面"
EXTERNAL_AVATAR_FOLDER = "外部台本圖片"
MAX_GENERATED_COVER_BYTES = 2 * 1024 * 1024


def _categories(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    seen: set[str] = set()
    result: list[str] = []
    for item in value:
        for raw_category in re.split(r"[,，、]", str(item or "")):
            category = raw_category.strip()
            if category and category not in seen:
                seen.add(category)
                result.append(category[:80])
    return result[:30]


def _safe_image_url(value: Any) -> str:
    image_url = str(value or "").strip()
    if image_url.startswith("/media/"):
        return image_url[:2000]
    parsed = urlparse(image_url)
    if parsed.scheme in {"http", "https"} and parsed.hostname:
        return image_url[:2000]
    return ""


def _safe_link_url(value: Any) -> str:
    link = str(value or "").strip()
    if link.startswith("/") and not link.startswith("//"):
        return link[:2000]
    parsed = urlparse(link)
    if parsed.scheme in {"http", "https"} and parsed.hostname:
        return link[:2000]
    return ""


def _resolved_avatar_url(explicit: Any, metadata_value: Any, profile_url: Any, current: Any = "") -> str:
    """Keep manual overrides, then metadata/X discovery, then the current value."""

    for value in (explicit, metadata_value):
        resolved = _safe_image_url(value)
        if resolved:
            return resolved
    discovered = _safe_image_url(fetch_social_avatar_url(str(profile_url or "")))
    return discovered or _safe_image_url(current)


def _resolved_refresh_avatar_url(explicit: Any, metadata_value: Any, profile_url: Any, current: Any = "") -> str:
    """Refresh from the profile URL while preserving explicit non-social overrides."""

    explicit_url = _safe_image_url(explicit)
    if explicit_url and not explicit_url.startswith("/media/"):
        host = (urlparse(explicit_url).hostname or "").lower()
        if host != "pbs.twimg.com":
            return explicit_url
    metadata_url = _safe_image_url(metadata_value)
    if metadata_url and not metadata_url.startswith("/media/"):
        return metadata_url
    discovered = _safe_image_url(fetch_social_avatar_url(str(profile_url or "")))
    return discovered or _safe_image_url(current)


def _safe_segment(value: Any, fallback: str = "anon") -> str:
    text = "".join(ch for ch in str(value or "") if ch.isalnum() or ch in ("-", "_"))
    return text or fallback


def _cover_storage_root(owner_id: str = "") -> Path:
    root = Path(os.getenv("MEDIA_STORAGE_ROOT", "/data/media"))
    try:
        root.mkdir(parents=True, exist_ok=True)
    except (PermissionError, OSError):
        root = Path(__file__).resolve().parents[1] / "data" / "media"
        root.mkdir(parents=True, exist_ok=True)
    target = root / _safe_segment(owner_id) / EXTERNAL_COVER_FOLDER if owner_id else root / "external-public-scripts"
    target.mkdir(parents=True, exist_ok=True)
    return target


def _avatar_storage_root(owner_id: str) -> Path:
    root = Path(os.getenv("MEDIA_STORAGE_ROOT", "/data/media"))
    try:
        root.mkdir(parents=True, exist_ok=True)
    except (PermissionError, OSError):
        root = Path(__file__).resolve().parents[1] / "data" / "media"
        root.mkdir(parents=True, exist_ok=True)
    target = root / _safe_segment(owner_id) / EXTERNAL_AVATAR_FOLDER
    target.mkdir(parents=True, exist_ok=True)
    return target


def _safe_filename(value: Any, fallback: str = "外部台本") -> str:
    text = str(value or "").strip()
    cleaned = "".join(ch if (ch.isalnum() or ch in ("-", "_", " ", "(", ")")) else "_" for ch in text)
    return cleaned.strip(" .")[:100] or fallback


def _materialize_cover(item_id: str, data_url: Any, owner_id: str = "", title: Any = "") -> str:
    value = str(data_url or "").strip()
    prefixes = (
        "data:image/webp;base64,",
        "data:image/jpeg;base64,",
    )
    prefix = next((candidate for candidate in prefixes if value.startswith(candidate)), "")
    if not prefix:
        return ""
    try:
        image_bytes = base64.b64decode(value[len(prefix):], validate=True)
    except Exception:
        return ""
    if not image_bytes or len(image_bytes) > MAX_GENERATED_COVER_BYTES:
        return ""
    root = _cover_storage_root(owner_id)
    filename = f"{_safe_filename(title)}-{item_id[:8]}.webp"
    target = root / filename
    temporary = root / f".{item_id}.tmp"
    try:
        temporary.write_bytes(image_bytes)
        os.replace(temporary, target)
    finally:
        if temporary.exists():
            temporary.unlink(missing_ok=True)
    if owner_id:
        return f"/media/{_safe_segment(owner_id)}/{EXTERNAL_COVER_FOLDER}/{filename}"
    return f"{EXTERNAL_COVER_PREFIX}{filename}"


def _remove_materialized_cover(item_id: str, cover_url: Any = "") -> None:
    roots = [_cover_storage_root()]
    path = urlparse(str(cover_url or "")).path
    parts = path.strip("/").split("/")
    if len(parts) == 4 and parts[0] == "media" and parts[2] == EXTERNAL_COVER_FOLDER:
        target = _cover_storage_root(parts[1]) / parts[3]
        if item_id[:8] in target.name and target.suffix.lower() == ".webp":
            target.unlink(missing_ok=True)
    for root in roots:
        for extension in ("webp", "jpg"):
            (root / f"{item_id}.{extension}").unlink(missing_ok=True)


def _is_materialized_cover(value: Any) -> bool:
    text = str(value or "")
    return "/external-public-scripts/" in text or f"/{EXTERNAL_COVER_FOLDER}/" in text


def _materialize_social_avatar(
    owner_id: str,
    image_url: Any,
    role: str,
    profile_url: Any,
    *,
    force: bool = False,
) -> str:
    """Save a discovered X image into the owner's media library."""

    value = _safe_image_url(image_url)
    parsed = urlparse(value)
    if not value or parsed.scheme not in {"http", "https"} or parsed.hostname != "pbs.twimg.com":
        return value
    final_url, image_bytes = fetch_social_avatar_image(value)
    if not image_bytes:
        return value
    extension = Path(urlparse(final_url or value).path).suffix.lower()
    if extension not in {".jpg", ".jpeg", ".png", ".webp"}:
        extension = ".jpg"
    handle = next((part for part in urlparse(str(profile_url or "")).path.split("/") if part), "avatar")
    label = _safe_filename(f"{role}-{handle}", role)
    digest = hashlib.sha1(value.encode("utf-8")).hexdigest()[:12]
    filename = f"{label[:70]}-{digest}{extension}"
    root = _avatar_storage_root(owner_id)
    target = root / filename
    if force or not target.exists():
        temporary = root / f".{filename}.tmp"
        try:
            temporary.write_bytes(image_bytes)
            os.replace(temporary, target)
        finally:
            if temporary.exists():
                temporary.unlink(missing_ok=True)
    return f"/media/{_safe_segment(owner_id)}/{EXTERNAL_AVATAR_FOLDER}/{filename}"


def serialize_external_public_script(item: models.ExternalPublicScript) -> dict[str, Any]:
    remote_title = str(item.remoteTitle or "").strip()
    remote_summary = str(item.remoteSummary or "").strip()
    remote_cover = str(item.remoteCoverUrl or "").strip()
    title_override = str(item.titleOverride or "").strip()
    summary_override = str(item.summaryOverride or "").strip()
    cover_override = str(item.coverUrlOverride or "").strip()
    return {
        "id": item.id,
        "sourceUrl": str(item.sourceUrl or ""),
        "canonicalUrl": str(item.canonicalUrl or ""),
        "sourceDomain": str(item.sourceDomain or ""),
        "sourceName": str(item.sourceName or ""),
        "authorName": str(item.authorName or ""),
        "authorBio": str(item.authorBio or ""),
        "authorUrl": str(item.authorUrl or ""),
        "authorAvatarUrl": str(item.authorAvatarUrl or ""),
        "organizationName": str(item.organizationName or ""),
        "organizationUrl": str(item.organizationUrl or ""),
        "organizationAvatarUrl": str(item.organizationAvatarUrl or ""),
        "remoteTitle": remote_title,
        "remoteSummary": remote_summary,
        "remoteCoverUrl": remote_cover,
        "titleOverride": title_override,
        "summaryOverride": summary_override,
        "coverUrlOverride": cover_override,
        "title": title_override or remote_title or str(item.sourceDomain or "外部公開台本"),
        "summary": summary_override or remote_summary,
        "coverUrl": cover_override or remote_cover,
        "categories": _categories(item.categories),
        "views": int(item.views or 0),
        "status": str(item.status or "draft"),
        "sortOrder": float(item.sortOrder or 0),
        "lastFetchedAt": item.lastFetchedAt,
        "lastFetchError": str(item.lastFetchError or ""),
        "createdAt": int(item.createdAt or 0),
        "mountedAt": int(item.mountedAt or item.createdAt or 0),
        "updatedAt": int(item.updatedAt or 0),
    }


def _require_admin(db: Session, user_id: str) -> None:
    if not is_admin_user(db, user_id):
        raise HTTPException(status_code=403, detail="Not authorized")


def _metadata_from_payload(payload: Any, source_url: str) -> dict[str, Any]:
    # Google Docs and Google Drive PDFs require a fresh export so the first-page cover can be
    # generated server-side. The browser preview intentionally does not carry
    # the image bytes back in the save payload.
    if is_google_docs_url(source_url) or is_google_drive_file_url(source_url):
        try:
            return fetch_external_public_script_metadata(source_url)
        except ExternalMetadataError as exc:
            # Some shared Drive PDFs allow anonymous download but reject the
            # HTML file page for server-side clients.  When an admin supplies
            # a title hint, keep the Drive URL authoritative and fall back to
            # the direct PDF download for the generated first-page cover.
            title_hint = str(
                getattr(payload, "titleOverride", None)
                or getattr(payload, "remoteTitle", None)
                or ""
            ).strip()
            if is_google_drive_file_url(source_url) and title_hint:
                try:
                    cover_preview = fetch_google_drive_file_cover_preview(source_url)
                except ExternalMetadataError:
                    cover_preview = ""
                return {
                    "sourceUrl": source_url,
                    "canonicalUrl": source_url,
                    "sourceDomain": "drive.google.com",
                    "sourceName": str(getattr(payload, "sourceName", None) or "Google Drive").strip(),
                    "authorName": str(getattr(payload, "authorName", None) or "").strip(),
                    "authorBio": str(getattr(payload, "authorBio", None) or "").strip(),
                    "authorUrl": _safe_link_url(getattr(payload, "authorUrl", None)),
                    "authorAvatarUrl": _safe_image_url(getattr(payload, "authorAvatarUrl", None)),
                    "organizationName": str(getattr(payload, "organizationName", None) or "").strip(),
                    "organizationUrl": _safe_link_url(getattr(payload, "organizationUrl", None)),
                    "organizationAvatarUrl": _safe_image_url(getattr(payload, "organizationAvatarUrl", None)),
                    "remoteTitle": title_hint,
                    "remoteSummary": str(
                        getattr(payload, "summaryOverride", None)
                        or getattr(payload, "remoteSummary", None)
                        or ""
                    ).strip(),
                    "remoteCoverUrl": _safe_image_url(getattr(payload, "remoteCoverUrl", None)),
                    "coverPreviewDataUrl": cover_preview,
                }
            raise HTTPException(status_code=400, detail=str(exc)) from exc

    has_snapshot = any(
        str(getattr(payload, field, None) or "").strip()
        for field in (
            "canonicalUrl",
            "sourceDomain",
            "sourceName",
            "authorName",
            "authorBio",
            "authorUrl",
            "organizationName",
            "organizationUrl",
            "remoteTitle",
            "remoteSummary",
            "remoteCoverUrl",
        )
    )
    if not getattr(payload, "refreshMetadata", False) and has_snapshot:
        return {
            "sourceUrl": source_url,
            "canonicalUrl": str(getattr(payload, "canonicalUrl", None) or "").strip(),
            "sourceDomain": str(getattr(payload, "sourceDomain", None) or "").strip(),
            "sourceName": str(getattr(payload, "sourceName", None) or "").strip(),
            "authorName": str(getattr(payload, "authorName", None) or "").strip(),
            "authorBio": str(getattr(payload, "authorBio", None) or "").strip(),
            "authorUrl": _safe_link_url(getattr(payload, "authorUrl", None)),
            "authorAvatarUrl": _safe_image_url(getattr(payload, "authorAvatarUrl", None)),
            "organizationName": str(getattr(payload, "organizationName", None) or "").strip(),
            "organizationUrl": _safe_link_url(getattr(payload, "organizationUrl", None)),
            "organizationAvatarUrl": _safe_image_url(getattr(payload, "organizationAvatarUrl", None)),
            "remoteTitle": str(getattr(payload, "remoteTitle", None) or "").strip(),
            "remoteSummary": str(getattr(payload, "remoteSummary", None) or "").strip(),
            "remoteCoverUrl": _safe_image_url(getattr(payload, "remoteCoverUrl", None)),
        }
    try:
        return fetch_external_public_script_metadata(source_url)
    except ExternalMetadataError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _invalidate_public_bundle_cache() -> None:
    import routers.public_bundle as public_bundle_router

    public_bundle_router._bundle_cache = None


@router.post("/preview", response_model=schemas.ExternalPublicScriptPreview)
def preview_external_public_script(
    payload: schemas.ExternalPublicScriptPreviewRequest,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_external_public_scripts_user_id),
):
    _require_admin(db, user_id)
    try:
        metadata = fetch_external_public_script_metadata(payload.sourceUrl)
    except ExternalMetadataError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if not metadata.get("authorAvatarUrl") and payload.authorUrl:
        metadata["authorAvatarUrl"] = fetch_social_avatar_url(payload.authorUrl)
    if not metadata.get("organizationAvatarUrl") and payload.organizationUrl:
        metadata["organizationAvatarUrl"] = fetch_social_avatar_url(payload.organizationUrl)
    return metadata


@router.get("", response_model=list[schemas.ExternalPublicScriptResponse])
def list_external_public_scripts(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_external_public_scripts_user_id),
):
    _require_admin(db, user_id)
    rows = (
        db.query(models.ExternalPublicScript)
        .order_by(models.ExternalPublicScript.sortOrder.asc(), models.ExternalPublicScript.updatedAt.desc())
        .all()
    )
    return [serialize_external_public_script(row) for row in rows]


@router.post("", response_model=schemas.ExternalPublicScriptResponse)
def create_external_public_script(
    payload: schemas.ExternalPublicScriptPayload,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_external_public_scripts_user_id),
):
    _require_admin(db, user_id)
    try:
        source_url = normalize_external_url(payload.sourceUrl)
    except ExternalMetadataError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    existing = db.query(models.ExternalPublicScript).filter(
        or_(models.ExternalPublicScript.sourceUrl == source_url, models.ExternalPublicScript.canonicalUrl == payload.canonicalUrl)
    ).first() if payload.canonicalUrl else db.query(models.ExternalPublicScript).filter(
        models.ExternalPublicScript.sourceUrl == source_url
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="這個公開台本已經加入過了。")

    metadata = _metadata_from_payload(payload, source_url)
    duplicate_canonical = metadata["canonicalUrl"] and db.query(models.ExternalPublicScript).filter(
        models.ExternalPublicScript.canonicalUrl == metadata["canonicalUrl"]
    ).first()
    if duplicate_canonical:
        raise HTTPException(status_code=409, detail="這個公開台本已經加入過了。")
    now_ms = int(time.time() * 1000)
    item_id = str(uuid.uuid4())
    generated_cover_url = _materialize_cover(
        item_id,
        metadata.get("coverPreviewDataUrl"),
        user_id,
        payload.titleOverride or metadata.get("remoteTitle", ""),
    )
    author_avatar_url = _resolved_avatar_url(
        payload.authorAvatarUrl,
        metadata.get("authorAvatarUrl"),
        payload.authorUrl if payload.authorUrl is not None else metadata.get("authorUrl", ""),
    )
    organization_avatar_url = _resolved_avatar_url(
        payload.organizationAvatarUrl,
        metadata.get("organizationAvatarUrl"),
        payload.organizationUrl if payload.organizationUrl is not None else metadata.get("organizationUrl", ""),
    )
    item = models.ExternalPublicScript(
        id=item_id,
        sourceUrl=source_url,
        canonicalUrl=metadata["canonicalUrl"],
        sourceDomain=metadata["sourceDomain"],
        sourceName=metadata["sourceName"],
        authorName=str(payload.authorName if payload.authorName is not None else metadata.get("authorName", "") or "").strip(),
        authorBio=str(payload.authorBio if payload.authorBio is not None else metadata.get("authorBio", "") or "").strip(),
        authorUrl=_safe_link_url(payload.authorUrl if payload.authorUrl is not None else metadata.get("authorUrl", "")),
        authorAvatarUrl=_materialize_social_avatar(
            user_id,
            author_avatar_url,
            "作者",
            payload.authorUrl if payload.authorUrl is not None else metadata.get("authorUrl", ""),
        ),
        organizationName=str(payload.organizationName if payload.organizationName is not None else metadata.get("organizationName", "") or "").strip(),
        organizationUrl=_safe_link_url(payload.organizationUrl if payload.organizationUrl is not None else metadata.get("organizationUrl", "")),
        organizationAvatarUrl=_materialize_social_avatar(
            user_id,
            organization_avatar_url,
            "組織",
            payload.organizationUrl if payload.organizationUrl is not None else metadata.get("organizationUrl", ""),
        ),
        remoteTitle=metadata["remoteTitle"],
        remoteSummary=metadata["remoteSummary"],
        remoteCoverUrl=generated_cover_url or _safe_image_url(metadata["remoteCoverUrl"]),
        titleOverride=str(payload.titleOverride or "").strip(),
        summaryOverride=str(payload.summaryOverride or "").strip(),
        coverUrlOverride=_safe_image_url(payload.coverUrlOverride),
        categories=_categories(payload.categories),
        status=payload.status,
        sortOrder=float(payload.sortOrder or 0),
        lastFetchedAt=now_ms,
        lastFetchError="",
        createdAt=now_ms,
        mountedAt=int(payload.mountedAt) if payload.mountedAt is not None else now_ms,
        updatedAt=now_ms,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    _invalidate_public_bundle_cache()
    return serialize_external_public_script(item)


@router.put("/{item_id}", response_model=schemas.ExternalPublicScriptResponse)
def update_external_public_script(
    item_id: str,
    payload: schemas.ExternalPublicScriptUpdate,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_external_public_scripts_user_id),
):
    _require_admin(db, user_id)
    item = db.query(models.ExternalPublicScript).filter(models.ExternalPublicScript.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="External public script not found")

    source_url = item.sourceUrl
    source_changed = payload.sourceUrl is not None and payload.sourceUrl.strip() != item.sourceUrl
    if payload.sourceUrl is not None:
        try:
            source_url = normalize_external_url(payload.sourceUrl)
        except ExternalMetadataError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc
        duplicate = db.query(models.ExternalPublicScript).filter(
            models.ExternalPublicScript.sourceUrl == source_url,
            models.ExternalPublicScript.id != item_id,
        ).first()
        if duplicate:
            raise HTTPException(status_code=409, detail="這個公開台本已經加入過了。")
        item.sourceUrl = source_url

    should_refresh = bool(payload.refreshMetadata or source_changed)
    if should_refresh:
        if source_changed:
            try:
                metadata = fetch_external_public_script_metadata(source_url)
            except ExternalMetadataError as exc:
                raise HTTPException(status_code=400, detail=str(exc)) from exc
        else:
            metadata = _metadata_from_payload(payload, source_url)
        duplicate_canonical = metadata["canonicalUrl"] and db.query(models.ExternalPublicScript).filter(
            models.ExternalPublicScript.canonicalUrl == metadata["canonicalUrl"],
            models.ExternalPublicScript.id != item_id,
        ).first()
        if duplicate_canonical:
            raise HTTPException(status_code=409, detail="這個公開台本已經加入過了。")
        item.canonicalUrl = metadata["canonicalUrl"]
        item.sourceDomain = metadata["sourceDomain"]
        item.sourceName = metadata["sourceName"]
        item.authorName = str(payload.authorName if payload.authorName is not None else metadata.get("authorName", "") or "").strip()
        item.authorBio = str(payload.authorBio if payload.authorBio is not None else metadata.get("authorBio", "") or "").strip()
        item.authorUrl = _safe_link_url(payload.authorUrl if payload.authorUrl is not None else metadata.get("authorUrl", ""))
        item.authorAvatarUrl = _materialize_social_avatar(
            user_id,
            _resolved_refresh_avatar_url(
            payload.authorAvatarUrl,
            metadata.get("authorAvatarUrl"),
            item.authorUrl,
            item.authorAvatarUrl,
            ),
            "作者",
            item.authorUrl,
            force=should_refresh,
        )
        item.organizationName = str(payload.organizationName if payload.organizationName is not None else metadata.get("organizationName", "") or "").strip()
        item.organizationUrl = _safe_link_url(payload.organizationUrl if payload.organizationUrl is not None else metadata.get("organizationUrl", ""))
        item.organizationAvatarUrl = _materialize_social_avatar(
            user_id,
            _resolved_refresh_avatar_url(
            payload.organizationAvatarUrl,
            metadata.get("organizationAvatarUrl"),
            item.organizationUrl,
            item.organizationAvatarUrl,
            ),
            "組織",
            item.organizationUrl,
            force=should_refresh,
        )
        item.remoteTitle = metadata["remoteTitle"]
        item.remoteSummary = metadata["remoteSummary"]
        if _is_materialized_cover(item.remoteCoverUrl):
            _remove_materialized_cover(item.id, item.remoteCoverUrl)
        item.remoteCoverUrl = _materialize_cover(
            item.id,
            metadata.get("coverPreviewDataUrl"),
            user_id,
            payload.titleOverride or item.titleOverride or metadata.get("remoteTitle", ""),
        ) or _safe_image_url(metadata["remoteCoverUrl"])
        item.lastFetchedAt = int(time.time() * 1000)
        item.lastFetchError = ""
    else:
        for attr in ("canonicalUrl", "sourceDomain", "sourceName", "remoteTitle", "remoteSummary", "remoteCoverUrl"):
            value = getattr(payload, attr, None)
            if value is not None:
                setattr(item, attr, _safe_image_url(value) if attr == "remoteCoverUrl" else str(value).strip())

    for attr in ("authorName", "authorBio", "organizationName"):
        value = getattr(payload, attr, None)
        if value is not None:
            setattr(item, attr, str(value).strip())
    for attr in ("authorUrl", "organizationUrl"):
        value = getattr(payload, attr, None)
        if value is not None:
            setattr(item, attr, _safe_link_url(value))
    if not should_refresh:
        for attr in ("authorAvatarUrl", "organizationAvatarUrl"):
            value = getattr(payload, attr, None)
            if value is not None:
                setattr(item, attr, _safe_image_url(value))
    for attr in ("titleOverride", "summaryOverride", "coverUrlOverride"):
        value = getattr(payload, attr, None)
        if value is not None:
            setattr(item, attr, _safe_image_url(value) if attr == "coverUrlOverride" else str(value).strip())
    if payload.categories is not None:
        item.categories = _categories(payload.categories)
    if payload.status is not None:
        item.status = payload.status
    if payload.sortOrder is not None:
        item.sortOrder = float(payload.sortOrder)
    if payload.mountedAt is not None:
        item.mountedAt = int(payload.mountedAt)
    item.updatedAt = int(time.time() * 1000)
    db.commit()
    db.refresh(item)
    _invalidate_public_bundle_cache()
    return serialize_external_public_script(item)


@router.delete("/{item_id}")
def delete_external_public_script(
    item_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_external_public_scripts_user_id),
):
    _require_admin(db, user_id)
    item = db.query(models.ExternalPublicScript).filter(models.ExternalPublicScript.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="External public script not found")
    _remove_materialized_cover(item.id, item.remoteCoverUrl)
    db.delete(item)
    db.commit()
    _invalidate_public_bundle_cache()
    return {"success": True}


def get_published_external_public_scripts(db: Session) -> list[dict[str, Any]]:
    rows = (
        db.query(models.ExternalPublicScript)
        .filter(models.ExternalPublicScript.status == "published")
        .order_by(models.ExternalPublicScript.sortOrder.asc(), models.ExternalPublicScript.updatedAt.desc())
        .all()
    )
    return [serialize_external_public_script(row) for row in rows]
