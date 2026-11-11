#!/usr/bin/env bash
# Run the reviewed release beside production for read-only smoke and benchmarks.
# No public traffic is switched; all candidate containers are removed by --stop.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:---start}"
TAG="${CANDIDATE_TAG:-candidate-20261110}"
NETWORK=write_project_default
SOURCE_API="${MIGRATION_SOURCE_BACKEND:-$(python3 "$ROOT_DIR/scripts/site-release.py" current-api)}"
SOURCE_PUBLIC=write_project-write_project-public-1
API=wp-prod-candidate-api
PUBLIC=wp-prod-candidate-public
EDGE=wp-prod-candidate-edge
CONFIG="${TMPDIR:-/tmp}/wp-prod-candidate-nginx.conf"
DIST="$ROOT_DIR/dist/releases/$TAG"

usage() { echo "Usage: CANDIDATE_TAG=<tag> $0 [--start|--status|--stop]" >&2; exit 2; }
[ "$#" -le 1 ] || usage
case "$MODE" in --start|--status|--stop) ;; *) usage ;; esac

stop_candidate() {
  docker rm -f "$EDGE" "$PUBLIC" "$API" >/dev/null 2>&1 || true
  if [ -f "$CONFIG" ]; then unlink "$CONFIG"; fi
}

candidate_url() {
  local port
  port="$(docker port "$EDGE" 80/tcp 2>/dev/null | sed -n 's/^127\.0\.0\.1://p' | head -1)"
  [ -n "$port" ] || return 1
  echo "http://127.0.0.1:$port"
}

if [ "$MODE" = --stop ]; then
  stop_candidate
  echo "[candidate] stopped"
  exit 0
fi
if [ "$MODE" = --status ]; then
  for name in "$API" "$PUBLIC" "$EDGE"; do
    docker inspect -f '{{.Name}} {{.State.Status}}' "$name" 2>/dev/null || true
  done
  candidate_url || true
  exit 0
fi

for name in "$SOURCE_API" "$SOURCE_PUBLIC"; do
  [ "$(docker inspect -f '{{.State.Running}}' "$name" 2>/dev/null || true)" = true ] || {
    echo "ERROR: production source is not running: $name" >&2; exit 1;
  }
done
for image in "write_project-backend:$TAG" "write_project-public:$TAG"; do
  docker image inspect "$image" >/dev/null 2>&1 || {
    echo "ERROR: missing candidate image: $image" >&2; exit 1;
  }
done
[ -f "$DIST/index.html" ] || { echo "ERROR: missing candidate build: $DIST/index.html" >&2; exit 1; }
docker network inspect "$NETWORK" >/dev/null 2>&1 || { echo "ERROR: missing production network" >&2; exit 1; }
for name in "$API" "$PUBLIC" "$EDGE"; do
  if docker inspect "$name" >/dev/null 2>&1; then
    echo "ERROR: candidate container already exists: $name (use --stop first)" >&2
    exit 1
  fi
done

api_env="$(mktemp "${TMPDIR:-/tmp}/wp-candidate-api-env.XXXXXX")"
public_env="$(mktemp "${TMPDIR:-/tmp}/wp-candidate-public-env.XXXXXX")"
chmod 600 "$api_env" "$public_env"
started=0
cleanup() {
  local status=$?
  for file in "$api_env" "$public_env"; do
    unlink "$file" 2>/dev/null || true
  done
  if [ "$status" != 0 ] && [ "$started" = 1 ]; then stop_candidate; fi
}
trap cleanup EXIT

# Reuse the running container's exact production env without printing secrets.
for spec in "$SOURCE_API:$api_env" "$SOURCE_PUBLIC:$public_env"; do
  source_name="${spec%%:*}"
  env_path="${spec#*:}"
  docker inspect -f '{{json .Config.Env}}' "$source_name" | python3 -c '
import json, sys
for entry in json.load(sys.stdin):
    if "\n" in entry or "\r" in entry:
        raise SystemExit("ERROR: multi-line container env cannot be copied safely")
    print(entry)
' > "$env_path"
done

python3 - "$ROOT_DIR/nginx.conf" "$CONFIG" <<'PY'
from pathlib import Path
import sys

source, target = map(Path, sys.argv[1:])
config = source.read_text()
for old, new in (
    ('set $backend "write_project-backend";', 'set $backend "wp-prod-candidate-api";'),
    ('set $public "write_project-public";', 'set $public "wp-prod-candidate-public";'),
):
    if config.count(old) != 1:
        raise SystemExit(f'ERROR: expected exactly one nginx upstream: {old}')
    config = config.replace(old, new)
target.write_text(config)
PY

started=1
docker run --rm -d --name "$API" --network "$NETWORK" \
  --network-alias "$API" --env-file "$api_env" \
  -e DB_AUTO_CREATE_TABLES=0 -e DB_RUN_LEGACY_MIGRATIONS=0 \
  -e 'PGOPTIONS=-c default_transaction_read_only=on' \
  -e "TRUSTED_PROXY_HOSTNAME=$EDGE" \
  -e "NEXTJS_REVALIDATE_URL=http://$PUBLIC:3000/api/revalidate" \
  -v "$ROOT_DIR/server/data:/data:ro" \
  -v "$ROOT_DIR/server/secrets:/secrets:ro" \
  -v "$DIST:/app/dist:ro" \
  "write_project-backend:$TAG" >/dev/null
docker run --rm -d --name "$PUBLIC" --network "$NETWORK" \
  --network-alias "$PUBLIC" --env-file "$public_env" \
  -e "BACKEND_API_URL=http://$API:1091" \
  "write_project-public:$TAG" >/dev/null

for service in api public; do
  ready=0
  for _ in $(seq 1 40); do
    if [ "$service" = api ]; then
      docker exec "$API" python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:1091/api/health/ready', timeout=3)" >/dev/null 2>&1 && ready=1
    else
      docker exec "$PUBLIC" node -e "fetch('http://127.0.0.1:3000/api/health/ready').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1 && ready=1
    fi
    [ "$ready" = 1 ] && break
    sleep 1
  done
  [ "$ready" = 1 ] || {
    echo "ERROR: candidate $service readiness failed" >&2
    docker logs --tail 40 "$API" >&2 || true
    docker logs --tail 40 "$PUBLIC" >&2 || true
    exit 1
  }
done

docker run --rm -d --name "$EDGE" --network "$NETWORK" \
  -p 127.0.0.1::80 -v "$DIST:/usr/share/nginx/html:ro" \
  -v "$CONFIG:/etc/nginx/conf.d/default.conf:ro" nginx:alpine >/dev/null
url="$(candidate_url)" || { echo "ERROR: candidate edge has no loopback port" >&2; exit 1; }
for _ in $(seq 1 30); do
  if curl -fs -o /dev/null -m 3 "$url/healthz"; then break; fi
  sleep 1
done
for path in /healthz /api/health/ready /api/public-bundle / /authors /audio-works /voice-actors /activities /login; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' -m 15 "$url$path")"
  [ "$code" = 200 ] || { echo "ERROR: candidate $path returned $code" >&2; exit 1; }
done
echo "[candidate] read-only stack ready at $url"
echo "[candidate] stop with: bash scripts/stage-prod-candidate-readonly.sh --stop"
