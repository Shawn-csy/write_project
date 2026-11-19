"""Read a named batch from the public catalog archive or a standalone snapshot."""

import json
from pathlib import Path


ARCHIVE = Path(__file__).with_name("data") / "public_catalog_backfills.json"


def read_backfill_snapshot(path: Path, batch: str) -> dict:
    snapshot = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(snapshot, dict):
        raise ValueError(f"Expected a JSON object in {path}")
    if "supplementalBatches" not in snapshot:
        return snapshot
    batches = snapshot["supplementalBatches"]
    if not isinstance(batches, dict) or not isinstance(batches.get(batch), dict):
        raise ValueError(f"Missing backfill batch {batch!r} in {path}")
    return batches[batch]
