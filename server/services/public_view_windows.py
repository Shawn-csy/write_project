"""Atomic, cross-worker deduplication for public view counters."""

import time
import uuid

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from models import PublicViewWindow
from rate_limit import client_ip_digest


VIEW_WINDOW_MS = 10 * 60 * 1000


def claim_recent_view(
    db: Session,
    resource_type: str,
    resource_id: str,
    client_ip: str,
    *,
    now_ms: int | None = None,
) -> bool:
    """Claim a view within the caller's counter transaction.

    A conflicting, unexpired row yields False. One expired row is pruned for
    each successful claim, preventing unbounded growth as new views arrive.
    """
    now = now_ms if now_ms is not None else int(time.time() * 1000)
    values = {
        "id": str(uuid.uuid4()),
        "resourceType": resource_type,
        "resourceId": resource_id,
        "clientKey": client_ip_digest(client_ip),
        "expiresAt": now + VIEW_WINDOW_MS,
    }
    dialect = db.get_bind().dialect.name
    if dialect == "postgresql":
        statement = pg_insert(PublicViewWindow).values(**values)
    elif dialect == "sqlite":
        statement = sqlite_insert(PublicViewWindow).values(**values)
    else:
        raise RuntimeError(f"Unsupported public view dedup dialect: {dialect}")

    statement = statement.on_conflict_do_update(
        index_elements=["resourceType", "resourceId", "clientKey"],
        set_={"expiresAt": values["expiresAt"]},
        where=PublicViewWindow.expiresAt <= now,
    ).returning(PublicViewWindow.id)
    claimed = db.execute(statement).first() is not None
    if claimed:
        stale_id = (
            select(PublicViewWindow.id)
            .where(PublicViewWindow.expiresAt <= now)
            .limit(1)
            .scalar_subquery()
        )
        db.execute(
            delete(PublicViewWindow).where(
                PublicViewWindow.id == stale_id,
                PublicViewWindow.expiresAt <= now,
            )
        )
    return claimed
