#!/usr/bin/env python3
import argparse
import copy
import json
import os
import sqlite3
from typing import Any

from sqlalchemy import Boolean, Float, Integer, JSON, MetaData, create_engine, text
from sqlalchemy.sql.sqltypes import Integer as SAInteger

import models


DEFAULT_SQLITE_PATH = os.path.join(os.path.dirname(__file__), "data", "scripts.db")

TABLE_ORDER = [
    "users",
    "organizations",
    "personas",
    "marker_themes",
    "series",
    "scripts",
    "tags",
    "script_tags",
    "script_likes",
    "organization_invites",
    "organization_requests",
    "organization_memberships",
    "persona_organization_memberships",
    "public_terms_acceptances",
    "admin_users",
    "site_settings",
]

JSON_DEFAULTS: dict[tuple[str, str], Any] = {
    ("scripts", "customMetadata"): [],
    ("organizations", "tags"): [],
    ("personas", "links"): [],
    ("personas", "organizationIds"): [],
    ("personas", "tags"): [],
    ("personas", "defaultLicenseSpecialTerms"): [],
    ("public_terms_acceptances", "clientMeta"): {},
    ("public_terms_acceptances", "headerSnapshot"): {},
}


def _table_exists_sqlite(conn: sqlite3.Connection, table_name: str) -> bool:
    cur = conn.execute(
        "SELECT 1 FROM sqlite_master WHERE type='table' AND name = ? LIMIT 1",
        (table_name,),
    )
    return cur.fetchone() is not None


def _normalize_json_value(table_name: str, column_name: str, raw: Any) -> Any:
    default = copy.deepcopy(JSON_DEFAULTS.get((table_name, column_name), []))
    if raw is None:
        return default
    if isinstance(raw, (dict, list)):
        return raw
    if isinstance(raw, (int, float, bool)):
        return raw
    if isinstance(raw, bytes):
        raw = raw.decode("utf-8", errors="replace")
    if isinstance(raw, str):
        txt = raw.strip()
        if not txt:
            return default
        try:
            return json.loads(txt)
        except Exception:
            print(
                f"[warn] invalid json fallback: {table_name}.{column_name} value={txt[:120]!r}"
            )
            return default
    return default


def _normalize_value(table_name: str, column, raw: Any) -> Any:
    if raw is None:
        return None

    col_type = column.type

    if isinstance(col_type, JSON):
        return _normalize_json_value(table_name, column.name, raw)

    if isinstance(col_type, Boolean):
        if isinstance(raw, bool):
            return raw
        if isinstance(raw, (int, float)):
            return bool(raw)
        if isinstance(raw, str):
            return raw.strip().lower() in {"1", "true", "t", "yes", "y", "on"}
        return False

    if isinstance(col_type, Integer):
        if raw == "":
            return None
        return int(raw)

    if isinstance(col_type, Float):
        if raw == "":
            return None
        return float(raw)

    if isinstance(raw, bytes):
        return raw.decode("utf-8", errors="replace")

    return raw


def _count_sqlite(conn: sqlite3.Connection, table_name: str) -> int:
    cur = conn.execute(f'SELECT COUNT(*) FROM "{table_name}"')
    return int(cur.fetchone()[0])


def _count_pg(conn, table_name: str) -> int:
    return int(conn.execute(text(f'SELECT COUNT(*) FROM "{table_name}"')).scalar_one())


def _copy_table(
    sqlite_conn: sqlite3.Connection,
    pg_conn,
    table_name: str,
    batch_size: int,
) -> tuple[int, int]:
    if not _table_exists_sqlite(sqlite_conn, table_name):
        print(f"[skip] source table not found: {table_name}")
        return 0, 0

    model_table = models.Base.metadata.tables[table_name]
    reflected_md = MetaData()
    reflected_md.reflect(bind=pg_conn, only=[table_name])
    table = reflected_md.tables[table_name]
    source_count = _count_sqlite(sqlite_conn, table_name)
    if source_count == 0:
        print(f"[ok] {table_name}: source is empty")
        return 0, 0

    inserted = 0
    cursor = sqlite_conn.execute(f'SELECT * FROM "{table_name}"')
    while True:
        rows = cursor.fetchmany(batch_size)
        if not rows:
            break

        payload = []
        for row in rows:
            record = {}
            for column in model_table.columns:
                record[column.name] = _normalize_value(
                    table_name, column, row[column.name]
                )
            payload.append(record)

        pg_conn.execute(table.insert(), payload)
        inserted += len(payload)

    print(f"[ok] {table_name}: inserted {inserted}")
    return source_count, inserted


