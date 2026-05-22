import time
from fastapi import APIRouter, Depends
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import crud_ops as crud
import schemas
from dependencies import get_db
from routers import public as public_router

router = APIRouter(prefix="/api", tags=["public"])

# In-memory cache: (payload, expires_at)
_bundle_cache: tuple[dict, float] | None = None
_BUNDLE_TTL = 60  # seconds


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
    owner = data.get("owner") or {}
    if owner:
        owner["email"] = None
        data["owner"] = owner
    # contentLength is not a DB column; compute from content so gallery cards can show duration estimate
    data["contentLength"] = getattr(script, "contentLength", None) or len(getattr(script, "content", "") or "")
    return data


def _build_bundle(db: Session) -> dict:
    scripts = [public_router.sanitize_public_script(s) for s in crud.get_public_scripts(db)]
    serialized_scripts = [_serialize_bundle_script(s) for s in scripts]
    personas = jsonable_encoder(public_router.list_public_personas(db))
    orgs = jsonable_encoder(public_router.list_public_organizations(db))
    tag_scores: dict[str, int] = {}
    for script in scripts or []:
        views = getattr(script, "views", 0) or 0
        tags = getattr(script, "tags", []) or []
        for tag in tags:
            name = getattr(tag, "name", None) or (tag if isinstance(tag, str) else None)
            if not name:
                continue
            tag_scores[name] = tag_scores.get(name, 0) + (views if views > 0 else 1)
    top_tags = [name for name, _ in sorted(tag_scores.items(), key=lambda kv: kv[1], reverse=True)[:5]]
    return jsonable_encoder({
        "scripts": serialized_scripts,
        "personas": personas,
        "organizations": orgs,
        "topTags": top_tags,
    })


@router.get("/public-bundle")
def public_bundle(db: Session = Depends(get_db)):
    global _bundle_cache
    now = time.monotonic()
    if _bundle_cache is None or now >= _bundle_cache[1]:
        payload = _build_bundle(db)
        _bundle_cache = (payload, now + _BUNDLE_TTL)
    else:
        payload = _bundle_cache[0]
    return JSONResponse(
        content=payload,
        headers={"Cache-Control": f"public, max-age={_BUNDLE_TTL}, stale-while-revalidate=120"},
    )
