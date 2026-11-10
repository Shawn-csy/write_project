#!/usr/bin/env bash
# One-time site-only migration of the running release from dist/ to releases/.
# The original API/public containers and PostgreSQL stay running for rollback.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TAG=candidate-date-20261110
ARTIFACT="$ROOT/releases/$TAG"
NETWORK=write_project_default
CURRENT_API=wp-prod-live-api
CURRENT_PUBLIC=wp-prod-live-public
CURRENT_EDGE=wp-prod-live-edge
API=wp-prod-durable-api
PUBLIC=wp-prod-durable-public
EDGE=wp-prod-durable-edge
CHECK=wp-prod-durable-check
CURRENT_CHECK=wp-prod-current-check
FALLBACK=wp-prod-current-edge
CONFIG="$ARTIFACT/nginx-durable"
CURRENT_CONFIG="$ARTIFACT/nginx-live"
ROUTES=(/healthz /api/health/ready /api/public-bundle / /authors /audio-works /voice-actors /activities /login)
MODE="${1:---status}"

case "$MODE" in --prepare|--activate|--rollback|--stop-prepared|--status) ;; *)
  echo "Usage: $0 [--prepare|--activate|--rollback|--stop-prepared|--status]" >&2; exit 2 ;;
esac
running() { [ "$(docker inspect -f '{{.State.Running}}' "$1" 2>/dev/null || true)" = true ]; }
exists() { docker inspect "$1" >/dev/null 2>&1; }
remove_container() {
  if exists "$1"; then
    docker stop "$1" >/dev/null 2>&1 || true
    # --rm containers can enter Docker's asynchronous removal between inspect and rm.
    for _ in $(seq 1 30); do
      ! exists "$1" && return 0
      docker rm "$1" >/dev/null 2>&1 && return 0
      sleep 0.2
    done
    ! exists "$1"
  fi
}
url_for() {
  local port
  port="$(docker port "$1" 80/tcp 2>/dev/null | sed -n 's/^127\.0\.0\.1://p' | head -1)"
  [ -n "$port" ] || return 1
  echo "http://127.0.0.1:$port"
}
probe() {
  local base="$1" route code
  for route in "${ROUTES[@]}"; do
    code="$(curl -sS -o /dev/null -w '%{http_code}' -m 15 "$base$route")"
    [ "$code" = 200 ] || { echo "ERROR: $base$route returned $code" >&2; return 1; }
  done
}
wait_edge() {
  local base="$1"
  for _ in $(seq 1 20); do
    if curl -fs -o /dev/null -m 3 "$base/healthz"; then return 0; fi
    sleep 1
  done
  return 1
}
check_ipv6() {
  local port
  port="$(docker port "$1" 80/tcp | sed -n 's/^\[::1\]://p' | head -1)"
  [ -n "$port" ] && curl -gfs -o /dev/null -m 3 "http://[::1]:$port/healthz"
}
start_edge() {
  local name="$1" config="$2" publish="$3" alias="$4"
  if [ "$publish" = fixed ]; then
    docker run -d --name "$name" --restart unless-stopped --memory 128m \
      --network "$NETWORK" --network-alias "$alias" \
      -p 127.0.0.1:1090:80 -p '[::1]:1090:80' \
      -v "$ARTIFACT:/usr/share/nginx/html:ro" \
      -v "$config:/etc/nginx/conf.d:ro" nginx:alpine >/dev/null
  else
    docker run --rm -d --name "$name" --network "$NETWORK" --network-alias "$alias" \
      -p 127.0.0.1::80 -p '[::1]::80' \
      -v "$ARTIFACT:/usr/share/nginx/html:ro" \
      -v "$config:/etc/nginx/conf.d:ro" nginx:alpine >/dev/null
  fi
}
restore_current() {
  remove_container "$EDGE"
  remove_container "$FALLBACK"
  start_edge "$FALLBACK" "$CURRENT_CONFIG" fixed "$CURRENT_EDGE"
  wait_edge http://127.0.0.1:1090
  probe http://127.0.0.1:1090
  check_ipv6 "$FALLBACK"
  echo "[relocate] previous release restored on loopback port 1090"
}

if [ "$MODE" = --status ]; then
  for name in "$CURRENT_API" "$CURRENT_PUBLIC" "$CURRENT_EDGE" "$API" "$PUBLIC" "$EDGE" "$FALLBACK"; do
    docker inspect -f '{{.Name}} {{.State.Status}}' "$name" 2>/dev/null || true
  done
  exit 0
fi
if [ "$MODE" = --rollback ]; then
  running "$EDGE" || { echo "ERROR: durable edge is not live" >&2; exit 1; }
  running "$CURRENT_API" && running "$CURRENT_PUBLIC" || { echo "ERROR: previous API/public unavailable" >&2; exit 1; }
  restore_current
  exit 0
fi
if [ "$MODE" = --stop-prepared ]; then
  running "$EDGE" && { echo "ERROR: durable edge is live" >&2; exit 1; }
  remove_container "$CHECK"
  remove_container "$CURRENT_CHECK"
  remove_container "$PUBLIC"
  remove_container "$API"
  echo "[relocate] prepared containers stopped"
  exit 0
fi

[ -f "$ARTIFACT/index.html" ] && [ -f "$CURRENT_CONFIG/default.conf" ] || {
  echo "ERROR: durable release snapshot missing" >&2; exit 1;
}
for name in "$CURRENT_API" "$CURRENT_PUBLIC" "$CURRENT_EDGE"; do
  running "$name" || { echo "ERROR: current release not running: $name" >&2; exit 1; }
