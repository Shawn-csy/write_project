-- D1 schema for the read-only public fallback.
-- A generation is written completely before the active pointer is switched, so
-- visitors never see a half-written snapshot if a sync is interrupted.
CREATE TABLE IF NOT EXISTS public_snapshot_generation (
  generation TEXT PRIMARY KEY,
  synced_at  TEXT NOT NULL,
  row_count  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS public_snapshot (
  generation  TEXT NOT NULL,
  path        TEXT NOT NULL,
  content_type TEXT NOT NULL,
  body_gzip   TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (generation, path)
);

CREATE TABLE IF NOT EXISTS public_snapshot_state (
  id                INTEGER PRIMARY KEY CHECK (id = 1),
  active_generation TEXT NOT NULL
);
