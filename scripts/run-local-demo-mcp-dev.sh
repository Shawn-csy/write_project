#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "找不到 $ENV_FILE。" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${MCP_DEV_LOCAL_API_KEY:-}" || -z "${MCP_OWNER_ID:-}" ]]; then
  echo "請在 .env 設定 MCP_DEV_LOCAL_API_KEY 與 MCP_OWNER_ID。" >&2
  exit 1
fi

export MCP_LOCAL_API_KEY="$MCP_DEV_LOCAL_API_KEY"
export WRITE_PROJECT_API_BASE_URL="https://api-dev-open-scripts.shawnup.com/api"
export PYTHONPATH="$ROOT_DIR/server${PYTHONPATH:+:$PYTHONPATH}"
PYTHON_BIN="$ROOT_DIR/server/venv/bin/python"
if [[ ! -x "$PYTHON_BIN" ]]; then
  PYTHON_BIN=python3
fi
exec "$PYTHON_BIN" "$ROOT_DIR/server/mcp_server/server.py"
