from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import crud_ops as crud
import schemas
from dependencies import get_current_user_id, get_db

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
