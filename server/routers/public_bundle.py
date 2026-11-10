import time
import hashlib
from collections import OrderedDict
from concurrent.futures import Future
from threading import Lock
from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session
import crud_ops as crud
import models
import schemas
from dependencies import get_db
from routers import public as public_router
from routers.external_public_scripts import get_published_external_public_scripts
from utils import normalize_homepage_banner_value

router = APIRouter(prefix="/api", tags=["public"])

HOMEPAGE_BANNER_SETTING_KEY = "homepage_banner"
DEMO_BANNER_SETTING_KEY = "demo_page_banner"

# Per-section-set cache. A narrow page request never builds unrelated domains.
_bundle_cache: OrderedDict[tuple[str, ...], tuple[bytes, float]] | None = None
_bundle_cache_lock = Lock()
_bundle_inflight: dict[tuple[str, ...], Future[tuple[bytes, float] | None]] = {}
_bundle_generation = 0
_BUNDLE_TTL = 60  # seconds
_MAX_CACHED_BUNDLES = 16
_BUNDLE_SECTIONS = frozenset({
    "scripts", "personas", "organizations", "topTags", "banner", "demoBanner",
    "externalPublicScripts", "demoSubmissions", "audioWorks", "activityPages", "productionResources",
})
_RESOURCE_CREDIT_ALIASES = {
    ("post_production", "TAKA"): "Taka",
    ("post_production", "韾笙重工(他卡)"): "韾笙重工",
    ("post_production", "韾笙重工(鍋子)"): "韾笙重工",
    ("post_production", "韾笙重工（他卡）"): "韾笙重工",
    ("post_production", "韾笙重工（鍋子）"): "韾笙重工",
    ("cover_art", "雨宮luky"): "雨宮ルキ",
    ("cover_art", "キャロット(蘿蔔)"): "キャロット（蘿蔔）",
}


def _parse_bundle_sections(value: str | None) -> tuple[str, ...] | None:
    if value is None:
        return None
    sections = value.split(",")
    if not sections or len(sections) > len(_BUNDLE_SECTIONS) or len(set(sections)) != len(sections):
        raise HTTPException(status_code=400, detail="Invalid public bundle sections")
    if any(section not in _BUNDLE_SECTIONS for section in sections):
        raise HTTPException(status_code=400, detail="Invalid public bundle sections")
    return tuple(sorted(sections))


def _serialize_bundle_script(script):
    required = (
        "id",
        "ownerId",
        "title",
        "content",
        "createdAt",
        "lastModified",
        "isPublic",
        "type",
        "folder",
        "sortOrder",
    )
    if not all(hasattr(script, key) for key in required):
        # Keep lightweight stubs used in tests for topTags calculation.
        return script

    data = schemas.Script.model_validate(script).model_dump()
    content = data.pop("content", None)
    owner = data.get("owner") or {}
    if owner:
        owner["email"] = None
        data["owner"] = owner
    # contentLength is not a DB column; compute from content so gallery cards can show duration estimate
    data["contentLength"] = getattr(script, "contentLength", None) or len(content or "")
    return data


def _get_banner(db: Session) -> dict:
    row = db.query(models.SiteSetting).filter(models.SiteSetting.key == HOMEPAGE_BANNER_SETTING_KEY).first()
    if not row or not str(getattr(row, "value", "") or "").strip():
        return {"items": []}
    return normalize_homepage_banner_value(row.value)


def _get_demo_banner(db: Session) -> dict:
    row = db.query(models.SiteSetting).filter(models.SiteSetting.key == DEMO_BANNER_SETTING_KEY).first()
    if not row or not str(getattr(row, "value", "") or "").strip():
        return {"items": []}
    return normalize_homepage_banner_value(row.value)


def invalidate_public_bundle_cache() -> None:
    global _bundle_cache, _bundle_generation
    with _bundle_cache_lock:
        _bundle_cache = None
        _bundle_generation += 1
        _bundle_inflight.clear()