def _ensure_target_empty_or_truncate(pg_conn, truncate: bool) -> None:
    if truncate:
        for table_name in reversed(TABLE_ORDER):
            pg_conn.execute(
                text(f'TRUNCATE TABLE "{table_name}" RESTART IDENTITY CASCADE')
            )
        print("[ok] target truncated")
        return

    occupied = []
    for table_name in TABLE_ORDER:
        count = _count_pg(pg_conn, table_name)
        if count > 0:
            occupied.append((table_name, count))
    if occupied:
        summary = ", ".join(f"{name}={count}" for name, count in occupied)
        raise RuntimeError(
            "target postgres is not empty. "
            "rerun with --truncate to overwrite existing data. "
            f"occupied tables: {summary}"
        )


def _widen_integer_columns_for_postgres(pg_conn) -> None:
    # SQLite Integer in this project is used for unix-ms timestamps (13 digits),
    # which overflows PostgreSQL INTEGER. Widen to BIGINT before copying data.
    for table_name in TABLE_ORDER:
        table = models.Base.metadata.tables[table_name]
        for column in table.columns:
            if isinstance(column.type, SAInteger):
                pg_conn.execute(
                    text(
                        f'ALTER TABLE "{table_name}" '
                        f'ALTER COLUMN "{column.name}" TYPE BIGINT'
                    )
                )


def run(source_sqlite_path: str, target_database_url: str, batch_size: int, truncate: bool):
    if not os.path.exists(source_sqlite_path):
        raise FileNotFoundError(f"sqlite file not found: {source_sqlite_path}")
    if not target_database_url:
        raise ValueError("missing target database url")

    pg_engine = create_engine(target_database_url, pool_pre_ping=True)
    if pg_engine.dialect.name != "postgresql":
        raise RuntimeError(
            f"target database must be PostgreSQL, got: {pg_engine.dialect.name}"
        )

    # Ensure schema exists before copy.
    models.Base.metadata.create_all(bind=pg_engine)

    sqlite_conn = sqlite3.connect(source_sqlite_path)
    sqlite_conn.row_factory = sqlite3.Row

    source_totals = {}
    copied_totals = {}
    try:
        with pg_engine.begin() as pg_conn:
            _ensure_target_empty_or_truncate(pg_conn, truncate=truncate)
            _widen_integer_columns_for_postgres(pg_conn)
            pg_conn.execute(text("SET session_replication_role = replica"))
            try:
                for table_name in TABLE_ORDER:
                    source_count, copied_count = _copy_table(
                        sqlite_conn=sqlite_conn,
                        pg_conn=pg_conn,
                        table_name=table_name,
                        batch_size=batch_size,
                    )
                    source_totals[table_name] = source_count
                    copied_totals[table_name] = copied_count
            finally:
                pg_conn.execute(text("SET session_replication_role = origin"))

            print("\n[verify] row counts")
            for table_name in TABLE_ORDER:
                src_count = source_totals.get(table_name, 0)
                dst_count = _count_pg(pg_conn, table_name)
                status = "ok" if src_count == dst_count else "mismatch"
                print(
                    f" - {table_name}: source={src_count} target={dst_count} [{status}]"
                )
                if src_count != dst_count:
                    raise RuntimeError(
                        f"row count mismatch on {table_name}: source={src_count}, target={dst_count}"
                    )
    finally:
        sqlite_conn.close()
        pg_engine.dispose()

    print("\n[done] sqlite -> postgres migration completed")


def parse_args():
    parser = argparse.ArgumentParser(
        description="One-time migration from SQLite file to PostgreSQL."
    )
    parser.add_argument(
        "--source-sqlite",
        default=DEFAULT_SQLITE_PATH,
        help=f"Path to source sqlite db file (default: {DEFAULT_SQLITE_PATH})",
    )
    parser.add_argument(
        "--target-database-url",
        default=(os.getenv("TARGET_DATABASE_URL") or os.getenv("DATABASE_URL") or ""),
        help="Target PostgreSQL SQLAlchemy URL. Defaults to TARGET_DATABASE_URL or DATABASE_URL env.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=500,
        help="Batch size for inserts (default: 500)",
    )
    parser.add_argument(
        "--truncate",
        action="store_true",
        help="Truncate target tables before migration",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    run(
        source_sqlite_path=args.source_sqlite,
        target_database_url=args.target_database_url,
        batch_size=args.batch_size,
        truncate=args.truncate,
    )
