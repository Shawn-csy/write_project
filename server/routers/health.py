import logging
import time

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from dependencies import get_current_user_id, get_db


logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/health", tags=["health"])
NO_STORE_HEADERS = {"Cache-Control": "no-store"}

# /integrity 會跑全表掃描，且是公開可達的端點。用 TTL 快取避免被輪詢放大成 DB 負載。
_INTEGRITY_TTL_SECONDS = 60
_integrity_cache: tuple[dict, bool, float] | None = None


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


def _scripts_integrity(db: Session) -> tuple[dict, bool]:
    """比對 `scripts` 表的實際列數（heap）與索引可見列數。

    2026-08-17 Postgres 被 SIGKILL 中斷關機 checkpoint，WAL 遺失導致索引與 heap
    不同步：heap 有 84 列、索引只認得 69 列，主鍵還出現重複值。結果是 4 篇公開
    台本從網站上消失或點進去 404，而且**三天後才靠肉眼發現**。

    heap 與索引筆數不一致，正是當時最早可觀察到的訊號。這裡把它做成可被外部
    status 監測輪詢的檢查。

    回傳 (payload, healthy)。
    """
    dialect = db.get_bind().dialect.name
    if dialect != "postgresql":
        # 規劃器提示（enable_seqscan 等）是 Postgres 專屬；其他 dialect 無從比對。
        return {"status": "skipped", "reason": f"dialect {dialect} not supported"}, True

    try:
        # 全表掃描：關掉所有索引存取路徑，取得 heap 的真實列數。
        db.execute(text("SET LOCAL enable_indexscan = off"))
        db.execute(text("SET LOCAL enable_bitmapscan = off"))
        db.execute(text("SET LOCAL enable_indexonlyscan = off"))
        heap_rows = db.execute(text("SELECT count(*) FROM scripts")).scalar_one()
        duplicate_ids = db.execute(
            text("SELECT count(*) FROM (SELECT id FROM scripts GROUP BY id HAVING count(*) > 1) d")
        ).scalar_one()

        # 索引掃描：改為抑制全表掃描，讓規劃器走主鍵 / id 索引。
        db.execute(text("SET LOCAL enable_indexscan = on"))
        db.execute(text("SET LOCAL enable_bitmapscan = on"))
        db.execute(text("SET LOCAL enable_indexonlyscan = on"))
        db.execute(text("SET LOCAL enable_seqscan = off"))
        index_rows = db.execute(text("SELECT count(*) FROM scripts WHERE id > ''")).scalar_one()
    except Exception:
        logger.exception("scripts integrity check failed")
        return {"status": "unknown", "reason": "check failed"}, False
    finally:
        # 捨棄 SET LOCAL 與交易狀態，不影響後續請求。
        db.rollback()

    healthy = (heap_rows == index_rows) and duplicate_ids == 0
    payload = {
        "status": "ok" if healthy else "degraded",
        "heapRows": heap_rows,
        "indexRows": index_rows,
        "duplicateIds": duplicate_ids,
    }
    if not healthy:
        payload["reason"] = (
            "index and heap disagree — likely index corruption; "
            "rebuild required (REINDEX may not suffice)"
        )
        logger.error(
            "scripts index integrity degraded: heap=%s index=%s duplicates=%s",
            heap_rows,
            index_rows,
            duplicate_ids,
        )
    return payload, healthy


@router.get("/integrity")
def integrity(db: Session = Depends(get_db)):
    """資料完整性檢查，供外部 status 監測輪詢。

    刻意與 /ready 分開：/ready 是容器 healthcheck 在用的，而索引損壞無法靠重啟
    修復 —— 若讓它影響 /ready，只會使容器進入重啟迴圈並讓整站下線。這裡回 503
    是要讓「人」知道，不是要讓編排系統動作。
    """
    global _integrity_cache
    now = time.monotonic()
    if _integrity_cache is not None and now < _integrity_cache[2]:
        payload, healthy = _integrity_cache[0], _integrity_cache[1]
    else:
        payload, healthy = _scripts_integrity(db)
        _integrity_cache = (payload, healthy, now + _INTEGRITY_TTL_SECONDS)

    return JSONResponse(
        status_code=200 if healthy else 503,
        content={"status": payload["status"], "service": "backend", "checks": {"scripts": payload}},
        headers=NO_STORE_HEADERS,
    )


@router.get("/auth")
def auth_health_check(user_id: str = Depends(get_current_user_id)):
    """Authenticated smoke test; intentionally not used as a container probe."""
    return JSONResponse(
        content={"ok": True, "status": "ok", "service": "auth", "uid": user_id},
        headers=NO_STORE_HEADERS,
    )
