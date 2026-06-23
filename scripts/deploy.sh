#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
RUN_CI="${RUN_CI:-0}"
MIGRATE_SQLITE_TO_POSTGRES="${MIGRATE_SQLITE_TO_POSTGRES:-0}"
SOURCE_SQLITE_PATH="${SOURCE_SQLITE_PATH:-server/data/scripts.db}"
TARGET_DATABASE_URL="${TARGET_DATABASE_URL:-${DATABASE_URL:-}}"
MIGRATION_BATCH_SIZE="${MIGRATION_BATCH_SIZE:-500}"
MIGRATION_TRUNCATE="${MIGRATION_TRUNCATE:-0}"
POSTGRES_DATA_DIR="${POSTGRES_DATA_DIR:-server/data/postgres}"
FORCE_DEPLOY="${FORCE_DEPLOY:-0}"
DEPLOY_HASH_FILE="${ROOT_DIR}/.deploy-hash"

# Optional CLI overrides:
#   bash scripts/deploy.sh ci=1
#   bash scripts/deploy.sh env=.env.prod compose=docker-compose.yml
#   bash scripts/deploy.sh migrate_pg=1 target_db='postgresql+psycopg://...'
#   bash scripts/deploy.sh migrate_pg=1 pg_data_dir=server/data/postgres
#   bash scripts/deploy.sh force=1   (skip change detection, always redeploy)
for arg in "$@"; do
  case "$arg" in
    force=0|force=1)
      FORCE_DEPLOY="${arg#force=}"
      ;;
    ci=0|ci=1)
      RUN_CI="${arg#ci=}"
      ;;
    run_ci=0|run_ci=1)
      RUN_CI="${arg#run_ci=}"
      ;;
    env=*)
      ENV_FILE="${arg#env=}"
      ;;
    compose=*)
      COMPOSE_FILE="${arg#compose=}"
      ;;
    migrate_pg=0|migrate_pg=1)
      MIGRATE_SQLITE_TO_POSTGRES="${arg#migrate_pg=}"
      ;;
    source_sqlite=*)
      SOURCE_SQLITE_PATH="${arg#source_sqlite=}"
      ;;
    target_db=*)
      TARGET_DATABASE_URL="${arg#target_db=}"
      ;;
    batch=*)
      MIGRATION_BATCH_SIZE="${arg#batch=}"
      ;;
    truncate=0|truncate=1)
      MIGRATION_TRUNCATE="${arg#truncate=}"
      ;;
    pg_data_dir=*)
      POSTGRES_DATA_DIR="${arg#pg_data_dir=}"
      ;;
    *)
      echo "WARN: unknown argument ignored: $arg"
      ;;
  esac
done

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: missing env file: $ENV_FILE"
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: docker command not found"
  exit 1
fi

get_env_value() {
  local key="$1"
  awk -F= -v k="$key" '$1 == k {sub(/^[^=]*=/, ""); print; exit}' "$ENV_FILE"
}

ensure_postgres_data_dir_seeded() {
  local target_dir="$ROOT_DIR/$POSTGRES_DATA_DIR"
  local project_name old_volume_name
  mkdir -p "$target_dir"

  if [ -n "$(ls -A "$target_dir" 2>/dev/null)" ]; then
    return
  fi

  project_name="$(basename "$ROOT_DIR" | tr '[:upper:]' '[:lower:]' | tr -c 'a-z0-9' '_')"
  old_volume_name="${project_name}_write_project_pgdata"

  if ! docker volume inspect "$old_volume_name" >/dev/null 2>&1; then
    return
  fi

  echo "[deploy] seeding postgres bind dir from legacy volume: $old_volume_name -> $POSTGRES_DATA_DIR"
  docker run --rm \
    -v "${old_volume_name}:/from" \
    -v "${target_dir}:/to" \
    alpine sh -lc 'cp -a /from/. /to/'
}

start_postgres_for_migration() {
  echo "[deploy] ensuring postgres service is running for migration..."
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d write_project-postgres

  local cid status i
  cid="$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q write_project-postgres)"
  if [ -z "$cid" ]; then
    echo "ERROR: cannot find write_project-postgres container id"
    exit 1
  fi

  for i in $(seq 1 45); do
    status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null || true)"
    case "$status" in
      healthy|running)
        echo "[deploy] postgres status: $status"
        return
        ;;
      *)
        sleep 2
        ;;
    esac
  done

  echo "ERROR: postgres did not become ready in time"
  docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" logs --no-color --tail=80 write_project-postgres || true
  exit 1
}

CURRENT_HASH="$(git -C "$ROOT_DIR" rev-parse HEAD 2>/dev/null || echo "unknown")"
LAST_HASH="$(cat "$DEPLOY_HASH_FILE" 2>/dev/null || echo "")"
DEPLOY_TAG="${CURRENT_HASH:0:8}"
PREV_HASH_FILE="${ROOT_DIR}/.deploy-hash.prev"

