"""
Phase 2: Migrate legacy coverDesign.sub → coverDesign.layers.

Usage:
  # Dry run (default):
  PYTHONPATH=. python scripts/migrate_cover_sub.py

  # Write mode:
  PYTHONPATH=. python scripts/migrate_cover_sub.py --write

After all production records are migrated and verified, remove:
  - CoverDesign.sub from packages/public-ui/src/cover/types.ts
  - migrateLegacySub() from types.ts
  - migrateLegacySub import + call from CoverRenderer.tsx
"""

import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import engine

DRY_RUN = "--write" not in sys.argv

LAYER_ID = "layer_legacy_sub"


def sub_to_layer(sub: dict) -> dict:
    return {
        "id": LAYER_ID,
        "text": sub.get("text", ""),
        "direction": sub.get("direction", "horizontal"),
        "font": sub.get("font", "noto-sans"),
        "size": sub.get("size", "sm"),
        "letterSpacing": 0.06,
        "effect": "none",
        "color": sub.get("color", "#ffffff"),
        "x": sub.get("x", 0.5),
        "y": sub.get("y", 0.9),
        "visible": sub.get("visible", True),
    }


def process(tables: list[tuple[str, str]], write: bool):
    mode = "WRITE" if write else "DRY-RUN"
    print(f"=== coverDesign.sub migration [{mode}] ===\n")

    total_scanned = 0
    to_update: list[tuple[str, str, str, str]] = []  # (table, col, id, new_json)

    with engine.connect() as conn:
        for table, col in tables:
            rows = conn.execute(
                text(f'SELECT id, "{col}" FROM "{table}" WHERE "{col}" IS NOT NULL')
            ).fetchall()
            for row in rows:
                total_scanned += 1
                raw = row[1]
                try:
                    design = json.loads(raw) if isinstance(raw, str) else raw
                except Exception:
                    continue
                if not isinstance(design, dict):
                    continue
                sub = design.get("sub")
                if not sub or not isinstance(sub, dict):
                    continue
                if not sub.get("visible"):
                    # sub exists but invisible — strip it, don't migrate
                    new_design = {k: v for k, v in design.items() if k != "sub"}
                    to_update.append((table, col, row[0], json.dumps(new_design, ensure_ascii=False)))
                    continue
                existing_layers = design.get("layers") or []
                # don't duplicate if already migrated
                if any(l.get("id") == LAYER_ID for l in existing_layers if isinstance(l, dict)):
                    # already has the migrated layer — just strip sub
                    new_design = {k: v for k, v in design.items() if k != "sub"}
                    to_update.append((table, col, row[0], json.dumps(new_design, ensure_ascii=False)))
                    continue
                new_layer = sub_to_layer(sub)
                new_design = {
                    **{k: v for k, v in design.items() if k != "sub"},
                    "layers": [*existing_layers, new_layer],
                }
                to_update.append((table, col, row[0], json.dumps(new_design, ensure_ascii=False)))

    print(f"Records scanned:  {total_scanned}")
    print(f"Records to update: {len(to_update)}")
    if not to_update:
        print("\nNothing to migrate.")
        if not write:
            print("Dry run complete.")
        return

    # group by table for display
    by_table: dict[str, int] = {}
    for table, _, _, _ in to_update:
        by_table[table] = by_table.get(table, 0) + 1
    for t, count in by_table.items():
        print(f"  {t}: {count}")

    if not write:
        print("\nDry run complete. Pass --write to apply.")
        return

    updated = 0
    with engine.connect() as conn:
        is_pg = engine.dialect.name == "postgresql"
        for table, col, row_id, new_json in to_update:
            if is_pg:
                conn.execute(
                    text(f'UPDATE "{table}" SET "{col}" = CAST(:v AS JSONB) WHERE id = :id'),
                    {"v": new_json, "id": row_id},
                )
            else:
                conn.execute(
                    text(f'UPDATE "{table}" SET "{col}" = :v WHERE id = :id'),
                    {"v": new_json, "id": row_id},
                )
            updated += 1
        conn.commit()

    print(f"\nDone. Updated {updated} records.")


if __name__ == "__main__":
    TABLES = [
        ("scripts", "coverDesign"),
    ]
    process(TABLES, write=not DRY_RUN)
