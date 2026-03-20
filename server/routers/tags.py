from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
import crud_ops as crud
import schemas
import models
from dependencies import get_db, get_current_user_id, is_admin_user

router = APIRouter(prefix="/api", tags=["tags"])

@router.get("/tags", response_model=List[schemas.Tag])
def read_tags(
    ownerIdQuery: str | None = None,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    effective_owner = ownerIdQuery if ownerIdQuery and is_admin_user(db, ownerId) else ownerId
    return crud.get_tags(db, effective_owner)

@router.post("/tags")
def create_tag(
    tag: schemas.TagCreate,
    ownerIdQuery: str | None = None,
    db: Session = Depends(get_db),
    ownerId: str = Depends(get_current_user_id),
):
    effective_owner = ownerIdQuery if ownerIdQuery and is_admin_user(db, ownerId) else ownerId
    created = crud.create_tag(db, tag, effective_owner)
    if not created:
        raise HTTPException(status_code=500, detail="Failed to create tag")
    return created

@router.delete("/tags/{tag_id}")
def delete_tag(tag_id: int, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    crud.delete_tag(db, tag_id, ownerId)
    return {"success": True}

@router.post("/scripts/{script_id}/tags")
def attach_tag(script_id: str, payload: dict, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    tag_id = payload.get("tagId")
    if tag_id is None:
        raise HTTPException(status_code=400, detail="Missing tagId")

    script = db.query(models.Script).filter(models.Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    can_admin_override = is_admin_user(db, ownerId)
    if script.ownerId != ownerId and not can_admin_override:
        raise HTTPException(status_code=403, detail="Not authorized")

    tag_owner_id = script.ownerId if can_admin_override else ownerId
    tag = db.query(models.Tag).filter(models.Tag.id == tag_id, models.Tag.ownerId == tag_owner_id).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    ok = crud.add_tag_to_script(db, script_id, tag_id)
    if not ok:
        raise HTTPException(status_code=500, detail="Failed to attach tag")
    return {"success": True}

@router.delete("/scripts/{script_id}/tags/{tag_id}")
def detach_tag(script_id: str, tag_id: int, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    script = db.query(models.Script).filter(models.Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    if script.ownerId != ownerId and not is_admin_user(db, ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")

    crud.remove_tag_from_script(db, script_id, tag_id)
    return {"success": True}
