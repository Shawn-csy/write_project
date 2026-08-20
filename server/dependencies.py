from fastapi import Header, HTTPException
from typing import Optional
import json
import logging
import os
from database import SessionLocal

logger = logging.getLogger(__name__)

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

    # Only allow fallback auth in explicitly non-production environments.
    env_value = (
        os.getenv("ENVIRONMENT")
        or os.getenv("APP_ENV")
        or os.getenv("FASTAPI_ENV")
        or os.getenv("NODE_ENV")
        or ""
    ).strip().lower()
    is_explicit_non_prod = env_value in {"dev", "development", "local", "test", "testing"}
    if not is_explicit_non_prod:
        return False

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

async def get_current_user_claims(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
) -> dict:
    """回傳已驗證的 token claims（含 uid、email、email_verified）。

    需要 email 的呼叫端一律走這裡，不可從請求 body 取得 —— users.email 會被
    is_admin_user() 用來授予管理權限，若接受客戶端提供即為權限提升途徑。

    X-User-ID 開發模式沒有 token，只會回傳 uid。
    """
    if authorization:
        if not authorization.lower().startswith("bearer "):
            raise HTTPException(status_code=401, detail="Invalid Authorization header")
        token = authorization.split(" ", 1)[1].strip()
        if not token:
            raise HTTPException(status_code=401, detail="Missing bearer token")
        fb_auth = _init_firebase_auth()
        try:
            decoded = fb_auth.verify_id_token(token, check_revoked=True)
        except Exception as exc:
            # 未捕捉時，任何格式錯誤／過期／已撤銷的 token 都會變成 500。
            # 這不是繞過（請求仍被拒），但語意錯誤，而且會讓外部 status 監測
            # 看到大量假的伺服器錯誤，把真正的故障蓋掉。
            #
            # 憑證抓取失敗屬於相依服務不可用（Google 端），不是呼叫端的錯，
            # 回 503 讓監測能與「壞 token」區分開來。
            if type(exc).__name__ == "CertificateFetchError":
                logger.error("firebase certificate fetch failed: %s", exc)
                raise HTTPException(status_code=503, detail="Auth provider unavailable")
            logger.info("rejected token: %s", type(exc).__name__)
            raise HTTPException(status_code=401, detail="Invalid or expired token")
        uid = decoded.get("uid")
        if not uid:
            raise HTTPException(status_code=401, detail="Invalid token payload")
        return decoded

    if _allow_x_user_id() and x_user_id:
        return {"uid": x_user_id}

    raise HTTPException(status_code=401, detail="Missing Authorization token")


async def get_current_user_id(
    authorization: Optional[str] = Header(None),
    x_user_id: Optional[str] = Header(None),
) -> str:
    claims = await get_current_user_claims(authorization=authorization, x_user_id=x_user_id)
    return claims["uid"]


def verified_email_from_claims(claims: dict) -> Optional[str]:
    """只回傳身分提供者已驗證的 email。

    未驗證的 email 不可信 —— 攻擊者能以任意 email 註冊帳號，若採信即可
    冒充 ADMIN_USER_EMAILS 或 admin_users.email 中的管理者身分。
    """
    if not claims.get("email_verified"):
        return None
    email = str(claims.get("email") or "").strip().lower()
    return email or None

def is_admin_user_id(user_id: str) -> bool:
    return user_id in _admin_user_ids()


def is_admin_user(db, user_id: str) -> bool:
    """判定管理權限。

    以 userId 為準的兩條路徑（ADMIN_USER_IDS、admin_users.userId）是不可竄改的。

    另外兩條以 email 比對的路徑，其安全性完全建立在一個前提上：
    **users.email 只能由後端從已驗證的 Firebase token 寫入**
    （見 crud_ops.users.update_user 與 verified_email_from_claims）。

    2026-08-20 之前這個前提不成立 —— schemas.UserBase 含 email，PUT /api/me
    會直接把客戶端提供的值 setattr 到 users.email，任何登入者送出管理者信箱
    即可提權。該路徑已封閉，但這裡保留稽核紀錄：日後若有人再開出 email 的
    寫入途徑，至少不會是靜默的。

    保留 email 路徑是因為管理介面支援「以 email 預先授權尚未註冊的人」。
    若不需要該功能，直接刪掉這兩段會是更強的設計。
    """
    if not user_id:
        return False
    if user_id in _admin_user_ids():
        return True

    try:
        import models
        user = db.query(models.User).filter(models.User.id == user_id).first()
        email = str(getattr(user, "email", "") or "").strip().lower() if user else ""

        admin_entry = db.query(models.AdminUser).filter(models.AdminUser.userId == user_id).first()
        if admin_entry:
            return True

        if email:
            if email in _admin_user_emails():
                logger.warning(
                    "admin granted to %s via ADMIN_USER_EMAILS match (email-based path)", user_id
                )
                return True

            admin_by_email = db.query(models.AdminUser).filter(models.AdminUser.email == email).first()
            if admin_by_email:
                logger.warning(
                    "admin granted to %s via admin_users.email match (email-based path)", user_id
                )
                return True
    except Exception:
        logger.exception("admin check failed for %s", user_id)
        return False

    return False
