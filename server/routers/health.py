from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from dependencies import get_current_user_id, get_db


router = APIRouter(prefix="/api/health", tags=["health"])
NO_STORE_HEADERS = {"Cache-Control": "no-store"}


@router.get("/live")
def liveness():
    """Process-level probe. Keep this independent from external services."""
    return JSONResponse(
        content={"status": "ok", "service": "backend"},
        headers=NO_STORE_HEADERS,
    )


def _readiness_response(db: Session) -> JSONResponse:
    try:
        db.execute(text("SELECT 1")).scalar_one()
    except Exception:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unavailable",
                "service": "backend",
                "checks": {"database": "failed"},
            },
            headers=NO_STORE_HEADERS,
        )

    try:
        # LIMIT 0 validates the core table and a migration-managed column
        # without reading application data.
        db.execute(text('SELECT id, "publishReadiness" FROM scripts LIMIT 0'))
    except Exception:
        return JSONResponse(
            status_code=503,
            content={
                "status": "unavailable",
                "service": "backend",
                "checks": {"database": "ok", "schema": "failed"},
            },
            headers=NO_STORE_HEADERS,
        )

    return JSONResponse(
        content={
            "status": "ready",
            "service": "backend",
            "checks": {"database": "ok", "schema": "ok"},
        },
        headers=NO_STORE_HEADERS,
    )


@router.get("")
def readiness(db: Session = Depends(get_db)):
    """Compatibility readiness endpoint for infrastructure using /api/health."""
    return _readiness_response(db)


@router.get("/ready")
def readiness_explicit(db: Session = Depends(get_db)):
    return _readiness_response(db)


@router.get("/auth")
def auth_health_check(user_id: str = Depends(get_current_user_id)):
    """Authenticated smoke test; intentionally not used as a container probe."""
    return JSONResponse(
        content={"ok": True, "status": "ok", "service": "auth", "uid": user_id},
        headers=NO_STORE_HEADERS,
    )
