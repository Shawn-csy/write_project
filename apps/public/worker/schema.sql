-- D1 schema for the read-only public fallback.
--
-- One row per public API answer, keyed by the request path plus query string
-- exactly as the browser sends it (for example "/api/public-bundle" or
-- "/api/public-scripts/abc123"). `body` is the JSON the local backend returned
-- for that request; storing the answers as-is keeps the fallback's response
-- shape identical to the primary's.
CREATE TABLE IF NOT EXISTS public_snapshot (
  path      TEXT PRIMARY KEY,
  body      TEXT NOT NULL,
  synced_at TEXT NOT NULL
);
