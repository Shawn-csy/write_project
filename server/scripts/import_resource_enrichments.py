"""Import reviewed resource profile details into the dev database."""

import json
import os
from pathlib import Path
from urllib.parse import urlparse

from database import SessionLocal, engine
from models import Base, ProductionResourceEnrichment


SNAPSHOT = Path(__file__).parent / "data" / "production_resource_enrichments_2026-11-10.json"


def valid_https(url):
    parsed = urlparse(url or "")
    return parsed.scheme == "https" and bool(parsed.hostname) and not parsed.username and not parsed.password


def main():
    if "write_project_dev" not in os.getenv("DATABASE_URL", ""):
        raise SystemExit("Refusing to import outside the dev database")
    rows = json.loads(SNAPSHOT.read_text())["enrichments"]
    Base.metadata.create_all(bind=engine, tables=[ProductionResourceEnrichment.__table__])
    with SessionLocal() as db:
        for item in rows:
            if not valid_https(item["profileUrl"]) or not valid_https(item["sourceUrl"]):
                raise ValueError(f"Invalid profile source for {item['id']}")
            if item["avatarUrl"] and not valid_https(item["avatarUrl"]):
                raise ValueError(f"Invalid avatar source for {item['id']}")
            row = db.get(ProductionResourceEnrichment, item["id"])
            if row is None:
                row = ProductionResourceEnrichment(id=item["id"])
                db.add(row)
            for field in ("profileUrl", "profileLabel", "avatarUrl", "bio", "sourceUrl", "checkedAt"):
                setattr(row, field, item[field])
        db.commit()
        from services.identity_convergence import converge_and_commit
        converge_and_commit(db)
    print(f"Imported {len(rows)} sourced resource profiles")


if __name__ == "__main__":
    main()
