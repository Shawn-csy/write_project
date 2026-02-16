#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
RUN_CI="${RUN_CI:-0}"

# Optional CLI overrides:
#   bash scripts/deploy.sh ci=1
#   bash scripts/deploy.sh env=.env.prod compose=docker-compose.yml
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

echo "[deploy] stopping existing containers..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down

echo "[deploy] building and starting containers..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up --build -d

echo "[deploy] service status:"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo "[deploy] done"