if [ "$FORCE_DEPLOY" != "1" ] && [ "$CURRENT_HASH" != "unknown" ] && [ "$CURRENT_HASH" = "$LAST_HASH" ]; then
  echo "[deploy] no changes since last deploy (${CURRENT_HASH:0:8}) — skipping."
  echo "[deploy] run with force=1 to deploy anyway."
  exit 0
fi

LAST_HASH_DISPLAY="${LAST_HASH:0:8}"
echo "[deploy] deploying commit ${CURRENT_HASH:0:8} (was: ${LAST_HASH_DISPLAY:-first deploy})"

if [ "$RUN_CI" = "1" ]; then
  echo "[deploy] running CI precheck first..."
  AUTO_DEPLOY=0 bash "$ROOT_DIR/scripts/ci.sh"
fi

if [ "$MIGRATE_SQLITE_TO_POSTGRES" = "1" ]; then
  ensure_postgres_data_dir_seeded
  start_postgres_for_migration

  if [ -z "$TARGET_DATABASE_URL" ]; then
    POSTGRES_USER_VAL="$(get_env_value POSTGRES_USER)"
    POSTGRES_PASSWORD_VAL="$(get_env_value POSTGRES_PASSWORD)"
    POSTGRES_DB_VAL="$(get_env_value POSTGRES_DB)"
    POSTGRES_PORT_VAL="$(get_env_value POSTGRES_PORT)"

    POSTGRES_USER_VAL="${POSTGRES_USER_VAL:-write_project}"
    POSTGRES_PASSWORD_VAL="${POSTGRES_PASSWORD_VAL:-write_project}"
    POSTGRES_DB_VAL="${POSTGRES_DB_VAL:-write_project}"
    POSTGRES_PORT_VAL="${POSTGRES_PORT_VAL:-1092}"

    TARGET_DATABASE_URL="postgresql+psycopg://${POSTGRES_USER_VAL}:${POSTGRES_PASSWORD_VAL}@127.0.0.1:${POSTGRES_PORT_VAL}/${POSTGRES_DB_VAL}"
    echo "[deploy] target_db not provided, using inferred local postgres url on port ${POSTGRES_PORT_VAL}"
  fi

  if [ ! -f "$SOURCE_SQLITE_PATH" ]; then
    echo "ERROR: sqlite source not found: $SOURCE_SQLITE_PATH"
    exit 1
  fi

  PYTHON_CMD=""
  if [ -x "$ROOT_DIR/server/venv/bin/python" ]; then
    PYTHON_CMD="$ROOT_DIR/server/venv/bin/python"
  elif command -v python3 >/dev/null 2>&1; then
    PYTHON_CMD="python3"
  else
    echo "ERROR: python runtime not found for migration step"
    exit 1
  fi

  echo "[deploy] sqlite -> postgres migration start..."
  MIGRATE_ARGS=(
    "$ROOT_DIR/server/migrate_sqlite_to_postgres.py"
    "--source-sqlite" "$ROOT_DIR/$SOURCE_SQLITE_PATH"
    "--target-database-url" "$TARGET_DATABASE_URL"
    "--batch-size" "$MIGRATION_BATCH_SIZE"
  )
  if [ "$MIGRATION_TRUNCATE" = "1" ]; then
    MIGRATE_ARGS+=("--truncate")
  fi
  "$PYTHON_CMD" "${MIGRATE_ARGS[@]}"
  echo "[deploy] sqlite -> postgres migration done"
fi

echo "[deploy] stopping existing containers..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down

# Save previous deploy state for rollback
if [ -n "$LAST_HASH" ]; then
  echo "$LAST_HASH" > "$PREV_HASH_FILE"
fi
if [ -d "${ROOT_DIR}/dist" ]; then
  echo "[deploy] backing up dist for rollback..."
  rm -rf "${ROOT_DIR}/dist.rollback"
  cp -a "${ROOT_DIR}/dist" "${ROOT_DIR}/dist.rollback"
fi

echo "[deploy] building and starting backend (tag: ${DEPLOY_TAG})..."
export DEPLOY_TAG
# Phase 1: start only data + backend — public/frontend held back until backfill completes.
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up --build -d \
  write_project-postgres write_project-backend

echo "[deploy] waiting for backend to be ready..."
BACKEND_CID="$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q write_project-backend 2>/dev/null || true)"
if [ -z "$BACKEND_CID" ]; then
  echo "WARN: cannot find write_project-backend container — skipping readiness check"
else
  READY=0
  for i in $(seq 1 30); do
    STATUS="$(docker inspect -f '{{.State.Status}}' "$BACKEND_CID" 2>/dev/null || true)"
    if [ "$STATUS" = "running" ]; then
      # Check if the server is accepting connections — any HTTP response (incl. 4xx) means it's up.
      if docker exec "$BACKEND_CID" \
          python -c "
import urllib.request, urllib.error, sys
try:
    urllib.request.urlopen('http://localhost:1091/api/health/auth')
except urllib.error.HTTPError:
    pass  # 4xx/5xx still means server is up
except Exception:
    sys.exit(1)
