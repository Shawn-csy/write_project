from fastapi import APIRouter, Depends
from typing import List
from sqlalchemy.orm import Session
import crud
import schemas
from dependencies import get_db, get_current_user_id

router = APIRouter(prefix="/api/admin", tags=["admin"])

@router.get("/users", response_model=List[schemas.UserPublic])
def search_users(q: str, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    # In a real app, restrict this to Admin-only. 
    # For now, we allow any logged-in user to search for others to transfer ownership (a common pattern).
    return crud.search_users(db, q)
