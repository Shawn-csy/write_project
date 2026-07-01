#!/usr/bin/env bash
# security-check.sh — Run the security regression test suite.
#
# Runs the minimum set of security tests that must pass before any deployment:
#   - Backend: public write hardening tests (rate limit decorators, visibility,
#     folder-inherited predicate, 429 integration tests)
#   - Frontend: revalidate route scope tests (path allowlist, rejection, limits)
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

# ── Backend security tests ────────────────────────────────────────────────────
echo -e "${BOLD}Backend: public write hardening + rate limits${RESET}"

BACKEND_PYTHON="${ROOT_DIR}/server/venv/bin/python"
if [[ ! -x "$BACKEND_PYTHON" ]]; then
  fail "server/venv not found — run: python -m venv server/venv && server/venv/bin/pip install -r server/requirements.txt"
  OVERALL=1
else
  if (cd "$ROOT_DIR/server" && ./venv/bin/python -m pytest tests/test_public_write_hardening.py -v --tb=short 2>&1); then
    pass "test_public_write_hardening.py"
  else
    fail "test_public_write_hardening.py"
    OVERALL=1
  fi
fi

echo ""

# ── Frontend security tests ───────────────────────────────────────────────────
echo -e "${BOLD}Frontend: revalidate route scope lockdown${RESET}"

if ! command -v npx &>/dev/null; then
  fail "npx not found"
  OVERALL=1
else
  if (cd "$ROOT_DIR" && npx vitest run apps/public/app/api/revalidate/route.test.ts 2>&1); then
    pass "revalidate/route.test.ts"
  else
    fail "revalidate/route.test.ts"
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
