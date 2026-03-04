from fastapi import APIRouter, Depends, HTTPException
import json
import crud_ops as crud
import schemas
from sqlalchemy.orm import Session
from dependencies import get_db, get_current_user_id, is_admin_user

router = APIRouter(prefix="/api/me", tags=["users"])

@router.get("", response_model=schemas.User)
def read_users_me(db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    user = crud.get_user(db, ownerId)
    if not user:
        return {"id": ownerId, "settings": {}, "organizationIds": [], "isAdmin": is_admin_user(db, ownerId)}
    # Parse settings JSON
    try:
        user.settings = json.loads(user.settings) if user.settings else {}
    except ValueError:
        user.settings = {}
    user_org_ids = crud.list_user_org_ids(db, ownerId)
    setattr(user, "organizationIds", user_org_ids)
    if not user.organizationId and user_org_ids:
        user.organizationId = user_org_ids[0]
    setattr(user, "isAdmin", is_admin_user(db, ownerId))
    return user

@router.put("", response_model=schemas.User)
def update_user_me(user: schemas.UserCreate, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    try:
        crud.update_user(db, ownerId, user)
    except Exception as e:
        # Check for integrity error (e.g. unique handle)
        print(f"Update failed: {e}")
        if "UNIQUE constraint failed" in str(e): 
             raise HTTPException(status_code=409, detail="Handle already taken")
        raise HTTPException(status_code=500, detail="Internal Server Error")
    return read_users_me(db=db, ownerId=ownerId)