done
if [ "$MODE" = --prepare ]; then
  for name in "$API" "$PUBLIC" "$EDGE" "$CHECK" "$CURRENT_CHECK" "$FALLBACK"; do
    ! exists "$name" || { echo "ERROR: container already exists: $name" >&2; exit 1; }
  done
  for image in "write_project-backend:$TAG" "write_project-public:$TAG"; do
    docker image inspect "$image" >/dev/null 2>&1 || { echo "ERROR: missing image: $image" >&2; exit 1; }
  done
  mkdir -p "$CONFIG"
  python3 - "$CURRENT_CONFIG/default.conf" "$CONFIG/default.conf" <<'PY'
from pathlib import Path
import sys
source, target = map(Path, sys.argv[1:])
config = source.read_text()
for old, new in (
    ('set $backend "wp-prod-live-api";', 'set $backend "wp-prod-durable-api";'),
    ('set $public "wp-prod-live-public";', 'set $public "wp-prod-durable-public";'),
):
    if config.count(old) != 1:
        raise SystemExit(f'ERROR: expected one current upstream: {old}')
    config = config.replace(old, new)
target.write_text(config)
PY
  api_env="$(mktemp "${TMPDIR:-/tmp}/wp-durable-api-env.XXXXXX")"
  public_env="$(mktemp "${TMPDIR:-/tmp}/wp-durable-public-env.XXXXXX")"
  chmod 600 "$api_env" "$public_env"
  ready=0
  cleanup_prepare() {
    local status=$?
    unlink "$api_env" 2>/dev/null || true
    unlink "$public_env" 2>/dev/null || true
    if [ "$status" != 0 ] && [ "$ready" != 1 ]; then
      remove_container "$CHECK"
      remove_container "$CURRENT_CHECK"
      remove_container "$PUBLIC"
      remove_container "$API"
    fi
  }
  trap cleanup_prepare EXIT
  for spec in "$CURRENT_API:$api_env" "$CURRENT_PUBLIC:$public_env"; do
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
  docker run -d --name "$API" --restart unless-stopped --memory 768m \
    --network "$NETWORK" --network-alias "$API" --env-file "$api_env" \
    -e DB_AUTO_CREATE_TABLES=0 -e DB_RUN_LEGACY_MIGRATIONS=0 \
    -e "TRUSTED_PROXY_HOSTNAME=$EDGE" \
    -e "NEXTJS_REVALIDATE_URL=http://$PUBLIC:3000/api/revalidate" \
    -v "$ROOT/server/data:/data" -v "$ROOT/server/secrets:/secrets:ro" \
    -v "$ARTIFACT:/app/dist:ro" "write_project-backend:$TAG" >/dev/null
  docker run -d --name "$PUBLIC" --restart unless-stopped --memory 512m \
    --network "$NETWORK" --network-alias "$PUBLIC" --env-file "$public_env" \
    -e "BACKEND_API_URL=http://$API:1091" "write_project-public:$TAG" >/dev/null
  for service in api public; do
    healthy=0
    for _ in $(seq 1 40); do
      if [ "$service" = api ]; then
        docker exec "$API" python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:1091/api/health/ready', timeout=3)" >/dev/null 2>&1 && healthy=1
      else
        docker exec "$PUBLIC" node -e "fetch('http://127.0.0.1:3000/api/health/ready').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1 && healthy=1
      fi
      [ "$healthy" = 1 ] && break
      sleep 1
    done
    [ "$healthy" = 1 ] || { echo "ERROR: $service readiness failed" >&2; exit 1; }
  done
  start_edge "$CHECK" "$CONFIG" random "$EDGE"
  start_edge "$CURRENT_CHECK" "$CURRENT_CONFIG" random "$CURRENT_EDGE"
  for name in "$CHECK" "$CURRENT_CHECK"; do
    docker exec "$name" nginx -t >/dev/null 2>&1
    base="$(url_for "$name")"
    wait_edge "$base"
    probe "$base"
    check_ipv6 "$name"
  done
  ready=1
  echo "[relocate] both durable and current paths ready; no traffic switched"
  echo "[relocate] activate with: bash scripts/relocate-prod-release.sh --activate"
  exit 0
fi

for name in "$API" "$PUBLIC" "$CHECK" "$CURRENT_CHECK"; do
  running "$name" || { echo "ERROR: prepared container unavailable: $name" >&2; exit 1; }
done
for name in "$CHECK" "$CURRENT_CHECK"; do
  base="$(url_for "$name")"
  probe "$base"
  check_ipv6 "$name"
done
switched=0
activated=0
cleanup_activate() {
  local status=$?
  if [ "$switched" = 1 ] && [ "$activated" != 1 ]; then
    echo "[relocate] handoff failed; restoring previous release" >&2
    restore_current || echo "CRITICAL: automatic restore failed" >&2
  fi
  if [ "$activated" = 1 ]; then
    remove_container "$CHECK"
    remove_container "$CURRENT_CHECK"
  fi
  return "$status"
}
trap cleanup_activate EXIT
trap 'exit 1' INT TERM
echo "[relocate] handing over only port 1090"
switched=1
docker stop -t 10 "$CURRENT_EDGE" >/dev/null
start_edge "$EDGE" "$CONFIG" fixed "$EDGE"
wait_edge http://127.0.0.1:1090
probe http://127.0.0.1:1090
check_ipv6 "$EDGE"
activated=1
echo "[relocate] durable release live on loopback port 1090"
echo "[relocate] rollback: bash scripts/relocate-prod-release.sh --rollback"