def _get_approved_demo_submissions(db: Session) -> list[dict]:
    rows = (
        db.query(models.PublicDemoSubmission)
        .filter(models.PublicDemoSubmission.status == "approved")
        .order_by(models.PublicDemoSubmission.createdAt.desc())
        .limit(1000)
        .all()
    )
    return [
        {
            "id": row.id,
            "scriptType": row.scriptType,
            "scriptId": row.scriptId,
            "externalScriptId": row.externalScriptId,
            "scriptTitle": row.scriptTitle,
            "scriptUrl": row.scriptUrl,
            "demoName": row.demoName,
            "demoUrl": row.demoUrl,
            "coverUrl": row.coverUrl or "",
            "cast": row.cast,
            "voiceTypes": row.voiceTypes or [],
            "voiceActorIds": row.voiceActorIds or [],
            "manualVoiceActors": row.manualVoiceActors or [],
            "description": row.description,
            "displayName": row.displayName,
            "createdAt": row.createdAt,
        }
        for row in rows
    ]


def _get_approved_audio_work_submissions(db: Session) -> list[dict]:
    rows = (
        db.query(models.PublicAudioWorkSubmission)
        .filter(models.PublicAudioWorkSubmission.status == "approved")
        .order_by(models.PublicAudioWorkSubmission.createdAt.desc())
        .limit(1000)
        .all()
    )
    actor_ids = {actor_id for row in rows for actor_id in (row.voiceActorIds or [])}
    actors = {actor.id: actor for actor in db.query(models.Persona).filter(models.Persona.id.in_(actor_ids)).all()} if actor_ids else {}
    credits_by_work: dict[str, list[dict]] = {row.id: [] for row in rows}
    if credits_by_work:
        credits = db.query(models.AudioWorkCredit).filter(
            models.AudioWorkCredit.audioWorkId.in_(credits_by_work)
        ).order_by(models.AudioWorkCredit.role, models.AudioWorkCredit.creditedAs).all()
        for credit in credits:
            credits_by_work[credit.audioWorkId].append({
                "role": credit.role,
                "sourceRole": credit.sourceRole,
                "creditedAs": credit.creditedAs,
                "provenance": credit.provenance,
                "sourceUrl": credit.sourceUrl,
            })
    return [
        {
            "id": row.id,
            "title": row.title,
            "url": row.url,
            "coverUrl": row.coverUrl or "",
            "description": row.description or "",
            "creatorName": row.creatorName or "",
            "creatorUrl": row.creatorUrl or "",
            "organizationId": row.organizationId,
            "voiceActors": [
                {"id": actor_id, "name": actors[actor_id].displayName}
                for actor_id in (row.voiceActorIds or []) if actor_id in actors and not actors[actor_id].voiceActorHidden
            ],
            "credits": credits_by_work[row.id],
            "accessType": row.accessType or "paid",
            "publishedAt": row.publishedAt,
            "createdAt": row.createdAt,
        }
        for row in rows
    ]


def _get_published_activity_pages(db: Session) -> list[dict]:
    rows = (
        db.query(models.ActivityPage)
        .filter(models.ActivityPage.status == "published")
        .order_by(models.ActivityPage.sortOrder, models.ActivityPage.publishedAt.desc())
        .all()
    )
    return [
        {
            "id": row.id,
            "slug": row.slug,
            "title": row.title,
            "summary": row.summary or "",
            "coverUrl": row.coverUrl or "",
            "coverCrop": row.coverCrop,
            "body": row.body or "",
            "scriptIds": row.scriptIds if isinstance(row.scriptIds, list) else [],
            "externalScriptIds": row.externalScriptIds if isinstance(row.externalScriptIds, list) else [],
            "acceptingSubmissions": bool(row.acceptingSubmissions),
            "status": row.status,
            "sortOrder": row.sortOrder or 0,
            "publishedAt": row.publishedAt,
        }
        for row in rows
    ]


@router.get("/public-activity-status")
def public_activity_status(db: Session = Depends(get_db)):
    has_published_activities = db.query(models.ActivityPage.id).filter(
        models.ActivityPage.status == "published"
    ).first() is not None
    return JSONResponse(
        content={"hasPublishedActivities": has_published_activities},
        headers={"Cache-Control": "public, max-age=60, stale-while-revalidate=120"},
    )


@router.get("/public-external-scripts/{item_id}/cover")
def public_external_script_cover(item_id: str, db: Session = Depends(get_db)):
    if len(item_id) > 200:
        raise HTTPException(status_code=404, detail="External cover not found")
    row = (
        db.query(models.ExternalPublicScript.coverUrlOverride, models.ExternalPublicScript.remoteCoverUrl)
        .filter(models.ExternalPublicScript.id == item_id, models.ExternalPublicScript.status == "published")
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="External cover not found")
    return JSONResponse(
        content={"coverUrl": str(row.coverUrlOverride or row.remoteCoverUrl or "").strip()},
        headers={"Cache-Control": "public, max-age=300"},
    )


