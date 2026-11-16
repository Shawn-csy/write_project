#!/usr/bin/env bash
# Retired legacy whole-project deployment entrypoint.
set -euo pipefail
echo "ERROR: rollback.sh is retired; production now runs API + Nginx + PostgreSQL." >&2
echo "Inspect: python3 scripts/site-release.py status" >&2
echo "Rollback the active release (including legacy Next containers when recorded):" >&2
echo "  python3 scripts/site-release.py rollback --tag <live-release-tag>" >&2
exit 1
