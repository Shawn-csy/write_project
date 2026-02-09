from fastapi import APIRouter, Depends, HTTPException
from typing import List
from sqlalchemy.orm import Session
import crud
import schemas
from dependencies import get_db, get_current_user_id, is_admin_user_id

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/users", response_model=List[schemas.UserPublic])
def search_users(q: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    if not is_admin_user_id(ownerId):
        raise HTTPException(status_code=403, detail="Not authorized")
    return crud.search_users(db, q)
