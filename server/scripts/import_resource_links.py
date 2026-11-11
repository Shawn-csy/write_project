"""Import reviewed extra resource contact links into the dev database."""

import json
import os
from pathlib import Path

from database import SessionLocal, engine
from models import Base, ProductionResourceLink
from scripts.import_resource_enrichments import valid_https


SNAPSHOT = Path(__file__).parent / "data" / "production_resource_links_2026-11-10.json"


def main():
    if "write_project_dev" not in os.getenv("DATABASE_URL", ""):
        raise SystemExit("Refusing to import outside the dev database")
    links = json.loads(SNAPSHOT.read_text())["links"]
    Base.metadata.create_all(bind=engine, tables=[ProductionResourceLink.__table__])
    with SessionLocal() as db:
        for item in links:
            if not item["resourceId"] or not item["label"]:
                raise ValueError("Resource link is missing its identity or label")
            if not valid_https(item["url"]) or not valid_https(item["sourceUrl"]):
                raise ValueError(f"Invalid link source for {item['id']}")
            row = db.get(ProductionResourceLink, item["id"])
            if row is None:
                row = ProductionResourceLink(id=item["id"])
                db.add(row)
            for field in ("resourceId", "label", "url", "sourceUrl", "checkedAt"):
                setattr(row, field, item[field])
        db.commit()
        from services.identity_convergence import converge_and_commit
        converge_and_commit(db)
    print(f"Imported {len(links)} additional resource links")


if __name__ == "__main__":
    main()
