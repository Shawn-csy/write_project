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

# Optional CLI overrides:
#   bash scripts/deploy.sh ci=1
#   bash scripts/deploy.sh env=.env.prod compose=docker-compose.yml
#   bash scripts/deploy.sh migrate_pg=1 target_db='postgresql+psycopg://...'
for arg in "$@"; do
  case "$arg" in
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

if [ "$RUN_CI" = "1" ]; then
  echo "[deploy] running CI precheck first..."
  AUTO_DEPLOY=0 bash "$ROOT_DIR/scripts/ci.sh"
fi

if [ "$MIGRATE_SQLITE_TO_POSTGRES" = "1" ]; then
  if [ -z "$TARGET_DATABASE_URL" ]; then
    echo "ERROR: missing TARGET_DATABASE_URL / DATABASE_URL for postgres migration"
    exit 1
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

echo "[deploy] building and starting containers..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up --build -d

echo "[deploy] service status:"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo "[deploy] done"
