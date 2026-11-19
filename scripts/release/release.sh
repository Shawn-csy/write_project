#!/usr/bin/env bash
# One production release, step by step or end to end.
#
#   scripts/release/release.sh build    <tag>   images + studio static build from a green, pushed main
#   scripts/release/release.sh schema   [--apply]   show (or apply, with rehearsal + backup) schema gaps
#   scripts/release/release.sh prepare  <tag>   candidate beside the live site; no traffic moves
#   scripts/release/release.sh activate <tag>   hand over port 1090, then run post-switch data jobs
#   scripts/release/release.sh pages            build and upload the Cloudflare Pages front end
#   scripts/release/release.sh verify           smoke-check the public domains
#   scripts/release/release.sh all <tag> [--apply-schema]   every step above, in order
#   scripts/release/release.sh resume <tag>   resume post-cutover convergence/Pages/verification
#   scripts/release/release.sh status <tag>   read the durable orchestration journal
#   scripts/release/release.sh auto             unattended: tag auto-<sha>, apply schema, retire and prune old releases
#   scripts/release/release.sh prune [--dry-run]   delete releases older than the live one and its rollback target
#
# Environment for runs outside the canonical checkout (the deploy runner):
#   WP_RELEASE_ROOT      directory the live ingress mounts releases from
#   WP_STUDIO_ENV_FILE   env file with the studio's public Firebase settings
#
# `all` stops before touching the schema unless --apply-schema is given. `auto`
# passes it: the owner chose unattended schema changes (rehearsed on a copy and
# backed up first) on 2026-11-11.
# Rollback: python3 scripts/release/site-release.py rollback --tag <tag> (the API and
# ingress), and the Cloudflare Pages deployment list for the front end. Data
# written by migrations or convergence is not rolled back.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
PUBLIC_ORIGIN=https://open-scripts.shawnup.com
API_ORIGIN=https://api-open-scripts.shawnup.com
log() { printf '\n[release] %s\n' "$*"; }
die() { printf '[release] ERROR: %s\n' "$*" >&2; exit 1; }

require_tag() {
  [[ "${1:-}" =~ ^[a-z0-9][a-z0-9-]{0,39}$ ]] || die "tag must be lowercase letters, digits or hyphens (max 40)"
}

require_releasable_main() {
  python3 scripts/release/release-workflow.py guard
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
  log "building studio static files into dist/releases/$tag"
  npm run build -- --mode production --outDir "dist/releases/$tag" --emptyOutDir
  [ -f "dist/releases/$tag/index.html" ] || die "studio build produced no index.html"
}

cmd_schema() {
  if [ "${1:-}" = --apply ]; then
    log "applying schema (rehearsal on a copy, backup, then bounded migration)"
    bash scripts/release/migrate-prod-schema.sh --apply
  fi
  bash scripts/release/migrate-prod-schema.sh --verify
}

cmd_prepare() {
  local tag="$1"; require_tag "$tag"
  python3 scripts/release/site-release.py prepare --tag "$tag"
  local port
  port="$(docker port "wp-site-${tag}-check" 80/tcp | awk -F: '/^127[.]0[.]0[.]1:/ {print $NF}')"
  [ -n "$port" ] || die "candidate check port not found"
  log "ingress limits and cache boundary on candidate port $port"
  python3 scripts/checks/check-ingress-write-limits.py --base-url "http://127.0.0.1:${port}"
  python3 scripts/checks/check-ingress-read-limits.py --base-url "http://127.0.0.1:${port}"
}

cmd_activate() {
  local tag="$1"; require_tag "$tag"
  python3 scripts/release/site-release.py activate --tag "$tag"
  cmd_converge "$tag"
}

cmd_cutover() {
  local tag="$1"; require_tag "$tag"
  python3 scripts/release/site-release.py activate --tag "$tag"
}

cmd_converge() {
  local tag="$1"; require_tag "$tag"
  # Data jobs that must not run while the previous release still serves traffic.
  log "identity convergence on the live API"
  docker exec "wp-site-${tag}-api" python -m services.identity_convergence
}

