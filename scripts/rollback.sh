#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${ENV_FILE:-.env}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
DEPLOY_HASH_FILE="${ROOT_DIR}/.deploy-hash"
PREV_HASH_FILE="${ROOT_DIR}/.deploy-hash.prev"

ROLLBACK_TAG=""

for arg in "$@"; do
  case "$arg" in
    to=*)
      ROLLBACK_TAG="${arg#to=}"
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

# Resolve rollback target
if [ -z "$ROLLBACK_TAG" ]; then
  if [ ! -f "$PREV_HASH_FILE" ]; then
    echo "ERROR: no previous deployment found."
    echo "Usage: bash scripts/rollback.sh [to=<git-sha-short>]"
    echo ""
    echo "Available backend images:"
    docker images write_project-backend --format "  {{.Tag}}\t{{.CreatedAt}}" 2>/dev/null || echo "  (none found)"
    exit 1
  fi
  PREV_HASH="$(cat "$PREV_HASH_FILE")"
  ROLLBACK_TAG="${PREV_HASH:0:8}"
fi

CURRENT_TAG="$(cat "$DEPLOY_HASH_FILE" 2>/dev/null | head -c8 || echo "unknown")"
echo "[rollback] current deploy: ${CURRENT_TAG}"
echo "[rollback] rolling back to: ${ROLLBACK_TAG}"

if [ "$ROLLBACK_TAG" = "$CURRENT_TAG" ]; then
  echo "ERROR: rollback target is already the current deploy."
  exit 1
fi

# Verify backend image exists
if ! docker image inspect "write_project-backend:${ROLLBACK_TAG}" >/dev/null 2>&1; then
  echo "ERROR: image write_project-backend:${ROLLBACK_TAG} not found."
  echo ""
  echo "Available backend images:"
  docker images write_project-backend --format "  {{.Tag}}\t{{.CreatedAt}}" 2>/dev/null || echo "  (none found)"
  exit 1
fi

# Determine which public image to use for rollback
# Prefer the matching tag; fall back to 'latest' so the site stays up.
PUBLIC_ROLLBACK_TAG=""
if docker image inspect "write_project-public:${ROLLBACK_TAG}" >/dev/null 2>&1; then
  PUBLIC_ROLLBACK_TAG="$ROLLBACK_TAG"
  echo "[rollback] public image found for tag: ${ROLLBACK_TAG}"
elif docker image inspect "write_project-public:latest" >/dev/null 2>&1; then
  PUBLIC_ROLLBACK_TAG="latest"
  echo "WARN: write_project-public:${ROLLBACK_TAG} not found — using write_project-public:latest"
else
  echo "WARN: no write_project-public image found — public SSR routes will be unavailable"
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: missing env file: $ENV_FILE"
  exit 1
fi

echo "[rollback] stopping running containers..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" down

# Restore frontend dist
DIST_ROLLBACK="${ROOT_DIR}/dist.rollback"
if [ -d "$DIST_ROLLBACK" ]; then
  echo "[rollback] restoring frontend dist..."
  rm -rf "${ROOT_DIR}/dist"
  cp -a "$DIST_ROLLBACK" "${ROOT_DIR}/dist"
  echo "[rollback] dist restored"
else
  echo "WARN: dist.rollback/ not found — frontend will use current dist"
fi

# Start postgres (always uses a fixed image, no build needed)
echo "[rollback] starting postgres..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" up -d write_project-postgres

# Wait for postgres to be healthy
POSTGRES_CID="$(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps -q write_project-postgres 2>/dev/null || true)"
if [ -n "$POSTGRES_CID" ]; then
  for i in $(seq 1 30); do
    STATUS="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$POSTGRES_CID" 2>/dev/null || true)"
    case "$STATUS" in
      healthy|running)
        echo "[rollback] postgres ready ($STATUS)"
        break
        ;;
      *)
        [ "$i" -eq 30 ] && echo "WARN: postgres may not be fully ready" || sleep 2
        ;;
    esac
  done
fi

# Start backend with rollback image (skip build, skip dependent services)
echo "[rollback] starting backend with image write_project-backend:${ROLLBACK_TAG}..."
DEPLOY_TAG="$ROLLBACK_TAG" docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" \
  up -d --no-build --no-deps write_project-backend

# Start public Next.js app (must come before nginx which depends on it)
if [ -n "$PUBLIC_ROLLBACK_TAG" ]; then
  echo "[rollback] starting public app with image write_project-public:${PUBLIC_ROLLBACK_TAG}..."
  DEPLOY_TAG="$PUBLIC_ROLLBACK_TAG" docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" \
    up -d --no-build --no-deps write_project-public
else
  echo "WARN: skipping write_project-public — no image available"
fi

# Start frontend nginx (no build, serves restored dist)
echo "[rollback] starting frontend..."
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" \
  up -d --no-build --no-deps write_project-frontend

# Update hash files: swap current <-> prev so you can re-rollback back if needed
CURRENT_FULL_HASH="$(cat "$DEPLOY_HASH_FILE" 2>/dev/null || echo "")"
if [ -n "$CURRENT_FULL_HASH" ]; then
  echo "$CURRENT_FULL_HASH" > "$PREV_HASH_FILE"
fi
echo "$ROLLBACK_TAG" > "$DEPLOY_HASH_FILE"

echo "[rollback] done — service status:"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" ps

echo ""
echo "[rollback] to undo this rollback, run: bash scripts/rollback.sh"
