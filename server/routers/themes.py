from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
import crud
import schemas
import models
from dependencies import get_db, get_current_user_id

router = APIRouter(prefix="/api/themes", tags=["themes"])

@router.get("", response_model=List[schemas.MarkerTheme])
def read_themes(db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    return crud.get_user_themes(db, ownerId)

@router.post("")
def create_theme(theme: schemas.MarkerThemeCreate, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    return crud.create_theme(db, theme, ownerId)

@router.put("/{theme_id}")
def update_theme(theme_id: str, theme: schemas.MarkerThemeUpdate, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    updated = crud.update_theme(db, theme_id, theme, ownerId)
    if not updated:
        raise HTTPException(status_code=404, detail="Theme not found")
    return updated

@router.delete("/{theme_id}")
def delete_theme(theme_id: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    crud.delete_theme(db, theme_id, ownerId)
    return {"success": True}

@router.post("/{theme_id}/copy")
def copy_theme(theme_id: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    # 1. Get original theme
    original = db.query(models.MarkerTheme).filter(models.MarkerTheme.id == theme_id).first()
    if not original:
         raise HTTPException(status_code=404, detail="Theme not found")
    
    if not original.isPublic and original.ownerId != ownerId:
         raise HTTPException(status_code=403, detail="Cannot copy private theme")
         
    # 2. Create copy
    new_theme = schemas.MarkerThemeCreate(
        name=f"{original.name} (Copy)",
        configs=original.configs,
        isPublic=False,
        description=original.description
    )
    return crud.create_theme(db, new_theme, ownerId)
