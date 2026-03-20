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

# Optional CLI overrides:
#   bash scripts/deploy.sh ci=1
#   bash scripts/deploy.sh env=.env.prod compose=docker-compose.yml
#   bash scripts/deploy.sh migrate_pg=1 target_db='postgresql+psycopg://...'
#   bash scripts/deploy.sh migrate_pg=1 pg_data_dir=server/data/postgres
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

echo "[deploy] building and starting containers..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up --build -d

echo "[deploy] service status:"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo "[deploy] done"
