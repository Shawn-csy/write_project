"""Apply source-reviewed external cover overrides. Dry run unless --apply."""
import argparse
import json
import os
from pathlib import Path
from urllib.parse import urlparse

from database import SessionLocal
from models import ExternalPublicScript


def apply_snapshot(db, snapshot):
    rows = snapshot.get("covers") or []
    if len({item.get("externalScriptId") for item in rows}) != len(rows):
        raise ValueError("Duplicate external script cover")
    changes = []
    for item in rows:
        script_id, work_id, cover_url = item.get("externalScriptId"), str(item.get("workId") or ""), item.get("coverUrl")
        expected_cover_prefix = f"https://cxc.today/fs/book/{work_id}/"
        if not work_id.isdigit() or not str(cover_url).startswith(expected_cover_prefix):
            raise ValueError(f"Unverified CxC cover URL: {script_id}")
        row = db.get(ExternalPublicScript, script_id)
        if not row or row.status != "published" or f"/work/{work_id}/" not in row.sourceUrl:
            raise ValueError(f"External work/source mismatch: {script_id}")
        if row.coverUrlOverride == cover_url:
            continue
        if row.coverUrlOverride:
            raise ValueError(f"Existing override needs manual review: {script_id}")
        row.coverUrlOverride = cover_url
        changes.append({"externalScriptId": script_id, "sourceUrl": row.sourceUrl, "coverUrl": cover_url})
    db.flush()
    return changes


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("--database-name", required=True)
    parser.add_argument("--apply", action="store_true")
    args = parser.parse_args()
    if urlparse(os.environ.get("DATABASE_URL", "")).path != "/" + args.database_name:
        raise SystemExit("Database name does not match the explicitly selected target")
    with SessionLocal() as db:
        changes = apply_snapshot(db, json.loads(args.snapshot.read_text()))
        print(json.dumps({"count": len(changes), "changes": changes}, ensure_ascii=False, indent=2))
        if args.apply:
            db.commit()
            print("Applied. Invalidate public bundle and revalidate external work/author pages in serving API.")
        else:
            db.rollback()
            print("Dry run; rolled back")


if __name__ == "__main__":
    main()
