#!/usr/bin/env bash
# Read-only production snapshot -> disposable PostgreSQL -> migration and old/new API smoke.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_PG=write_project-write_project-postgres-1
SOURCE_API="${MIGRATION_SOURCE_BACKEND:-$(python3 "$ROOT_DIR/scripts/site-release.py" current-api)}"
SUFFIX="$(python3 -c 'import secrets; print(secrets.token_hex(5))')"
CLONE_NETWORK="wp-schema-${SUFFIX}"
CLONE_VOLUME="wp-schema-${SUFFIX}"
CLONE_PG="wp-schema-pg-${SUFFIX}"
CLONE_API="wp-schema-api-${SUFFIX}"
CLONE_PUBLIC="wp-schema-public-${SUFFIX}"
CLONE_EDGE="wp-schema-edge-${SUFFIX}"
CLONE_DATABASE_URL="postgresql+psycopg://write_project:rehearsal_local_only@${CLONE_PG}:5432/write_project"

cleanup() {
  local exit_status=$?
  docker rm -f "$CLONE_EDGE" "$CLONE_PUBLIC" "$CLONE_API" >/dev/null 2>&1 || true
  docker rm -f "$CLONE_PG" >/dev/null 2>&1 || true
  local volume_removed=0
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if docker volume rm "$CLONE_VOLUME" >/dev/null 2>&1; then
      volume_removed=1
      break
    fi
    sleep 1
  done
  if [ "$volume_removed" != 1 ] && docker volume inspect "$CLONE_VOLUME" >/dev/null 2>&1; then
    echo "WARNING: disposable database volume remains: $CLONE_VOLUME" >&2
  fi
  if ! docker network rm "$CLONE_NETWORK" >/dev/null 2>&1 && docker network inspect "$CLONE_NETWORK" >/dev/null 2>&1; then
    echo "WARNING: disposable network remains: $CLONE_NETWORK" >&2
  fi
  return "$exit_status"
}
trap cleanup EXIT

for cid in "$SOURCE_PG" "$SOURCE_API"; do
  if [ "$(docker inspect -f '{{.State.Running}}' "$cid" 2>/dev/null || true)" != "true" ]; then
    echo "ERROR: production source container is not running: $cid" >&2
    exit 1
  fi
done
SOURCE_IMAGE="$(docker inspect -f '{{.Image}}' "$SOURCE_API")"

# Only the source's pg_dump process touches production; all writes target the clone.
docker network create "$CLONE_NETWORK" >/dev/null
docker volume create "$CLONE_VOLUME" >/dev/null
docker run --rm -d --name "$CLONE_PG" --network "$CLONE_NETWORK" \
  -e POSTGRES_USER=write_project -e POSTGRES_PASSWORD=rehearsal_local_only \
  -e POSTGRES_DB=write_project -v "$CLONE_VOLUME:/var/lib/postgresql/data" \
  postgres:16-alpine >/dev/null

ready=0
for _ in $(seq 1 30); do
  # The image's temporary init server accepts Unix sockets before it shuts
  # down and starts the final server. TCP is ready only after that handoff.
  if docker exec "$CLONE_PG" pg_isready -h 127.0.0.1 -U write_project -d write_project >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
if [ "$ready" != 1 ]; then
  echo "ERROR: disposable PostgreSQL did not become ready" >&2
  exit 1
fi

echo "[schema rehearsal] cloning production through pg_dump (no source writes)"
docker exec "$SOURCE_PG" sh -c 'exec pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' \
  | docker exec -i "$CLONE_PG" pg_restore -U write_project -d write_project --no-owner --no-privileges

count_sql="SELECT 'scripts',count(*) FROM scripts UNION ALL SELECT 'external_public_scripts',count(*) FROM external_public_scripts UNION ALL SELECT 'script_likes',count(*) FROM script_likes UNION ALL SELECT 'personas',count(*) FROM personas UNION ALL SELECT 'organizations',count(*) FROM organizations UNION ALL SELECT 'public_feedback',count(*) FROM public_feedback"
source_counts="$(docker exec "$SOURCE_PG" sh -c 'exec psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Atc "$1"' _ "$count_sql ORDER BY 1")"

