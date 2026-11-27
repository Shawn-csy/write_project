import time
from collections import OrderedDict, defaultdict
from concurrent.futures import Future
from threading import Lock
from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session
from sqlalchemy import or_
import crud_ops as crud
import models
import schemas
from dependencies import get_db
from routers import public as public_router
from routers.external_public_scripts import get_published_external_public_scripts
from utils import normalize_homepage_banner_value, public_banner_value, seconds_until_taipei_midnight
from services.resource_directory import resource_directory_rows
from services.work_participations import SOURCE_ROLES

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
    "scripts", "personas", "organizations", "topTags", "banner", "demoBanner", "audioWorkBanner",
    "externalPublicScripts", "demoSubmissions", "audioWorks", "activityPages", "productionResources",
})


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
    return public_banner_value(normalize_homepage_banner_value(row.value), "homepage")


def _get_demo_banner(db: Session) -> dict:
    row = db.query(models.SiteSetting).filter(models.SiteSetting.key == DEMO_BANNER_SETTING_KEY).first()
    if not row or not str(getattr(row, "value", "") or "").strip():
        return {"items": []}
    return public_banner_value(normalize_homepage_banner_value(row.value), "demos")


def _get_audio_work_banner(db: Session) -> dict:
    row = db.query(models.SiteSetting).filter(models.SiteSetting.key == "audio_work_banner").first()
    return public_banner_value(normalize_homepage_banner_value(row.value if row else ""), "audio-works")


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
            "voiceActorIds": list(dict.fromkeys([
                *(row.voiceActorIds or []),
                *([row.voiceActorPersonaId] if row.voiceActorPersonaId else []),
            ])),
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
    work_ids = {row.id for row in rows}
    work_ids_by_url: dict[str, set[str]] = defaultdict(set)
    for row in rows:
        work_ids_by_url[row.url].add(row.id)
    linked_credits: dict[tuple[str, str, str], set[str]] = defaultdict(set)
    reviewed_credits: dict[tuple[str, str, str], set[str]] = defaultdict(set)
    linked_personas: dict[str, models.Persona] = {}
    if work_ids:
        reviewed = db.query(models.PersonaCredit).filter(or_(
            models.PersonaCredit.audioWorkId.in_(work_ids),
            models.PersonaCredit.url.in_(list(work_ids_by_url)),
        )).all()
        linked_persona_ids = {credit.personaId for credit in reviewed}
        visible_roles = {(role.personaId, role.role) for role in db.query(models.PersonaRole).filter(
            models.PersonaRole.personaId.in_(linked_persona_ids),
            models.PersonaRole.isVisible.is_(True),
        ).all()} if linked_persona_ids else set()
        linked_personas = {person.id: person for person in db.query(models.Persona).filter(
            models.Persona.id.in_(linked_persona_ids)).all()} if linked_persona_ids else {}
        for credit in reviewed:
            target_ids = ([credit.audioWorkId] if credit.audioWorkId in work_ids else []) if credit.audioWorkId else work_ids_by_url.get(credit.url, set())
            if len(target_ids) != 1:
                continue
            key = (next(iter(target_ids)), credit.role, credit.creditedAs)
            reviewed_credits[key].add(credit.personaId)
            person = linked_personas.get(credit.personaId)
            if (not person or (credit.personaId, credit.role) not in visible_roles
                    or (credit.role == "voice_actor" and person.voiceActorHidden)):
                continue
            linked_credits[key].add(credit.personaId)
    credits_by_work: dict[str, list[dict]] = {row.id: [] for row in rows}
    if credits_by_work:
        credits = db.query(models.AudioWorkCredit).filter(
            models.AudioWorkCredit.audioWorkId.in_(credits_by_work)
        ).order_by(models.AudioWorkCredit.role, models.AudioWorkCredit.creditedAs).all()
        source_provenance = {"official_page", "source_import", "reviewed_participation"}
        source_identities: dict[tuple[str, str, str], set[str]] = defaultdict(set)
        visible_source_identities: dict[tuple[str, str, str], set[str]] = defaultdict(set)
        # For source-only roles, reuse a reviewed identity only when the same work
        # and source explicitly print the same signature under a supported role.
        for credit in credits:
            role = SOURCE_ROLES.get(credit.role)
            if role and credit.provenance in source_provenance and (credit.sourceUrl or "").startswith("https://"):
                key = (credit.audioWorkId, role, credit.creditedAs)
                source_key = (credit.audioWorkId, credit.sourceUrl, credit.creditedAs)
                source_identities[source_key].update(reviewed_credits.get(key, ()))
                visible_source_identities[source_key].update(linked_credits.get(key, ()))
        for credit in credits:
            role = SOURCE_ROLES.get(credit.role)
            identity_ids = linked_credits.get((credit.audioWorkId, role, credit.creditedAs), ()) if role else ()
            if role is None and credit.provenance in source_provenance:
                source_key = (credit.audioWorkId, credit.sourceUrl, credit.creditedAs)
                if len(source_identities.get(source_key, ())) == 1:
                    identity_ids = visible_source_identities[source_key]
            persona = linked_personas.get(next(iter(identity_ids))) if len(identity_ids) == 1 else None
            credits_by_work[credit.audioWorkId].append({
                "role": credit.role,
                "sourceRole": credit.sourceRole,
                "creditedAs": credit.creditedAs,
                "provenance": credit.provenance,
                "sourceUrl": credit.sourceUrl,
                **({"personaId": persona.id} if persona else {}),
                **({"personaAvatar": persona.avatar} if persona and persona.avatar else {}),
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
                {"id": actor_id, "name": actors[actor_id].displayName, **({"avatar": actors[actor_id].avatar} if actors[actor_id].avatar else {})}
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
    if "audioWorkBanner" in requested:
        result["audioWorkBanner"] = _get_audio_work_banner(db)
    if "demoBanner" in requested:
        result["demoBanner"] = _get_demo_banner(db)
    if "externalPublicScripts" in requested:
        result["externalPublicScripts"] = get_published_external_public_scripts(db)
    if "demoSubmissions" in requested:
        result["demoSubmissions"] = _get_approved_demo_submissions(db)
    if "audioWorks" in requested:
        result["audioWorks"] = _get_approved_audio_work_submissions(db)
    if "productionResources" in requested:
        result["productionResources"] = _production_directory(db)
    if "activityPages" in requested:
        result["activityPages"] = _get_published_activity_pages(db)
    return jsonable_encoder(result)


def _production_directory(db: Session) -> list[dict]:
    """Directory rows for people with production roles; every row links to the person's identity page."""
    from services.identity_convergence import legacy_credit_resource_id

    persona_ids = [row[0] for row in db.query(models.PersonaRole.personaId).filter(
        models.PersonaRole.role.in_(models.PRODUCTION_ROLES), models.PersonaRole.isVisible.is_(True),
    ).distinct().all()]
    if not persona_ids:
        return []
    personas = db.query(models.Persona).filter(models.Persona.id.in_(persona_ids)).all()
    context = public_router._build_public_identity_context(db, persona_ids)
    legacy_ids: dict[str, list[str]] = {value: [] for value in persona_ids}
    for resource_id, persona_id in db.query(models.ProductionResource.id, models.ProductionResource.personaId).filter(
        models.ProductionResource.personaId.in_(persona_ids)
    ).all():
        legacy_ids[persona_id].append(resource_id)
    for row in db.query(models.PersonaCreditName).filter(models.PersonaCreditName.personaId.in_(persona_ids)).all():
        legacy_ids[row.personaId].append(legacy_credit_resource_id(row.role, row.creditedAs))
    items = []
    for persona in personas:
        projected = public_router._public_identity_projection(db, persona, [], context)
        commission_categories = [role for role in models.PRODUCTION_ROLES
                                 if isinstance((projected.roleProfiles or {}).get(role, {}).get("commissionOffers"), list)
                                 and (projected.roleProfiles or {})[role]["commissionOffers"]]
        categories = [role for role in models.PRODUCTION_ROLES
                      if role in projected.roles or role in commission_categories]
        if not categories:
            continue
        items.append({
            "id": persona.id,
            "personaId": persona.id,
            "name": projected.displayName or "",
            "categories": categories,
            "commissionCategories": commission_categories,
            "recordingEntityType": (projected.roleProfiles or {}).get("recording_studio", {}).get("entityType"),
            "otherRoles": [role for role in projected.roles if role not in models.PRODUCTION_ROLES],
            "summary": projected.bio or "",
            "bio": projected.bio or "",
            "avatarUrl": projected.avatar or "",
            "websiteUrl": projected.website or "",
            "links": [item for item in crud._ensure_list(projected.links) if isinstance(item, dict) and item.get("url")],
            "works": projected.productionCredits,
            "legacyIds": sorted(set(legacy_ids.get(persona.id, []))),
        })
    items.sort(key=lambda item: item["name"])
    return items


def _build_bundle(db: Session) -> dict:
    return _build_bundle_sections(db, _BUNDLE_SECTIONS)


@router.get("/public-bundle")
def public_bundle(db: Session = Depends(get_db), sections: str | None = None):
    selected = _parse_bundle_sections(sections)
    key = selected if selected is not None else tuple(sorted(_BUNDLE_SECTIONS))
    return _cached_public_response(key, lambda: (
        _build_bundle(db) if selected is None else _build_bundle_sections(db, frozenset(selected))
    ))


@router.get("/public-resource-directory")
def public_resource_directory(db: Session = Depends(get_db)):
    def build():
        personas = public_router.list_public_personas(db)
        fields = {"id", "displayName", "bio", "avatar", "website", "links", "tags", "roles",
                  "voiceActorHidden", "roleProfiles", "workParticipations"}
        return resource_directory_rows(
            [person.model_dump(include=fields) for person in personas], _production_directory(db),
        )

    return _cached_public_response(("resourceDirectory",), build)


def _cached_public_response(key, build):
    global _bundle_cache
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
            payload = build()
            built = (JSONResponse(content=payload).body, time.monotonic() + min(_BUNDLE_TTL, seconds_until_taipei_midnight()))
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
        headers={"Cache-Control": ("no-store" if {"banner", "demoBanner", "audioWorkBanner"}.intersection(key) else f"public, max-age={_BUNDLE_TTL}, stale-while-revalidate=120")},
    )
