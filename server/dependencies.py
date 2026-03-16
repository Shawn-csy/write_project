from fastapi import Header, HTTPException
from typing import Optional
import json
import os
from database import SessionLocal

FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")
FIREBASE_CREDENTIALS = os.getenv("FIREBASE_CREDENTIALS")  # path to service account json
FIREBASE_CREDENTIALS_JSON = os.getenv("FIREBASE_CREDENTIALS_JSON")  # raw json

_firebase_auth = None
ALLOW_X_USER_ID = None
ADMIN_USER_IDS = None


def _is_production_env() -> bool:
    env_value = (
        os.getenv("ENVIRONMENT")
        or os.getenv("APP_ENV")
        or os.getenv("FASTAPI_ENV")
        or os.getenv("NODE_ENV")
        or ""
    ).strip().lower()
    return env_value in {"prod", "production"}

def _init_firebase_auth():
    global _firebase_auth
    if _firebase_auth is not None:
        return _firebase_auth
    try:
        import firebase_admin
        from firebase_admin import auth as fb_auth, credentials

        if not firebase_admin._apps:
            if FIREBASE_CREDENTIALS_JSON:
                cred = credentials.Certificate(json.loads(FIREBASE_CREDENTIALS_JSON))
                firebase_admin.initialize_app(cred, {"projectId": FIREBASE_PROJECT_ID} if FIREBASE_PROJECT_ID else None)
            elif FIREBASE_CREDENTIALS:
                cred = credentials.Certificate(FIREBASE_CREDENTIALS)
                firebase_admin.initialize_app(cred, {"projectId": FIREBASE_PROJECT_ID} if FIREBASE_PROJECT_ID else None)
            else:
                firebase_admin.initialize_app()
        _firebase_auth = fb_auth
        return _firebase_auth
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Auth backend not configured: {exc}")

def _allow_x_user_id() -> bool:
    # Safety guard: never allow header-based user impersonation in production.
    if _is_production_env():
        return False
    if ALLOW_X_USER_ID is not None:
        return bool(ALLOW_X_USER_ID)
    return os.getenv("ALLOW_X_USER_ID", "").lower() in {"1", "true", "yes"}


def _admin_user_ids() -> set[str]:
    if ADMIN_USER_IDS is not None:
        return set(ADMIN_USER_IDS)
    return {
        uid.strip()
        for uid in os.getenv("ADMIN_USER_IDS", "").split(",")
        if uid.strip()
    }


def _admin_user_emails() -> set[str]:
    return {
        email.strip().lower()
        for email in os.getenv("ADMIN_USER_EMAILS", "").split(",")
        if email.strip()
    }

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user_id(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None)
):
    if authorization:
        if not authorization.lower().startswith("bearer "):
            raise HTTPException(status_code=401, detail="Invalid Authorization header")
        token = authorization.split(" ", 1)[1].strip()
        if not token:
            raise HTTPException(status_code=401, detail="Missing bearer token")
        fb_auth = _init_firebase_auth()
        decoded = fb_auth.verify_id_token(token, check_revoked=True)
        uid = decoded.get("uid")
        if not uid:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return uid

    if _allow_x_user_id() and x_user_id:
        return x_user_id

    raise HTTPException(status_code=401, detail="Missing Authorization token")

def is_admin_user_id(user_id: str) -> bool:
    return user_id in _admin_user_ids()


def is_admin_user(db, user_id: str) -> bool:
    if not user_id:
        return False
    if user_id in _admin_user_ids():
        return True

    try:
        import models
        user = db.query(models.User).filter(models.User.id == user_id).first()
        if user:
            email = str(getattr(user, "email", "") or "").strip().lower()
            if email and email in _admin_user_emails():
                return True

        admin_entry = db.query(models.AdminUser).filter(models.AdminUser.userId == user_id).first()
        if admin_entry:
            return True

        if user:
            email = str(getattr(user, "email", "") or "").strip().lower()
            if email:
                admin_by_email = db.query(models.AdminUser).filter(models.AdminUser.email == email).first()
                if admin_by_email:
                    return True
    except Exception:
        return False

    return False