echo "[schema rehearsal] applying current schema to the disposable clone"
migration_args=(--rm --network "$CLONE_NETWORK"
  -e "DATABASE_URL=$CLONE_DATABASE_URL"
  -v "$ROOT_DIR/server:/app:ro" "$SOURCE_IMAGE")
if [ "${REHEARSAL_READ_PROBE:-0}" = 1 ]; then
  docker run -i -e "REHEARSAL_WRITE_PROBE=${REHEARSAL_WRITE_PROBE:-0}" "${migration_args[@]}" python - <<'PY'
import os
import threading
import time

from sqlalchemy import text

import database
from scripts.run_schema_migration import apply_schema_migration, configure_migration_limits

configure_migration_limits()

stop = threading.Event()
tables = ('scripts', 'personas', 'public_feedback', 'external_public_scripts', 'script_likes')
write_columns = {
    'scripts': 'lastModified',
    'personas': 'updatedAt',
    'public_feedback': 'updatedAt',
    'external_public_scripts': 'updatedAt',
}
probe_specs = [('read', table) for table in tables]
if os.getenv('REHEARSAL_WRITE_PROBE') == '1':
    probe_specs.extend(('write', table) for table in write_columns)
results = {f'{mode}:{table}': {'latencies': [], 'errors': []} for mode, table in probe_specs}

def probe_while_migrating(mode, table):
    key = f'{mode}:{table}'
    if mode == 'read':
        query = text(f'SELECT 1 FROM {table} LIMIT 1')
    else:
        column = write_columns[table]
        query = text(f'UPDATE {table} SET "{column}" = "{column}" '
                     f'WHERE id = (SELECT id FROM {table} LIMIT 1)')
    while not stop.is_set():
        started = time.monotonic()
        try:
            with database.engine.connect() as conn:
                result = conn.execute(query)
                if mode == 'read':
                    result.fetchone()
                else:
                    conn.rollback()  # Probe writes must never persist in the clone.
        except Exception as exc:
            results[key]['errors'].append(str(exc).splitlines()[0])
        results[key]['latencies'].append(time.monotonic() - started)
        stop.wait(0.05)

probes = [threading.Thread(target=probe_while_migrating, args=spec, daemon=True) for spec in probe_specs]
for probe in probes:
    probe.start()
try:
    apply_schema_migration()
finally:
    stop.set()
    for probe in probes:
        probe.join(timeout=35)
    for key, result in results.items():
        latencies = result['latencies']
        if latencies:
            print(f'[schema rehearsal] concurrent {key}: samples={len(latencies)} '
                  f'max_ms={max(latencies) * 1000:.0f} errors={len(result["errors"])}', flush=True)
            if result['errors']:
                print(f'[schema rehearsal] {key} first error: {result["errors"][0]}', flush=True)
if any(result['errors'] for result in results.values()):
    raise SystemExit('ERROR: concurrent requests failed during schema migration')
PY
else
  docker run "${migration_args[@]}" \
    python -m scripts.run_schema_migration --apply
fi

clone_counts="$(docker exec "$CLONE_PG" psql -U write_project -d write_project -Atc "$count_sql ORDER BY 1")"
if [ "$source_counts" != "$clone_counts" ]; then
  echo "ERROR: core row counts changed during schema migration" >&2
  exit 1
fi
echo "[schema rehearsal] core row counts preserved"

idempotency_sql="$count_sql UNION ALL SELECT 'external_authors',count(*) FROM external_authors UNION ALL SELECT 'persona_roles',count(*) FROM persona_roles UNION ALL SELECT 'persona_organization_memberships',count(*) FROM persona_organization_memberships ORDER BY 1"
first_migration_counts="$(docker exec "$CLONE_PG" psql -U write_project -d write_project -Atc "$idempotency_sql")"
echo "[schema rehearsal] checking migration lock rejection"
docker run -i "${migration_args[@]}" python - <<'PY'
from sqlalchemy import text

