from fastapi import APIRouter, Depends, HTTPException
import json
import logging
import crud_ops as crud
import schemas
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session
from dependencies import get_db, get_current_user_id, is_admin_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/me", tags=["users"])

@router.get("", response_model=schemas.User)
def read_users_me(db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    user = crud.get_user(db, ownerId)
    if not user:
        return {"id": ownerId, "settings": {}, "organizationIds": [], "isAdmin": is_admin_user(db, ownerId)}

    # Parse settings JSON without mutating ORM fields. Mutating `user.settings`
    # to a dict marks the row dirty and can break later flush/commit on SQLite.
    try:
        if isinstance(user.settings, dict):
            parsed_settings = user.settings
        else:
            parsed_settings = json.loads(user.settings) if user.settings else {}
    except (ValueError, TypeError):
        parsed_settings = {}

    user_org_ids = crud.list_user_org_ids(db, ownerId)
    effective_org_id = user.organizationId or (user_org_ids[0] if user_org_ids else None)

    return {
        "id": user.id,
        "handle": user.handle,
        "email": user.email,
        "displayName": user.displayName,
        "bio": user.bio,
        "avatar": user.avatar,
        "avatarCrop": user.avatarCrop,
        "website": user.website,
        "settings": parsed_settings,
        "organizationId": effective_org_id,
        "organizationIds": user_org_ids,
        "isAdmin": is_admin_user(db, ownerId),
    }

@router.put("", response_model=schemas.User)
def update_user_me(user: schemas.UserCreate, db: Session = Depends(get_db), ownerId: str = Depends(get_current_user_id)):
    try:
        crud.update_user(db, ownerId, user)
    except crud.HandleConflictError as e:
        raise HTTPException(status_code=409, detail=e.detail)
    except IntegrityError as e:
        # 後備防線：check-then-commit 之間仍可能有競態，由資料庫的唯一約束攔下。
        # 不可用錯誤訊息字串判斷 —— SQLite 說 "UNIQUE constraint failed"，
        # Postgres 說 "duplicate key value violates unique constraint"，
        # 先前的字串比對只對 SQLite 成立，正式站的衝突一律落到 500。
        logger.warning("update_user integrity error for %s: %s", ownerId, e)
        raise HTTPException(status_code=409, detail="Handle already taken")
    except Exception as e:
        logger.exception("update_user failed for %s: %s", ownerId, e)
        raise HTTPException(status_code=500, detail="Internal Server Error")
    return read_users_me(db=db, ownerId=ownerId)
