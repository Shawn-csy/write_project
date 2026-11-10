#!/usr/bin/env bash
# security-check.sh — Run the security regression test suite.
#
# Runs the security regression tests for public writes, trusted client IPs,
# SSRF-safe metadata/media fetching, and revalidation scope.
#
# Usage:
#   bash scripts/security-check.sh
#
# Exit codes:
#   0 — all security tests passed
#   1 — one or more tests failed
#
# Prerequisites:
#   - server/venv with slowapi>=0.1.9 installed
#   - Node.js / npm available for vitest
#
# Adding a new public write endpoint?
# You MUST add a corresponding test in server/tests/test_public_write_hardening.py:
#   - A decorator presence test (test_*_has_rate_limit_decorator)
#   - A visibility gate test (private → 404, public → 200)
#   - A 429 integration test (under @requires_rate_limit)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; BOLD='\033[1m'; RESET='\033[0m'

pass() { echo -e "  ${GREEN}PASS${RESET} $*"; }
fail() { echo -e "  ${RED}FAIL${RESET} $*"; }

echo -e "${BOLD}Security Regression Suite${RESET}"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

OVERALL=0

echo -e "${BOLD}Deployment: production network boundary${RESET}"
if python3 "$ROOT_DIR/scripts/check-prod-network-boundary.py"; then
  pass "production network boundary"
else
  fail "production network boundary"
  OVERALL=1
fi

echo ""

# ── Backend security tests ────────────────────────────────────────────────────
echo -e "${BOLD}Backend: public writes, client IPs, and metadata fetching${RESET}"

BACKEND_PYTHON="${ROOT_DIR}/server/venv/bin/python"
if [[ ! -x "$BACKEND_PYTHON" ]]; then
  fail "server/venv not found — run: python -m venv server/venv && server/venv/bin/pip install -r server/requirements.txt"
  OVERALL=1
else
  if (cd "$ROOT_DIR/server" && ./venv/bin/python -m pytest -q \
    tests/test_public_write_hardening.py \
    tests/test_request_body_limits.py \
    tests/test_public_terms_acceptance.py \
    tests/test_rate_limit.py \
    tests/test_health.py \
    tests/test_external_public_script_metadata.py --tb=short 2>&1); then
    pass "backend security regressions"
  else
    fail "backend security regressions"
    OVERALL=1
  fi
fi

echo ""

# ── Frontend security tests ───────────────────────────────────────────────────
echo -e "${BOLD}Frontend: revalidation, image boundaries, media proxy, and like state${RESET}"

if ! command -v npx &>/dev/null; then
  fail "npx not found"
  OVERALL=1
else
  if (cd "$ROOT_DIR" && npx vitest run \
    apps/public/securityHeaders.test.ts \
    apps/public/app/api/revalidate/route.test.ts \
    apps/public/app/api/public-bundle/route.test.ts \
    apps/public/app/api/health/route.test.ts \
    apps/public/imageSecurity.test.ts \
    apps/public/lib/publicImageOrigins.test.ts \
    apps/public/lib/__tests__/remoteImageFetch.test.ts \
    apps/public/lib/__tests__/publicMediaProxy.test.ts \
    'apps/public/app/read/[id]/usePublicReaderActions.test.tsx' 2>&1); then
    pass "frontend security regressions"
  else
    fail "frontend security regressions"
    OVERALL=1
  fi
fi

echo ""

# ── Summary ───────────────────────────────────────────────────────────────────
if [[ $OVERALL -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}All security checks passed.${RESET}"
else
  echo -e "${RED}${BOLD}Security check FAILED. Fix above before deploying.${RESET}"
fi

exit $OVERALL
