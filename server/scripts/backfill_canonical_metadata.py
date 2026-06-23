"""
Phase 2: Canonical metadata backfill script.

Usage:
  # Dry run (default) — report only, no writes:
  PYTHONPATH=. python scripts/backfill_canonical_metadata.py

  # Write mode — applies backfill:
  PYTHONPATH=. python scripts/backfill_canonical_metadata.py --write

Report columns:
  - total scripts scanned
  - scripts with customMetadata
  - fields backfilled (by field name)
  - conflicts skipped (canonical column already set AND customMetadata differs)
  - scripts updated (write mode only)
"""

import json
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from database import engine

DRY_RUN = "--write" not in sys.argv

KEY_MAPS = {
    "targetAudience":      lambda m: m.get("targetaudience") or m.get("觀眾取向") or "",
    "contentRating":       lambda m: m.get("contentrating") or m.get("內容分級") or "",
    "license":             lambda m: m.get("license") or m.get("授權") or "",
    "licenseSpecialTerms": lambda m: m.get("licensespecialterms") or "",
    "authorDisplayMode":   lambda m: m.get("authordisplaymode") or m.get("authordisplay") or "",
}


def _meta_map(raw_custom):
    if isinstance(raw_custom, str):
        try:
            raw_custom = json.loads(raw_custom)
        except Exception:
            return {}
    if not isinstance(raw_custom, list):
        return {}
    return {
        "".join(str(item.get("key") or "").strip().lower().split()): str(item.get("value") or "").strip()
        for item in raw_custom if isinstance(item, dict)
    }


def _normalize_license_special_terms(val):
    """Return JSON array string from raw value."""
    try:
        parsed = json.loads(val)
        if isinstance(parsed, list):
            return val
        return json.dumps([str(parsed)])
    except Exception:
        return json.dumps([val])


def run(write: bool):
    mode = "WRITE" if write else "DRY-RUN"
    print(f"=== Canonical metadata backfill [{mode}] ===\n")

    with engine.connect() as conn:
        rows = conn.execute(text(
            'SELECT id, "customMetadata", "targetAudience", "contentRating", "license", '
            '"licenseSpecialTerms", "authorDisplayMode", "authorOverrideName" FROM scripts'
        )).fetchall()

    total = len(rows)
    has_custom = 0
    conflicts = {}   # field -> list of (id, existing_val, meta_val)
    to_update = {}   # script_id -> {field: new_val}

    for row in rows:
        raw_custom = row[1]
        if not raw_custom:
            continue
        meta = _meta_map(raw_custom)
        if not meta:
            continue
        has_custom += 1

        current = {
            "targetAudience":      row[2],
            "contentRating":       row[3],
            "license":             row[4],
            "licenseSpecialTerms": row[5],
            "authorDisplayMode":   row[6],
            "authorOverrideName":  row[7],
        }

        updates = {}

        for field, extractor in KEY_MAPS.items():
            meta_val = extractor(meta).strip()
            if not meta_val:
                continue
            existing = current[field]
            if existing:
                if field == "licenseSpecialTerms":
                    # normalize both sides before comparing
                    norm_existing = _normalize_license_special_terms(existing)
                    norm_meta = _normalize_license_special_terms(meta_val)
                    if norm_existing != norm_meta:
                        conflicts.setdefault(field, []).append((row[0], existing, meta_val))
                elif existing.strip() != meta_val:
                    conflicts.setdefault(field, []).append((row[0], existing, meta_val))
                # existing wins — no update
            else:
                if field == "licenseSpecialTerms":
                    updates[field] = _normalize_license_special_terms(meta_val)
                else:
                    updates[field] = meta_val

        # authorOverrideName: only when authorDisplayMode == "override"
        if not current["authorOverrideName"]:
            mode_val = updates.get("authorDisplayMode") or current["authorDisplayMode"] or ""
            if mode_val == "override":
                author_val = meta.get("author", "").strip()
                if author_val:
                    updates["authorOverrideName"] = author_val

        if updates:
            to_update[row[0]] = updates

    # ── Report ────────────────────────────────────────────────────────────────
    print(f"Scripts scanned:           {total}")
    print(f"Scripts with customMetadata: {has_custom}")
    print(f"Scripts to update:         {len(to_update)}")
    print()

    if to_update:
        field_counts = {}
        for updates in to_update.values():
            for f in updates:
                field_counts[f] = field_counts.get(f, 0) + 1
        print("Fields to backfill:")
        for f, count in sorted(field_counts.items()):
            print(f"  {f}: {count}")
        print()

    if conflicts:
        total_conflicts = sum(len(v) for v in conflicts.values())
        print(f"Conflicts skipped (canonical already set, differs from customMetadata): {total_conflicts}")
        for field, items in sorted(conflicts.items()):
            print(f"\n  [{field}] — {len(items)} conflict(s):")
            for script_id, existing, meta_val in items[:10]:
                print(f"    {script_id}")
                print(f"      existing: {existing!r}")
                print(f"      meta:     {meta_val!r}")
            if len(items) > 10:
                print(f"    ... and {len(items) - 10} more")
        print()
    else:
        print("Conflicts: 0")
        print()

    # ── Write ─────────────────────────────────────────────────────────────────
    if not write:
        print("Dry run complete. Pass --write to apply.")
        return

    if not to_update:
        print("Nothing to update.")
        return

    updated = 0
    with engine.connect() as conn:
        for script_id, updates in to_update.items():
            set_clause = ", ".join(f'"{k}" = :{k}' for k in updates)
            params = dict(updates)
            params["_id"] = script_id
            conn.execute(text(f'UPDATE scripts SET {set_clause} WHERE id = :_id'), params)
            updated += 1
        conn.commit()

    print(f"Done. Updated {updated} scripts.")


if __name__ == "__main__":
    run(write=not DRY_RUN)
