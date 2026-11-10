"""Bounded PostgreSQL schema migration job; never imported by the API server.

Run `python -m scripts.run_schema_migration` to inspect the mapped schema,
`--verify` to require readiness, or `--apply` for the explicit write step.
"""

import argparse

from sqlalchemy import event, text

import database
import migration
import models
from schema_bootstrap import create_missing_tables, missing_model_columns


LOCK_KEY = (1091, 20261110)


def _set_session_limits(dbapi_connection, _connection_record):
    with dbapi_connection.cursor() as cursor:
        cursor.execute("SET lock_timeout = '250ms'")
        cursor.execute("SET statement_timeout = '10s'")
        cursor.execute("SET idle_in_transaction_session_timeout = '10s'")
    dbapi_connection.commit()


def configure_migration_limits():
    if database.engine.dialect.name != "postgresql":
        raise RuntimeError("Schema migration job requires PostgreSQL")
    if not event.contains(database.engine, "connect", _set_session_limits):
        event.listen(database.engine, "connect", _set_session_limits)


def schema_gaps():
    with database.engine.connect() as conn:
        return missing_model_columns(conn, "postgresql", models.Base.metadata)


def apply_schema_migration() -> list[str]:
    """Apply once, with a job lock held across the independently committed phases."""
    configure_migration_limits()
    with database.engine.connect() as guard:
        acquired = guard.execute(text("SELECT pg_try_advisory_lock(:namespace, :key)"),
                                 {"namespace": LOCK_KEY[0], "key": LOCK_KEY[1]}).scalar_one()
        guard.commit()  # Session advisory lock survives commit.
        if not acquired:
            raise RuntimeError("Another schema migration job is already running")
        try:
            created = create_missing_tables(database.engine, models.Base.metadata)
            migration.run_migrations()
            gaps = schema_gaps()
            if gaps:
                raise RuntimeError(f"Mapped schema still incomplete: {gaps}")
            return created
        finally:
            guard.execute(text("SELECT pg_advisory_unlock(:namespace, :key)"),
                          {"namespace": LOCK_KEY[0], "key": LOCK_KEY[1]})
            guard.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--verify", action="store_true", help="Exit nonzero if a mapped table or column is missing")
    mode.add_argument("--apply", action="store_true", help="Apply bounded schema changes")
    args = parser.parse_args()
    configure_migration_limits()
    before = schema_gaps()
    print(f"Mapped schema gaps: {len(before)} table(s)")
    for table, columns in sorted(before.items()):
        print(f"  {table}: {', '.join(columns)}")
    if args.apply:
        created = apply_schema_migration()
        print(f"Schema migration complete; created {len(created)} table(s)")
    elif args.verify and before:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
