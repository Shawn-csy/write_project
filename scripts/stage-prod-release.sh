#!/usr/bin/env bash
# Preflight the writable release stack beside production without switching traffic.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAG="${RELEASE_TAG:-candidate-lcp-20261110}"
MODE="${1:---start}"
NETWORK=write_project_default
API=wp-prod-release-api
PUBLIC=wp-prod-release-public
EDGE=wp-prod-release-preflight
LEGACY=wp-prod-legacy-preflight
SOURCE_API="${MIGRATION_SOURCE_BACKEND:-$(python3 "$ROOT/scripts/site-release.py" current-api)}"
SOURCE_PUBLIC=write_project-write_project-public-1
CONFIG_ROOT="${TMPDIR:-/tmp}/wp-prod-release-preflight"
DIST="$ROOT/dist/releases/$TAG"

[[ "$TAG" =~ ^[A-Za-z0-9][A-Za-z0-9._-]*$ ]] || { echo "ERROR: invalid release tag" >&2; exit 2; }
case "$MODE" in --start|--status|--stop) ;; *) echo "Usage: RELEASE_TAG=<tag> $0 [--start|--status|--stop]" >&2; exit 2 ;; esac

remove_config() {
  for path in "$CONFIG_ROOT/candidate/default.conf" "$CONFIG_ROOT/legacy/default.conf"; do
    [ ! -f "$path" ] || unlink "$path"
  done
  for path in "$CONFIG_ROOT/candidate" "$CONFIG_ROOT/legacy" "$CONFIG_ROOT"; do
    [ ! -d "$path" ] || rmdir "$path"
  done
}

stop_stack() {
  for name in "$EDGE" "$LEGACY" "$PUBLIC" "$API"; do
    if docker inspect "$name" >/dev/null 2>&1; then docker stop "$name" >/dev/null; fi
  done
  remove_config
}

loopback_url() {
  local name="$1" port
  port="$(docker port "$name" 80/tcp 2>/dev/null | sed -n 's/^127\.0\.0\.1://p' | head -1)"
  [ -n "$port" ] || return 1
  echo "http://127.0.0.1:$port"
}

if [ "$MODE" = --stop ]; then
  stop_stack
  echo "[release] preflight stack stopped"
  exit 0
fi
if [ "$MODE" = --status ]; then
  for name in "$API" "$PUBLIC" "$EDGE" "$LEGACY"; do
    docker inspect -f '{{.Name}} {{.State.Status}}' "$name" 2>/dev/null || true
  done
  loopback_url "$EDGE" || true
  loopback_url "$LEGACY" || true
  exit 0
fi

for name in "$SOURCE_API" "$SOURCE_PUBLIC"; do
  [ "$(docker inspect -f '{{.State.Running}}' "$name" 2>/dev/null || true)" = true ] || {
    echo "ERROR: source service is not running: $name" >&2; exit 1;
  }
done
for image in "write_project-backend:$TAG" "write_project-public:$TAG"; do
  docker image inspect "$image" >/dev/null 2>&1 || { echo "ERROR: missing image: $image" >&2; exit 1; }
done
[ -f "$DIST/index.html" ] || { echo "ERROR: missing static release: $DIST" >&2; exit 1; }
docker network inspect "$NETWORK" >/dev/null 2>&1 || { echo "ERROR: missing production network" >&2; exit 1; }
for name in "$API" "$PUBLIC" "$EDGE" "$LEGACY"; do
  if docker inspect "$name" >/dev/null 2>&1; then
    echo "ERROR: preflight container exists: $name (inspect before --stop)" >&2; exit 1
  fi
done
[ ! -e "$CONFIG_ROOT" ] || { echo "ERROR: existing preflight config directory" >&2; exit 1; }
mkdir -m 700 "$CONFIG_ROOT"
mkdir -m 700 "$CONFIG_ROOT/candidate" "$CONFIG_ROOT/legacy"
api_env=""
public_env=""
cleanup() {
  local status=$?
  [ -z "$api_env" ] || unlink "$api_env" 2>/dev/null || true
  [ -z "$public_env" ] || unlink "$public_env" 2>/dev/null || true
  if [ "$status" != 0 ]; then stop_stack; fi
}
trap cleanup EXIT
cp "$ROOT/deploy/nginx/default.conf" "$CONFIG_ROOT/legacy/default.conf"
python3 - "$ROOT/deploy/nginx/default.conf" "$CONFIG_ROOT/candidate/default.conf" <<'PY'
from pathlib import Path
import sys