def _build_bundle_sections(db: Session, requested: frozenset[str]) -> dict:
    result = {}
    scripts = None
    if requested.intersection({"scripts", "topTags"}):
        scripts = [public_router.sanitize_public_script(s) for s in crud.get_public_scripts(db)]
    if "scripts" in requested:
        result["scripts"] = [_serialize_bundle_script(s) for s in scripts]
    if "topTags" in requested:
        tag_scores: dict[str, int] = {}
        for script in scripts:
            views = getattr(script, "views", 0) or 0
            tags = getattr(script, "tags", []) or []
            for tag in tags:
                name = getattr(tag, "name", None) or (tag if isinstance(tag, str) else None)
                if name:
                    tag_scores[name] = tag_scores.get(name, 0) + (views if views > 0 else 1)
        result["topTags"] = [name for name, _ in sorted(tag_scores.items(), key=lambda kv: kv[1], reverse=True)[:5]]
    if "personas" in requested:
        result["personas"] = public_router.list_public_personas(db)
    if "organizations" in requested:
        result["organizations"] = public_router.list_public_organizations(db)
    if "banner" in requested:
        result["banner"] = _get_banner(db)
    if "demoBanner" in requested:
        result["demoBanner"] = _get_demo_banner(db)
    if "externalPublicScripts" in requested:
        result["externalPublicScripts"] = get_published_external_public_scripts(db)
    if "demoSubmissions" in requested:
        result["demoSubmissions"] = _get_approved_demo_submissions(db)
    if "audioWorks" in requested:
        result["audioWorks"] = _get_approved_audio_work_submissions(db)
    if "productionResources" in requested:
        rows = db.query(models.ProductionResource).filter(
            models.ProductionResource.status == "published"
        ).order_by(models.ProductionResource.name).all()
        resource_ids = [row.id for row in rows]
        work_credits: dict[str, list[dict]] = {resource_id: [] for resource_id in resource_ids}
        if resource_ids:
            credits = db.query(models.ProductionResourceCredit, models.PublicAudioWorkSubmission).join(
                models.PublicAudioWorkSubmission,
                models.PublicAudioWorkSubmission.id == models.ProductionResourceCredit.audioWorkId,
            ).filter(
                models.ProductionResourceCredit.resourceId.in_(resource_ids),
                models.PublicAudioWorkSubmission.status == "approved",
            ).order_by(models.PublicAudioWorkSubmission.publishedAt.desc(), models.PublicAudioWorkSubmission.createdAt.desc()).all()
            for credit, work in credits:
                work_credits[credit.resourceId].append({
                    "id": work.id,
                    "title": work.title,
                    "url": work.url,
                    "coverUrl": work.coverUrl or "",
                    "creditRole": credit.creditRole,
                    "creditedAs": credit.creditedAs,
                })
        result["productionResources"] = [{
            "id": row.id,
            "name": row.name,
            "categories": row.categories or [],
            "summary": row.summary,
            "websiteUrl": row.websiteUrl,
            "sourceUrl": row.sourceUrl,
            "reviewedAt": row.reviewedAt,
            "links": [],
            "works": work_credits[row.id],
        } for row in rows]
        known_names = {(work["creditRole"], work["creditedAs"]) for works in work_credits.values() for work in works}
        credit_rows = db.query(models.AudioWorkCredit, models.PublicAudioWorkSubmission).join(
            models.PublicAudioWorkSubmission,
            models.PublicAudioWorkSubmission.id == models.AudioWorkCredit.audioWorkId,
        ).filter(
            models.AudioWorkCredit.role.in_(("post_production", "cover_art", "recording")),
            models.PublicAudioWorkSubmission.status == "approved",
        ).order_by(models.PublicAudioWorkSubmission.publishedAt.desc(), models.PublicAudioWorkSubmission.createdAt.desc()).all()
        derived: dict[tuple[str, str], dict] = {}
        for credit, work in credit_rows:
            role = "recording_studio" if credit.role == "recording" else credit.role
            raw_key = (role, credit.creditedAs)
            key = (role, _RESOURCE_CREDIT_ALIASES.get(raw_key, credit.creditedAs))
            if raw_key in known_names or key in known_names:
                continue
            if key not in derived:
                digest = hashlib.sha256(f"{role}\0{credit.creditedAs}".encode()).hexdigest()[:16]
                derived[key] = {
                    "id": f"credit-{digest}", "name": credit.creditedAs,
                    "categories": [role], "summary": "", "websiteUrl": "", "sourceUrl": "",
                    "reviewedAt": credit.checkedAt, "kind": "credit", "links": [], "works": [],
                }
            if any(item["id"] == work.id for item in derived[key]["works"]):
                continue
            derived[key]["works"].append({
                "id": work.id, "title": work.title, "url": work.url,
                "coverUrl": work.coverUrl or "", "creditRole": role,
                "creditedAs": credit.creditedAs,
            })
        result["productionResources"].extend(derived.values())
        resource_by_id = {item["id"]: item for item in result["productionResources"]}
        if resource_by_id:
            enrichments = db.query(models.ProductionResourceEnrichment).filter(
                models.ProductionResourceEnrichment.id.in_(resource_by_id)
            ).all()
            for enrichment in enrichments:
                resource_by_id[enrichment.id].update({
                    "profileUrl": enrichment.profileUrl,
                    "profileLabel": enrichment.profileLabel,
                    "avatarUrl": enrichment.avatarUrl,
                    "bio": enrichment.bio,
                    "profileSourceUrl": enrichment.sourceUrl,
                })
            links = db.query(models.ProductionResourceLink).filter(
                models.ProductionResourceLink.resourceId.in_(resource_by_id)
            ).all()
            for link in links:
                resource_by_id[link.resourceId]["links"].append({
                    "label": link.label, "url": link.url,
                })
            overrides = db.query(models.ProductionResourceProfileOverride).filter(
                models.ProductionResourceProfileOverride.id.in_(resource_by_id)
            ).all()
            for override in overrides:
                resource = resource_by_id[override.id]
                profile = override.profile if isinstance(override.profile, dict) else {}
                for field in ("bio", "avatarUrl", "profileUrl", "profileLabel", "links"):
                    if field in profile:
                        resource[field] = profile[field]
                if profile.get("displayName"):
                    resource["name"] = profile["displayName"]
                resource["contributors"] = override.contributors if isinstance(override.contributors, list) else []
    if "activityPages" in requested:
        result["activityPages"] = _get_published_activity_pages(db)
    return jsonable_encoder(result)


