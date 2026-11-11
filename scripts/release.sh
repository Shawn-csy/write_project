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
#   scripts/release.sh auto             unattended: tag auto-<sha>, apply schema, retire and prune old releases
#   scripts/release.sh prune [--dry-run]   delete releases older than the live one and its rollback target
#
# Environment for runs outside the canonical checkout (the deploy runner):
#   WP_RELEASE_ROOT      directory the live ingress mounts releases from
#   WP_STUDIO_ENV_FILE   env file with the studio's public Firebase settings
#
# `all` stops before touching the schema unless --apply-schema is given. `auto`
# passes it: the owner chose unattended schema changes (rehearsed on a copy and
# backed up first) on 2026-11-11.
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

# The commit being released must be main as pushed (a detached checkout of it is
# fine), and every CI workflow that ran for it must have finished green.
# Exit status 3 means "not yet": CI for this commit is still running.
require_releasable_main() {
  [ -z "$(git status --porcelain --untracked-files=no)" ] || die "working tree has uncommitted changes"
  git fetch -q origin main
  local head
  head="$(git rev-parse HEAD)"
  [ "$head" = "$(git rev-parse origin/main)" ] || die "HEAD ${head:0:7} is not origin/main"
  local runs
  runs="$(gh run list --branch main --commit "$head" --limit 50 \
    --json workflowName,status,conclusion,event -q '.[] | select(.event == "push") | "\(.status)|\(.conclusion)|\(.workflowName)"')"
  [ -n "$runs" ] || die "no CI ran for ${head:0:7}"
  if grep -qv '^completed|' <<<"$runs"; then
    printf '[release] CI for %s is still running; nothing to do yet\n' "${head:0:7}"
    exit 3
  fi
  if grep -qv '^completed|success|' <<<"$runs"; then
    die "CI for ${head:0:7} is not green: $(grep -v '^completed|success|' <<<"$runs" | tr '\n' ' ')"
  fi
  log "main ${head:0:7} is pushed and every CI workflow passed"
}

cmd_build() {
  local tag="$1"; require_tag "$tag"
  require_releasable_main
  [ -e "dist/releases/$tag" ] && die "dist/releases/$tag already exists; pick a new tag"
  # The studio build reads public Firebase settings from an untracked env file;
  # a runner checkout has none, so it is pointed at the canonical one.
  if [ -n "${WP_STUDIO_ENV_FILE:-}" ]; then
    [ -f "$WP_STUDIO_ENV_FILE" ] || die "WP_STUDIO_ENV_FILE not found: $WP_STUDIO_ENV_FILE"
    cp "$WP_STUDIO_ENV_FILE" .env.production.local
  fi
  [ -f .env ] || [ -f .env.production.local ] || die "no studio env file (.env or WP_STUDIO_ENV_FILE)"
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

# Unattended release of origin/main, for the deploy workflow. Safe to call
# repeatedly: a commit that is already live or already attempted is skipped.
cmd_auto() {
  local head tag
  head="$(git rev-parse HEAD)"
  tag="auto-${head:0:7}"
  local releases="${WP_RELEASE_ROOT:-$ROOT/releases}"
  if python3 scripts/site-release.py status | grep -q "wp-site-${tag}-edge"; then
    log "$tag is already live"; return 0
  fi
  if [ -e "$releases/$tag" ] || [ -e "dist/releases/$tag" ]; then
    die "$tag was already attempted; inspect it, then run 'stop-prepared --tag $tag' or deploy a new commit"
  fi
  cmd_all "$tag" --apply-schema
  log "stopping releases older than the rollback target"
  python3 scripts/site-release.py retire-ancestors || log "retire-ancestors failed; old releases are still running"
  cmd_prune
}

# Delete releases older than the live one and its rollback target. A failed
# cleanup never fails the deploy that just went live.
cmd_prune() {
  log "removing images, containers and files of releases older than the rollback target"
  python3 scripts/site-release.py prune "$@" || log "prune failed; old releases are still on disk"
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
  prune) cmd_prune "$@" ;;
  all) [ $# -ge 1 ] || die "usage: $0 all <tag> [--apply-schema]"; cmd_all "$@" ;;
  auto) cmd_auto ;;
  *) awk 'NR > 1 && /^set -euo/ {exit} NR > 1' "$0"; exit 2 ;;
esac