source, target = map(Path, sys.argv[1:])
config = source.read_text()
for old, new in (
    ('set $backend "write_project-backend";', 'set $backend "wp-prod-release-api";'),
    ('set $public "write_project-public";', 'set $public "wp-prod-release-public";'),
):
    if config.count(old) != 1:
        raise SystemExit(f'ERROR: expected exactly one upstream: {old}')
    config = config.replace(old, new)
target.write_text(config)
PY

api_env="$(mktemp "${TMPDIR:-/tmp}/wp-release-api-env.XXXXXX")"
public_env="$(mktemp "${TMPDIR:-/tmp}/wp-release-public-env.XXXXXX")"
chmod 600 "$api_env" "$public_env"

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

docker run --rm -d --name "$API" --network "$NETWORK" --network-alias "$API" \
  --env-file "$api_env" -e DB_AUTO_CREATE_TABLES=0 -e DB_RUN_LEGACY_MIGRATIONS=0 \
  -e "TRUSTED_PROXY_HOSTNAME=$EDGE" \
  -e "NEXTJS_REVALIDATE_URL=http://$PUBLIC:3000/api/revalidate" \
  -v "$ROOT/server/data:/data" -v "$ROOT/server/secrets:/secrets:ro" \
  -v "$DIST:/app/dist:ro" "write_project-backend:$TAG" >/dev/null
docker run --rm -d --name "$PUBLIC" --network "$NETWORK" --network-alias "$PUBLIC" \
  --env-file "$public_env" -e "BACKEND_API_URL=http://$API:1091" \
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
  [ "$ready" = 1 ] || { echo "ERROR: $service readiness failed" >&2; exit 1; }
done

docker run --rm -d --name "$EDGE" --network "$NETWORK" --network-alias "$EDGE" \
  -p 127.0.0.1::80 -p '[::1]::80' \
  -v "$DIST:/usr/share/nginx/html:ro" \
  -v "$CONFIG_ROOT/candidate:/etc/nginx/conf.d:ro" nginx:alpine >/dev/null
docker run --rm -d --name "$LEGACY" --network "$NETWORK" \
  -p 127.0.0.1::80 -p '[::1]::80' \
  -v "$ROOT/dist:/usr/share/nginx/html:ro" \
  -v "$CONFIG_ROOT/legacy:/etc/nginx/conf.d:ro" nginx:alpine >/dev/null

for name in "$EDGE" "$LEGACY"; do
  docker exec "$name" nginx -t >/dev/null 2>&1
  url="$(loopback_url "$name")"
  for _ in $(seq 1 20); do
    if curl -fs -o /dev/null -m 3 "$url/healthz"; then break; fi
    sleep 1
  done
  for route in /healthz /api/health/ready /api/public-bundle / /authors /audio-works /voice-actors /activities /login; do
    code="$(curl -sS -o /dev/null -w '%{http_code}' -m 15 "$url$route")"
    if [ "$name" = "$EDGE" ]; then
      expected=200
    else
      expected="$(curl -sS -o /dev/null -w '%{http_code}' -m 15 "http://127.0.0.1:1090$route")"
    fi
    [ "$code" = "$expected" ] || { echo "ERROR: $name $route returned $code (expected $expected)" >&2; exit 1; }
  done
  ipv6_port="$(docker port "$name" 80/tcp | sed -n 's/^\[::1\]://p' | head -1)"
  [ -n "$ipv6_port" ] || { echo "ERROR: missing IPv6 loopback binding: $name" >&2; exit 1; }
  curl -gfs -o /dev/null -m 3 "http://[::1]:$ipv6_port/healthz"
  echo "[release] $name ready at $url and IPv6 loopback"
done
echo "[release] both paths ready; no public traffic switched"
echo "[release] stop with: bash scripts/stage-prod-release.sh --stop"
