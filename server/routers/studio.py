import json
import time
import uuid
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

import crud_ops as crud
import models
import schemas
from dependencies import get_current_user_id, get_db
from routers import external_public_scripts as external_scripts
from services.external_public_script_metadata import ExternalMetadataError, fetch_external_public_script_metadata, normalize_external_url

router = APIRouter(prefix="/api/studio", tags=["studio"])


@router.get("/bootstrap", response_model=schemas.StudioBootstrapResponse)
def read_studio_bootstrap(
    limit: int = 24,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    return crud.get_studio_bootstrap(db, owner_id, limit=limit)


@router.get("/scripts", response_model=schemas.StudioScriptsResponse)
def read_studio_scripts(
    limit: int = 24,
    offset: int = 0,
    status: str = "all",
    q: str = "",
    sort: str = "updated_desc",
    includeCounts: bool = True,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    return crud.list_studio_scripts(
        db,
        owner_id,
        limit=limit,
        offset=offset,
        status_filter=status,
        search=q,
        sort=sort,
        include_counts=includeCounts,
    )


@router.get("/scripts/{script_id}/publish-context", response_model=schemas.StudioScriptSummary)
def read_studio_publish_context(
    script_id: str,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    item = crud.get_studio_publish_context(db, owner_id, script_id)
    if not item:
        raise HTTPException(status_code=404, detail="Script not found")
    return item


@router.post("/external-public-scripts/preview", response_model=schemas.ExternalPublicScriptPreview)
def preview_studio_external_script(
    payload: schemas.ExternalPublicScriptPreviewRequest,
    owner_id: str = Depends(get_current_user_id),
):
    try:
        source_url = normalize_external_url(payload.sourceUrl)
        return external_scripts._enrich_profile_bios(
            fetch_external_public_script_metadata(source_url),
            payload,
        )
    except ExternalMetadataError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/external-public-scripts", response_model=list[schemas.ExternalPublicScriptResponse])
def list_studio_external_scripts(
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    rows = (
        db.query(models.ExternalPublicScript)
        .filter(models.ExternalPublicScript.ownerId == owner_id)
        .order_by(models.ExternalPublicScript.updatedAt.desc())
        .all()
    )
    return [external_scripts.serialize_external_public_script(row) for row in rows]


@router.post("/external-public-scripts", response_model=schemas.ExternalPublicScriptResponse)
def publish_studio_external_script(
    payload: schemas.ExternalPublicScriptPayload,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    persona_id = str(payload.authorPersonaId or "").strip()
    persona = db.query(models.Persona).filter(
        models.Persona.id == persona_id,
        models.Persona.ownerId == owner_id,
    ).first()
    if not persona:
        raise HTTPException(status_code=400, detail="請選擇自己工作室裡的台本師作者。")

    try:
        source_url = normalize_external_url(payload.sourceUrl)
    except ExternalMetadataError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    duplicate_query = db.query(models.ExternalPublicScript).filter(
        models.ExternalPublicScript.sourceUrl == source_url
    )
    if payload.canonicalUrl:
        duplicate_query = db.query(models.ExternalPublicScript).filter(
            or_(
                models.ExternalPublicScript.sourceUrl == source_url,
                models.ExternalPublicScript.canonicalUrl == payload.canonicalUrl,
            )
        )
    duplicate = duplicate_query.first()
    if duplicate:
        raise HTTPException(status_code=409, detail="這個公開台本已經加入過了。")

    links = persona.links
    if isinstance(links, str):
        try:
            links = json.loads(links)
        except (TypeError, ValueError):
            links = []
    social_url = ""
    if isinstance(links, list):
        social_url = next((str(link.get("url") or "").strip() for link in links if isinstance(link, dict) and str(link.get("url") or "").strip()), "")
    author_url = external_scripts._safe_link_url(social_url or persona.website)
    enriched_payload = payload.model_copy(update={
        "authorName": persona.displayName or "",
        "authorBio": persona.bio or "",
        "authorUrl": author_url,
        "authorAvatarUrl": persona.avatar or "",
        "refreshMetadata": True,
    })
    try:
        metadata = external_scripts._metadata_from_payload(enriched_payload, source_url)
    except HTTPException:
        raise
    except ExternalMetadataError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    canonical_url = str(metadata.get("canonicalUrl") or "").strip()
    if canonical_url and db.query(models.ExternalPublicScript).filter(
        models.ExternalPublicScript.canonicalUrl == canonical_url
    ).first():
        raise HTTPException(status_code=409, detail="這個公開台本已經加入過了。")

    now_ms = int(time.time() * 1000)
    item_id = str(uuid.uuid4())
    source_created_at = external_scripts._metadata_timestamp(metadata.get("sourceCreatedAt"))
    source_modified_at = external_scripts._metadata_timestamp(metadata.get("sourceModifiedAt"))
    generated_cover_url = external_scripts._materialize_cover(
        item_id,
        metadata.get("coverPreviewDataUrl"),
        owner_id,
        payload.titleOverride or metadata.get("remoteTitle", ""),
    )
    item = models.ExternalPublicScript(
        id=item_id,
        ownerId=owner_id,
        sourceUrl=source_url,
        canonicalUrl=canonical_url,
        sourceDomain=str(metadata.get("sourceDomain") or ""),
        sourceName=str(metadata.get("sourceName") or ""),
        authorName=str(persona.displayName or "").strip(),
        authorBio=str(persona.bio or "").strip(),
        authorUrl=author_url,
        authorAvatarUrl=external_scripts._materialize_social_avatar(owner_id, persona.avatar, "作者", author_url),
        remoteTitle=str(metadata.get("remoteTitle") or ""),
        remoteSummary=str(metadata.get("remoteSummary") or ""),
        remoteCoverUrl=generated_cover_url or external_scripts._safe_image_url(metadata.get("remoteCoverUrl")),
        titleOverride=str(payload.titleOverride or "").strip(),
        summaryOverride=str(payload.summaryOverride or "").strip(),
        coverUrlOverride=external_scripts._safe_image_url(payload.coverUrlOverride),
        seriesName=str(payload.seriesName or "").strip(),
        seriesOrder=payload.seriesOrder,
        demoLinks=json.dumps(external_scripts._demo_links([link.model_dump() for link in payload.demoLinks]), ensure_ascii=False),
        categories=external_scripts._categories(payload.categories),
        status="published",
        sortOrder=0,
        lastFetchedAt=now_ms,
        lastFetchError="",
        sourceCreatedAt=source_created_at,
        sourceModifiedAt=source_modified_at,
        createdAt=now_ms,
        mountedAt=source_created_at or now_ms,
        updatedAt=now_ms,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    external_scripts._invalidate_public_bundle_cache()
    external_scripts._queue_external_revalidation(background_tasks, item)
    return external_scripts.serialize_external_public_script(item)


@router.delete("/external-public-scripts/{item_id}")
def delete_studio_external_script(
    item_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_current_user_id),
):
    item = db.query(models.ExternalPublicScript).filter(
        models.ExternalPublicScript.id == item_id,
        models.ExternalPublicScript.ownerId == owner_id,
    ).first()
    if not item:
        raise HTTPException(status_code=404, detail="找不到這筆外部台本，或你沒有刪除權限。")

    previous_public_item = models.ExternalPublicScript(
        id=item.id,
        authorName=item.authorName,
        organizationName=item.organizationName,
        seriesName=item.seriesName,
    )
    external_scripts._remove_materialized_cover(item.id, item.remoteCoverUrl)
    db.delete(item)
    db.commit()
    external_scripts._invalidate_public_bundle_cache()
    external_scripts._queue_external_revalidation(background_tasks, previous_public_item)
    return {"success": True}
