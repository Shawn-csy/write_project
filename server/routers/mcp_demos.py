"""Narrow Demo management endpoints for the local stdio MCP server.

The ordinary admin routes continue to require a user session. Only these
explicit routes accept the local MCP key, and they reuse the same validation,
moderation, cache invalidation, and revalidation behavior as Studio.
"""

from typing import List, Optional

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

import schemas
from dependencies import get_db, get_local_mcp_admin_user_id
from routers import admin


router = APIRouter(prefix="/api/admin/mcp/demos", tags=["local-mcp-demos"])


@router.get("", response_model=schemas.AdminDemoListResponse)
def list_demos(
    q: Optional[str] = None,
    status: Optional[str] = "all",
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_local_mcp_admin_user_id),
):
    return admin.list_all_demos(q=q, status=status, limit=limit, offset=offset, db=db, ownerId=owner_id)


@router.get("/targets", response_model=List[schemas.AdminDemoTarget])
def list_targets(
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_local_mcp_admin_user_id),
):
    return admin.list_all_demo_targets(db=db, ownerId=owner_id)


@router.get("/voice-actors", response_model=List[schemas.AdminVoiceActorRecord])
def list_voice_actors(
    q: Optional[str] = None,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_local_mcp_admin_user_id),
):
    return admin.list_voice_actors_admin(q=q, db=db, ownerId=owner_id)


@router.post("/voice-actors", response_model=schemas.AdminVoiceActorRecord)
def ensure_voice_actor(
    payload: schemas.AdminVoiceActorCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_local_mcp_admin_user_id),
):
    matches = [
        item for item in admin.list_voice_actors_admin(q=payload.displayName, db=db, ownerId=owner_id)
        if item["displayName"].casefold() == payload.displayName.casefold()
    ]
    if len(matches) > 1:
        raise HTTPException(status_code=409, detail="同名聲演身份不只一筆，請先在後台辨識")
    if matches:
        return matches[0]
    return admin.create_voice_actor_admin(payload=payload, background_tasks=background_tasks, db=db, ownerId=owner_id)


@router.get("/submissions", response_model=schemas.PublicDemoSubmissionListResponse)
def list_submissions(
    status: Optional[str] = "pending",
    q: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_local_mcp_admin_user_id),
):
    return admin.list_public_demo_submissions(status=status, q=q, limit=limit, offset=offset, db=db, ownerId=owner_id)


@router.post("", response_model=schemas.AdminDemoRecord)
def create_demo(
    payload: schemas.AdminDemoMutation,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_local_mcp_admin_user_id),
):
    return admin.create_all_demo(payload=payload, background_tasks=background_tasks, db=db, ownerId=owner_id)


@router.put("/{source_kind}/{parent_id}/{demo_id}", response_model=schemas.AdminDemoRecord)
def update_demo(
    source_kind: str,
    parent_id: str,
    demo_id: str,
    payload: schemas.AdminDemoMutation,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_local_mcp_admin_user_id),
):
    return admin.update_all_demo(
        source_kind=source_kind, parent_id=parent_id, demo_id=demo_id,
        payload=payload, background_tasks=background_tasks, db=db, ownerId=owner_id,
    )


@router.patch("/submissions/{submission_id}/status", response_model=schemas.PublicDemoSubmissionRecord)
def review_submission(
    submission_id: str,
    payload: schemas.PublicDemoSubmissionStatusUpdate,
    db: Session = Depends(get_db),
    owner_id: str = Depends(get_local_mcp_admin_user_id),
):
    return admin.update_public_demo_submission_status(
        submission_id=submission_id, payload=payload, db=db, ownerId=owner_id,
    )