cmd_pages_build() {
  log "building the production Pages front end"
  (
    cd apps/public
    BACKEND_API_URL="${BACKEND_API_URL:-$API_ORIGIN}" \
    NEXT_PUBLIC_DEPLOY_ENV=production \
    NEXT_PUBLIC_API_ORIGIN="$API_ORIGIN" \
    NEXT_PUBLIC_FALLBACK_API_ORIGIN=https://fallback-open-scripts.shawnup.com \
    NEXT_PUBLIC_MEDIA_ORIGIN="$API_ORIGIN" \
    NEXT_PUBLIC_MEDIA_FALLBACK_ORIGIN=https://media-open-scripts.shawnup.com \
    NEXT_PUBLIC_STUDIO_ORIGIN=https://studio-open-scripts.shawnup.com \
    NEXT_PUBLIC_BASE_URL="$PUBLIC_ORIGIN" \
    npm run build:pages
    if grep -rlq "dev-open-scripts" "${PUBLIC_PAGES_OUTPUT_DIR:-out}"; then die "Pages output still references the Dev domain"; fi
    grep -q 'data-deploy-environment="production"' "${PUBLIC_PAGES_OUTPUT_DIR:-out}/index.html" || die "Pages output is not a production build"
    [ -f "${PUBLIC_PAGES_OUTPUT_DIR:-out}/404.html" ] || die "Pages output has no 404.html"
  )
}

cmd_pages_upload() {
  [ -d "$1" ] || die "Pages output directory missing"
  (cd apps/public; npx wrangler pages deploy "$1" --project-name write-project-public-site --branch main)
}

cmd_pages() {
  # All callers share the same stage/output/upload lock, including manual Pages.
  python3 scripts/release/content-pages-lock.py
}

cmd_verify() {
  local failed=0
  for path in / /authors /audio-works /demos /resources /about /sitemap.xml; do
    local status
    status="$(curl --connect-timeout 5 --max-time 20 -s -o /dev/null -w '%{http_code}' "$PUBLIC_ORIGIN$path")"
    printf '  %-14s %s\n' "$path" "$status"
    [ "$status" = 200 ] || failed=1
  done
  local ready
  ready="$(curl --connect-timeout 5 --max-time 20 -s -o /dev/null -w '%{http_code}' "$API_ORIGIN/api/health/ready")"
  printf '  %-14s %s\n' "api ready" "$ready"
  [ "$ready" = 200 ] || failed=1
  [ "$failed" = 0 ] || die "public smoke check failed"
  log "public smoke check passed"
}

# Delete releases older than the live one and its rollback target. A failed
# cleanup never fails the deploy that just went live.
cmd_prune() {
  log "removing images, containers and files of releases older than the rollback target"
  python3 scripts/release/site-release.py prune "$@" || log "prune failed; old releases are still on disk"
}

cmd_schema_check() {
  if ! bash scripts/release/migrate-prod-schema.sh --verify; then
    [ "${1:-}" = --apply-schema ] || die "schema migration required; inspect schema and rerun with --apply-schema"
    cmd_schema --apply
  fi
}

cmd_retire() {
  python3 scripts/release/site-release.py retire-ancestors || log "retire-ancestors failed; old releases are still running"
}

action="${1:-}"; shift || true
case "$action" in
  build|prepare|activate|cutover|converge) [ $# -eq 1 ] || die "usage: $0 $action <tag>"; "cmd_$action" "$1" ;;
  schema) cmd_schema "${1:-}" ;;
  pages-build) cmd_pages_build ;;
  pages-upload) [ $# -eq 1 ] || die "pages-upload requires output directory"; cmd_pages_upload "$1" ;;
  pages|verify) cmd_$action ;;
  prune) cmd_prune "$@" ;;
  schema-check) cmd_schema_check "${1:-}" ;;
  retire) cmd_retire ;;
  all|auto|resume|status) exec python3 scripts/release/release-workflow.py "$action" "$@" ;;
  *) awk 'NR > 1 && /^set -euo/ {exit} NR > 1' "$0"; exit 2 ;;
esac
