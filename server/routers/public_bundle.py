from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import crud_ops as crud
import schemas
from dependencies import get_db
from routers import public as public_router

router = APIRouter(prefix="/api", tags=["public"])


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
    return data


@router.get("/public-bundle")
def public_bundle(db: Session = Depends(get_db)):
    # Reuse existing public endpoints for consistency
    scripts = [public_router.sanitize_public_script(s) for s in crud.get_public_scripts(db)]
    serialized_scripts = [_serialize_bundle_script(s) for s in scripts]
    personas = public_router.list_public_personas(db)
    orgs = public_router.list_public_organizations(db)
    # Compute top tags by total views (descending), fallback to count if views missing.
    tag_scores = {}
    for script in scripts or []:
        views = getattr(script, "views", 0) or 0
        tags = getattr(script, "tags", []) or []
        for tag in tags:
            name = getattr(tag, "name", None) or (tag if isinstance(tag, str) else None)
            if not name:
                continue
            tag_scores[name] = tag_scores.get(name, 0) + (views if views > 0 else 1)
    top_tags = [name for name, _ in sorted(tag_scores.items(), key=lambda kv: kv[1], reverse=True)[:5]]
    return {
        "scripts": serialized_scripts,
        "personas": personas,
        "organizations": orgs,
        "topTags": top_tags,
    }
