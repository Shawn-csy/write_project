#!/usr/bin/env bash
# Inspect or explicitly migrate the live PostgreSQL schema without restarting services.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND=write_project-write_project-backend-1
POSTGRES=write_project-write_project-postgres-1
NETWORK=write_project_default
MODE="${1:---plan}"

case "$MODE" in
  --plan|--verify|--apply) ;;
  *) echo "Usage: $0 [--plan|--verify|--apply]" >&2; exit 2 ;;
esac
if [ "$#" -gt 1 ]; then
  echo "Usage: $0 [--plan|--verify|--apply]" >&2
  exit 2
fi

for container in "$BACKEND" "$POSTGRES"; do
  if [ "$(docker inspect -f '{{.State.Running}}' "$container" 2>/dev/null || true)" != true ]; then
    echo "ERROR: source container is not running: $container" >&2
    exit 1
  fi
done

WP_BACKEND_IMAGE="$(docker inspect -f '{{.Image}}' "$BACKEND")"
WP_DATABASE_URL="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$BACKEND" | sed -n 's/^DATABASE_URL=//p')"
if [ -z "$WP_DATABASE_URL" ]; then
  echo "ERROR: live Backend has no DATABASE_URL" >&2
  exit 1
fi
export DATABASE_URL="$WP_DATABASE_URL"
unset WP_DATABASE_URL

if [ "$MODE" = --apply ]; then
  # The same source snapshot must pass the read/write probe before live DDL.
  REHEARSAL_READ_PROBE=1 REHEARSAL_WRITE_PROBE=1 \
    bash "$ROOT_DIR/scripts/rehearse-prod-schema.sh"
  KEEP_DAYS=999999 bash "$ROOT_DIR/scripts/backup-db.sh"
fi

docker_args=(--rm --network "$NETWORK" -e DATABASE_URL
  -v "$ROOT_DIR/server:/app:ro" "$WP_BACKEND_IMAGE"
  python -m scripts.run_schema_migration)
if [ "$MODE" = --apply ]; then
  docker run "${docker_args[@]}" --apply
elif [ "$MODE" = --verify ]; then
  docker run -e 'PGOPTIONS=-c default_transaction_read_only=on' "${docker_args[@]}" --verify
else
  docker run -e 'PGOPTIONS=-c default_transaction_read_only=on' "${docker_args[@]}"
fi
