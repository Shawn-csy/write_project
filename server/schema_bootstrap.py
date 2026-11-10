"""Create missing ORM tables without holding one transaction across the catalog.

This is an expand-only step. Existing tables and columns are left to explicit
migrations, and each new table commits before the next one begins.
"""

from sqlalchemy import inspect, text
from sqlalchemy.sql.util import sort_tables


def create_missing_tables(engine, metadata) -> list[str]:
    existing = set(inspect(engine).get_table_names())
    created = []
    # Sort only the missing subset. The full model has a historical
    # users/organizations FK cycle; those already-existing tables do not need
    # to participate in this expand-only step.
    missing = [table for table in metadata.tables.values() if table.name not in existing]
    for table in sort_tables(missing):
        with engine.begin() as conn:
            table.create(bind=conn, checkfirst=True)
        created.append(table.name)
    return created


def missing_model_columns(executor, dialect: str, metadata) -> dict[str, tuple[str, ...]]:
    """Return missing mapped columns, including all columns of missing tables."""
    if dialect == "postgresql":
        rows = executor.execute(text(
            "SELECT table_name, column_name FROM information_schema.columns "
            "WHERE table_schema = current_schema()"
        ))
    elif dialect == "sqlite":
        rows = executor.execute(text(
            "SELECT m.name, p.name FROM sqlite_master AS m, pragma_table_info(m.name) AS p "
            "WHERE m.type = 'table'"
        ))
    else:
        raise ValueError(f"Unsupported schema dialect: {dialect}")

    actual: dict[str, set[str]] = {}
    for table_name, column_name in rows:
        actual.setdefault(table_name, set()).add(column_name)
    gaps = {}
    for table in metadata.tables.values():
        missing = tuple(sorted(column.name for column in table.columns
                               if column.name not in actual.get(table.name, set())))
        if missing:
            gaps[table.name] = missing
    return gaps
