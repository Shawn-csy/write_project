from fastapi import APIRouter, Depends, HTTPException
import json
import crud
import schemas
from sqlalchemy.orm import Session
from dependencies import get_db, get_current_user_id

router = APIRouter(prefix="/api/me", tags=["users"])

@router.get("", response_model=schemas.User)
def read_users_me(db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    user = crud.get_user(db, ownerId)
    if not user:
        return {"id": ownerId, "settings": {}}
    # Parse settings JSON
    try:
        user.settings = json.loads(user.settings) if user.settings else {}
    except ValueError:
        user.settings = {}
    return user

@router.put("")
def update_user_me(user: schemas.UserCreate, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    try:
        updated_user = crud.update_user(db, ownerId, user)
        # Handle settings parsing for response or just return success
    except Exception as e:
        # Check for integrity error (e.g. unique handle)
        print(f"Update failed: {e}")
        if "UNIQUE constraint failed" in str(e): 
             raise HTTPException(status_code=409, detail="Handle already taken")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    return {"success": True}
