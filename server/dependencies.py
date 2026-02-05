from fastapi import Header, HTTPException
from typing import Optional
import json
import os
from database import SessionLocal

ALLOW_X_USER_ID = os.getenv("ALLOW_X_USER_ID", "").lower() in {"1", "true", "yes"}
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID")
FIREBASE_CREDENTIALS = os.getenv("FIREBASE_CREDENTIALS")  # path to service account json
FIREBASE_CREDENTIALS_JSON = os.getenv("FIREBASE_CREDENTIALS_JSON")  # raw json

_firebase_auth = None

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

ADMIN_USER_IDS = {
    uid.strip()
    for uid in os.getenv("ADMIN_USER_IDS", "").split(",")
    if uid.strip()
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

    if ALLOW_X_USER_ID and x_user_id:
        return x_user_id

    raise HTTPException(status_code=401, detail="Missing Authorization token")

def is_admin_user_id(user_id: str) -> bool:
    return user_id in ADMIN_USER_IDS