def _build_bundle(db: Session) -> dict:
    return _build_bundle_sections(db, _BUNDLE_SECTIONS)


@router.get("/public-bundle")
def public_bundle(db: Session = Depends(get_db), sections: str | None = None):
    global _bundle_cache
    selected = _parse_bundle_sections(sections)
    key = selected if selected is not None else tuple(sorted(_BUNDLE_SECTIONS))
    while True:
        with _bundle_cache_lock:
            if _bundle_cache is None:
                _bundle_cache = OrderedDict()
            cached = _bundle_cache.get(key)
            if cached is not None and time.monotonic() < cached[1]:
                _bundle_cache.move_to_end(key)
                break
            pending = _bundle_inflight.get(key)
            builder = pending is None
            if builder:
                pending = Future()
                _bundle_inflight[key] = pending
                generation = _bundle_generation

        if not builder:
            cached = pending.result()
            if cached is not None:
                break
            continue

        try:
            payload = _build_bundle(db) if selected is None else _build_bundle_sections(db, frozenset(selected))
            built = (JSONResponse(content=payload).body, time.monotonic() + _BUNDLE_TTL)
        except BaseException as error:
            with _bundle_cache_lock:
                if _bundle_inflight.get(key) is pending:
                    del _bundle_inflight[key]
            pending.set_exception(error)
            raise

        with _bundle_cache_lock:
            if _bundle_inflight.get(key) is pending:
                del _bundle_inflight[key]
            if generation == _bundle_generation:
                _bundle_cache[key] = built
                _bundle_cache.move_to_end(key)
                if len(_bundle_cache) > _MAX_CACHED_BUNDLES:
                    _bundle_cache.popitem(last=False)
                cached = built
            else:
                cached = None
        pending.set_result(cached)
        if cached is not None:
            break
    return Response(
        content=cached[0],
        media_type="application/json",
        headers={"Cache-Control": f"public, max-age={_BUNDLE_TTL}, stale-while-revalidate=120"},
    )
