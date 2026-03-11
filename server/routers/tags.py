from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
import crud_ops as crud
import schemas
import models
from dependencies import get_db, get_current_user_id

router = APIRouter(prefix="/api", tags=["tags"])

@router.get("/tags", response_model=List[schemas.Tag])
def read_tags(db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    return crud.get_tags(db, ownerId)

@router.post("/tags")
def create_tag(tag: schemas.TagCreate, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    return crud.create_tag(db, tag, ownerId)

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
    if script.ownerId != ownerId:
        raise HTTPException(status_code=403, detail="Not authorized")

    tag = db.query(models.Tag).filter(models.Tag.id == tag_id, models.Tag.ownerId == ownerId).first()
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    crud.add_tag_to_script(db, script_id, tag_id)
    return {"success": True}

@router.delete("/scripts/{script_id}/tags/{tag_id}")
def detach_tag(script_id: str, tag_id: int, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    script = db.query(models.Script).filter(models.Script.id == script_id).first()
    if not script:
        raise HTTPException(status_code=404, detail="Script not found")
    if script.ownerId != ownerId:
        raise HTTPException(status_code=403, detail="Not authorized")

    crud.remove_tag_from_script(db, script_id, tag_id)
    return {"success": True}
