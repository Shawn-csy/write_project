#!/usr/bin/env bash
# One production release, step by step or end to end.
#
#   scripts/release.sh build    <tag>   images + studio static build from a green, pushed main
#   scripts/release.sh schema   [--apply]   show (or apply, with rehearsal + backup) schema gaps
#   scripts/release.sh prepare  <tag>   candidate beside the live site; no traffic moves
#   scripts/release.sh activate <tag>   hand over port 1090, then run post-switch data jobs
#   scripts/release.sh pages            build and upload the Cloudflare Pages front end
#   scripts/release.sh verify           smoke-check the public domains
#   scripts/release.sh all <tag> [--apply-schema]   every step above, in order
#
# `all` stops before touching the schema unless --apply-schema is given, so an
# unattended run never changes production tables on its own.
# Rollback: python3 scripts/site-release.py rollback --tag <tag> (the API and
# ingress), and the Cloudflare Pages deployment list for the front end. Data
# written by migrations or convergence is not rolled back.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PUBLIC_ORIGIN=https://open-scripts.shawnup.com
API_ORIGIN=https://api-open-scripts.shawnup.com
WORKFLOWS=("Public read and security contracts" "Submission workflows")

log() { printf '\n[release] %s\n' "$*"; }
die() { printf '[release] ERROR: %s\n' "$*" >&2; exit 1; }

require_tag() {
  [[ "${1:-}" =~ ^[a-z0-9][a-z0-9-]{0,39}$ ]] || die "tag must be lowercase letters, digits or hyphens (max 40)"
}

# The commit being released must be main as pushed, with both CI workflows green.
require_releasable_main() {
  [ "$(git rev-parse --abbrev-ref HEAD)" = main ] || die "check out main first"
  [ -z "$(git status --porcelain)" ] || die "working tree has uncommitted changes"
  git fetch -q origin main
  local head
  head="$(git rev-parse HEAD)"
  [ "$head" = "$(git rev-parse origin/main)" ] || die "local main is not origin/main"
  for workflow in "${WORKFLOWS[@]}"; do
    local result
    result="$(gh run list --branch main --commit "$head" --workflow "$workflow" --limit 1 \
      --json status,conclusion -q '.[0] | "\(.status) \(.conclusion)"' 2>/dev/null || true)"
    [ "$result" = "completed success" ] || die "CI '$workflow' for ${head:0:7} is '${result:-missing}', not green"
  done
  log "main ${head:0:7} is pushed and green"
}

cmd_build() {
  local tag="$1"; require_tag "$tag"
  require_releasable_main
  [ -e "dist/releases/$tag" ] && die "dist/releases/$tag already exists; pick a new tag"
  log "building write_project-backend:$tag"
  docker build -t "write_project-backend:$tag" server
  log "building write_project-public:$tag"
  docker build -t "write_project-public:$tag" -f apps/public/Dockerfile .
  log "building studio static files into dist/releases/$tag"
  npx vite build --mode production --outDir "dist/releases/$tag" --emptyOutDir
  [ -f "dist/releases/$tag/index.html" ] || die "studio build produced no index.html"
}

cmd_schema() {
  if [ "${1:-}" = --apply ]; then
    log "applying schema (rehearsal on a copy, backup, then bounded migration)"
    bash scripts/migrate-prod-schema.sh --apply
  fi
  bash scripts/migrate-prod-schema.sh --verify
}

cmd_prepare() {
  local tag="$1"; require_tag "$tag"
  python3 scripts/site-release.py prepare --tag "$tag"
  local port
  port="$(docker port "wp-site-${tag}-check" 80/tcp | awk -F: '/^127[.]0[.]0[.]1:/ {print $NF}')"
  [ -n "$port" ] || die "candidate check port not found"
  log "ingress limits and cache boundary on candidate port $port"
  python3 scripts/check-ingress-write-limits.py --base-url "http://127.0.0.1:${port}"
  python3 scripts/check-ingress-read-limits.py --base-url "http://127.0.0.1:${port}"
  python3 scripts/check-rsc-cache-boundary.py --base-url "http://127.0.0.1:${port}" --sample-sitemap
}

cmd_activate() {
  local tag="$1"; require_tag "$tag"
  python3 scripts/site-release.py activate --tag "$tag"
  # Data jobs that must not run while the previous release still serves traffic.
  log "identity convergence on the live API"
  docker exec "wp-site-${tag}-api" python -m services.identity_convergence
}

cmd_pages() {
  [ "$(curl -s -o /dev/null -w '%{http_code}' "$API_ORIGIN/healthz")" = 200 ] || die "$API_ORIGIN/healthz is not 200"
  log "building the production Pages front end"
  (
    cd apps/public
    BACKEND_API_URL="$API_ORIGIN" \
    NEXT_PUBLIC_DEPLOY_ENV=production \
    NEXT_PUBLIC_API_ORIGIN="$API_ORIGIN" \
    NEXT_PUBLIC_FALLBACK_API_ORIGIN=https://fallback-open-scripts.shawnup.com \
    NEXT_PUBLIC_MEDIA_ORIGIN="$API_ORIGIN" \
    NEXT_PUBLIC_MEDIA_FALLBACK_ORIGIN=https://media-open-scripts.shawnup.com \
    NEXT_PUBLIC_STUDIO_ORIGIN=https://studio-open-scripts.shawnup.com \
    NEXT_PUBLIC_BASE_URL="$PUBLIC_ORIGIN" \
    npm run build:pages
    if grep -rlq "dev-open-scripts" out; then die "Pages output still references the Dev domain"; fi
    grep -q 'data-deploy-environment="production"' out/index.html || die "Pages output is not a production build"
    [ -f out/404.html ] || die "Pages output has no 404.html"
    log "uploading to Cloudflare Pages"
    npx wrangler pages deploy out --project-name write-project-public-site --branch main
  )
}

cmd_verify() {
  local failed=0
  for path in / /authors /audio-works /demos /resources /about /sitemap.xml; do
    local status
    status="$(curl -s -o /dev/null -w '%{http_code}' "$PUBLIC_ORIGIN$path")"
    printf '  %-14s %s\n' "$path" "$status"
    [ "$status" = 200 ] || failed=1
  done
  local ready
  ready="$(curl -s -o /dev/null -w '%{http_code}' "$API_ORIGIN/api/health/ready")"
  printf '  %-14s %s\n' "api ready" "$ready"
  [ "$ready" = 200 ] || failed=1
  [ "$failed" = 0 ] || die "public smoke check failed"
  log "public smoke check passed"
}

cmd_all() {
  local tag="$1" apply_schema="${2:-}"
  cmd_build "$tag"
  if ! bash scripts/migrate-prod-schema.sh --verify; then
    [ "$apply_schema" = --apply-schema ] || die "this release needs a schema migration; rerun with --apply-schema or run 'schema --apply' first"
    cmd_schema --apply
  fi
  cmd_prepare "$tag"
  cmd_activate "$tag"
  cmd_pages
  cmd_verify
}

action="${1:-}"; shift || true
case "$action" in
  build|prepare|activate) [ $# -eq 1 ] || die "usage: $0 $action <tag>"; "cmd_$action" "$1" ;;
  schema) cmd_schema "${1:-}" ;;
  pages|verify) cmd_$action ;;
  all) [ $# -ge 1 ] || die "usage: $0 all <tag> [--apply-schema]"; cmd_all "$@" ;;
  *) sed -n '2,17p' "$0"; exit 2 ;;
esac