" 2>/dev/null; then
        READY=1
        break
      fi
    fi
    sleep 2
  done

  if [ "$READY" = "1" ]; then
    echo "[deploy] backend is up — migration log:"
    docker logs "$BACKEND_CID" 2>&1 | grep -E "Migrat|migration|backfill" || echo "  (no migration output found)"
  else
    echo "WARN: backend did not become ready in time — showing last 40 log lines:"
    docker logs --tail=40 "$BACKEND_CID" 2>&1 || true
  fi
fi

# ── Phase 2 data backfill (release gate — must complete before public runtime) ─
# Scripts are idempotent. Dry-run first; write only when pending records found.
# Dry-run failure aborts deploy: stale data must not be served without runtime normalization.
if [ -n "$BACKEND_CID" ] && [ "$READY" = "1" ]; then
  echo "[deploy] running canonical metadata backfill (dry-run)..."
  if ! BACKFILL_DRY="$(docker exec "$BACKEND_CID" python /app/scripts/backfill_canonical_metadata.py 2>&1)"; then
    echo "ERROR: canonical metadata backfill dry-run failed:"
    echo "$BACKFILL_DRY"
    exit 1
  fi
  echo "$BACKFILL_DRY"

  if echo "$BACKFILL_DRY" | grep -qE "Fields to backfill|fields backfilled"; then
    echo "[deploy] backfill needed — running write mode..."
    docker exec "$BACKEND_CID" python /app/scripts/backfill_canonical_metadata.py --write
    echo "[deploy] canonical metadata backfill complete"
  else
    echo "[deploy] canonical metadata backfill: nothing to do"
  fi

  echo "[deploy] running cover design sub→layers migration (dry-run)..."
  if ! COVER_DRY="$(docker exec "$BACKEND_CID" python /app/scripts/migrate_cover_sub.py 2>&1)"; then
    echo "ERROR: cover design migration dry-run failed:"
    echo "$COVER_DRY"
    exit 1
  fi
  echo "$COVER_DRY"

  if echo "$COVER_DRY" | grep -qE "Records to update: [1-9]"; then
    echo "[deploy] cover migration needed — running write mode..."
    docker exec "$BACKEND_CID" python /app/scripts/migrate_cover_sub.py --write
    echo "[deploy] cover design migration complete"
  else
    echo "[deploy] cover design migration: nothing to do"
  fi
elif [ -n "$BACKEND_CID" ] && [ "$READY" = "0" ]; then
  echo "ERROR: backend not ready — cannot run Phase 2 backfill. Deploy aborted."
  exit 1
fi

# Phase 2: backfill complete — now start public-facing services.
echo "[deploy] starting public reader and frontend..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up --build -d \
  write_project-frontend-build write_project-frontend write_project-public

# Tag images as 'latest' for convenience
if docker image inspect "write_project-backend:${DEPLOY_TAG}" >/dev/null 2>&1; then
  docker tag "write_project-backend:${DEPLOY_TAG}" "write_project-backend:latest"
fi
if docker image inspect "write_project-public:${DEPLOY_TAG}" >/dev/null 2>&1; then
  docker tag "write_project-public:${DEPLOY_TAG}" "write_project-public:latest"
fi

# Prune backend and public images older than the last 3 versions
for image_name in write_project-backend write_project-public; do
  old_images=$(docker images "$image_name" --format "{{.Tag}}" | grep -v "latest" | sort -r | tail -n +4)
  if [ -n "$old_images" ]; then
    echo "[deploy] pruning old ${image_name} images: $(echo "$old_images" | tr '\n' ' ')"
    echo "$old_images" | xargs -I{} docker rmi "${image_name}:{}" 2>/dev/null || true
  fi
done

echo "[deploy] waiting for public reader to be ready..."
PUBLIC_CID="$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q write_project-public 2>/dev/null || true)"
if [ -z "$PUBLIC_CID" ]; then
  echo "WARN: cannot find write_project-public container — skipping readiness check"
else
  PUBLIC_READY=0
  for i in $(seq 1 30); do
    STATUS="$(docker inspect -f '{{.State.Status}}' "$PUBLIC_CID" 2>/dev/null || true)"
    if [ "$STATUS" = "running" ]; then
      if docker exec "$PUBLIC_CID" node -e "fetch('http://127.0.0.1:3000/about').then(r => { if (r.ok) process.exit(0); process.exit(1); }).catch(() => process.exit(1));" >/dev/null 2>&1; then
        PUBLIC_READY=1
        break
      fi
    fi
    sleep 2
  done

  if [ "$PUBLIC_READY" = "1" ]; then
    echo "[deploy] public reader is up"
  else
    echo "WARN: public reader did not become ready in time — showing last 80 log lines:"
    docker logs --tail=80 "$PUBLIC_CID" 2>&1 || true
  fi
fi

echo "[deploy] service status:"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

if [ "$CURRENT_HASH" != "unknown" ]; then
  echo "$CURRENT_HASH" > "$DEPLOY_HASH_FILE"
  echo "[deploy] saved deploy hash: ${CURRENT_HASH:0:8}"
  echo "[deploy] rollback available: bash scripts/rollback.sh"
fi

echo "[deploy] done"