import database
from scripts.run_schema_migration import LOCK_KEY, apply_schema_migration, configure_migration_limits

configure_migration_limits()
with database.engine.connect() as holder:
    holder.execute(text('SELECT pg_advisory_lock(:namespace, :key)'),
                   {'namespace': LOCK_KEY[0], 'key': LOCK_KEY[1]})
    holder.commit()
    try:
        try:
            apply_schema_migration()
        except RuntimeError as exc:
            if 'already running' not in str(exc):
                raise
        else:
            raise SystemExit('ERROR: second migration acquired the held advisory lock')
    finally:
        holder.execute(text('SELECT pg_advisory_unlock(:namespace, :key)'),
                       {'namespace': LOCK_KEY[0], 'key': LOCK_KEY[1]})
        holder.commit()
print('[schema rehearsal] concurrent migration rejected')
PY
echo "[schema rehearsal] re-running migration to verify idempotency"
docker run "${migration_args[@]}" \
  python -m scripts.run_schema_migration --apply
second_migration_counts="$(docker exec "$CLONE_PG" psql -U write_project -d write_project -Atc "$idempotency_sql")"
if [ "$first_migration_counts" != "$second_migration_counts" ]; then
  echo "ERROR: table row counts changed on repeated migration" >&2
  exit 1
fi

for version in old new; do
  echo "[schema rehearsal] checking $version API against the clone"
  run_args=(--network "$CLONE_NETWORK")
  if [ "$version" = new ]; then run_args+=(-v "$ROOT_DIR/server:/app:ro"); fi
  docker run --rm -i "${run_args[@]}" \
    -e "DATABASE_URL=$CLONE_DATABASE_URL" -e 'PGOPTIONS=-c default_transaction_read_only=on' \
    -e DB_AUTO_CREATE_TABLES=0 -e DB_RUN_LEGACY_MIGRATIONS=0 \
    -e ENVIRONMENT=development -e MEDIA_STORAGE_ROOT=/tmp/media \
    "$SOURCE_IMAGE" python - "$version" <<'PY'
import sys
from fastapi.testclient import TestClient
from main import app

version = sys.argv[1]
with TestClient(app) as client:
    ready = client.get('/api/health/ready')
    bundle = client.get('/api/public-bundle?sections=scripts,externalPublicScripts,personas,organizations,activityPages,demoSubmissions,banner,audioWorks')
    if ready.status_code != 200 or bundle.status_code != 200:
        raise SystemExit(f'{version}: readiness={ready.status_code}, bundle={bundle.status_code}')
    if version == 'new' and len(ready.json().get('publicApiCapabilities', [])) != 4:
        raise SystemExit('new API did not declare all public capabilities')
    data = bundle.json()
    print(f"{version}: ready=200 bundle=200 scripts={len(data.get('scripts', []))} external={len(data.get('externalPublicScripts', []))}")
