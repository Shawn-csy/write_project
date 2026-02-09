from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import crud
from dependencies import get_db
from routers import public as public_router

router = APIRouter(prefix="/api", tags=["public"])

@router.get("/public-bundle")
def public_bundle(db: Session = Depends(get_db)):
    # Reuse existing public endpoints for consistency
    scripts = crud.get_public_scripts(db)
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
        "scripts": scripts,
        "personas": personas,
        "organizations": orgs,
        "topTags": top_tags,
    }