PY
done
if [ "${REHEARSAL_REAL_CONTAINERS:-0}" = 1 ]; then
  candidate_tag="${REHEARSAL_CANDIDATE_TAG:-candidate-20261110}"
  candidate_backend="write_project-backend:${candidate_tag}"
  candidate_public="write_project-public:${candidate_tag}"
  candidate_dist="$ROOT_DIR/dist/releases/${candidate_tag}"
  for image_name in "$candidate_backend" "$candidate_public"; do
    docker image inspect "$image_name" >/dev/null 2>&1 || {
      echo "ERROR: candidate image missing: $image_name" >&2
      exit 1
    }
  done
  if [ ! -f "$candidate_dist/index.html" ]; then
    echo "ERROR: candidate static build missing: $candidate_dist/index.html" >&2
    exit 1
  fi

  echo "[schema rehearsal] starting real candidate API and public containers"
  docker run --rm -d --name "$CLONE_API" --network "$CLONE_NETWORK" \
    --network-alias write_project-backend -e "DATABASE_URL=$CLONE_DATABASE_URL" \
    -e 'PGOPTIONS=-c default_transaction_read_only=on' \
    -e DB_AUTO_CREATE_TABLES=0 -e DB_RUN_LEGACY_MIGRATIONS=0 \
    -e ENVIRONMENT=development -e MEDIA_STORAGE_ROOT=/tmp/media \
    -e TRUSTED_PROXY_HOSTNAME=write_project-frontend \
    "$candidate_backend" >/dev/null
  docker run --rm -d --name "$CLONE_PUBLIC" --network "$CLONE_NETWORK" \
    --network-alias write_project-public \
    -e BACKEND_API_URL=http://write_project-backend:1091 \
    -e NEXT_PUBLIC_BASE_URL=https://open-scripts.shawnup.com \
    "$candidate_public" >/dev/null

  for service in api public; do
    ready=0
    for _ in $(seq 1 40); do
      if [ "$service" = api ]; then
        docker exec "$CLONE_API" python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:1091/api/health/ready', timeout=3)" >/dev/null 2>&1 && ready=1
      else
        docker exec "$CLONE_PUBLIC" node -e "fetch('http://127.0.0.1:3000/api/health/ready').then(r=>process.exit(r.status===200?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1 && ready=1
      fi
      [ "$ready" = 1 ] && break
      sleep 1
    done
    if [ "$ready" != 1 ]; then
      echo "ERROR: candidate $service readiness failed" >&2
      docker logs --tail 40 "$CLONE_API" >&2 || true
      docker logs --tail 40 "$CLONE_PUBLIC" >&2 || true
      exit 1
    fi
  done

  docker run --rm -d --name "$CLONE_EDGE" --network "$CLONE_NETWORK" \
    --network-alias write_project-frontend -p 127.0.0.1::80 \
    -v "$candidate_dist:/usr/share/nginx/html:ro" \
    -v "$ROOT_DIR/nginx.conf:/etc/nginx/conf.d/default.conf:ro" \
    nginx:alpine >/dev/null
  edge_port="$(docker port "$CLONE_EDGE" 80/tcp | sed -n 's/^127\.0\.0\.1://p' | head -1)"
  if [ -z "$edge_port" ]; then
    echo "ERROR: candidate edge has no loopback port" >&2
    exit 1
  fi
  edge_url="http://127.0.0.1:${edge_port}"
  edge_ready=0
  for _ in $(seq 1 30); do
    if curl -fs -o /dev/null -m 3 "$edge_url/healthz"; then
      edge_ready=1
      break
    fi
    if [ "$(docker inspect -f '{{.State.Running}}' "$CLONE_EDGE" 2>/dev/null || true)" != true ]; then
      break
    fi
    sleep 1
  done
  if [ "$edge_ready" != 1 ]; then
    echo "ERROR: candidate edge did not become ready" >&2
    docker logs --tail 60 "$CLONE_EDGE" >&2 || true
    exit 1
  fi
  assert_candidate_status() {
    local path="$1" expected="$2" actual
    if ! actual="$(curl -sS -o /dev/null -w '%{http_code}' -m 15 "$edge_url$path")"; then
      echo "ERROR: candidate $path could not be reached" >&2
      docker logs --tail 60 "$CLONE_EDGE" >&2 || true
      exit 1
    fi
    if [ "$actual" != "$expected" ]; then
      echo "ERROR: candidate $path returned $actual (expected $expected)" >&2
      exit 1
    fi
    echo "[schema rehearsal] candidate $path = $actual"
  }
  assert_candidate_status /healthz 200
  assert_candidate_status /api/health/ready 200
  assert_candidate_status '/api/public-bundle?sections=scripts' 200
  assert_candidate_status / 200
  assert_candidate_status /authors 200
  assert_candidate_status /audio-works 200
  assert_candidate_status /voice-actors 200
  assert_candidate_status /activities 200
  assert_candidate_status /login 200
  candidate_asset="$(rg -o '/assets/[^" ]+\.js' "$candidate_dist/index.html" | head -1)"
  if [ -z "$candidate_asset" ]; then
    echo "ERROR: candidate static build has no JS asset" >&2
    exit 1
  fi
  assert_candidate_status "$candidate_asset" 200
fi
echo "[schema rehearsal] passed; disposable clone will be deleted"
