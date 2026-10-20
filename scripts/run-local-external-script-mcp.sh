#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "找不到 $ENV_FILE，請先建立本機 .env。" >&2
  exit 1
fi

# The MCP client launches this process locally. The key is kept in the ignored
# .env file and is never sent to stdout (stdout is reserved for MCP protocol).
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

if [[ -z "${MCP_LOCAL_API_KEY:-}" || -z "${MCP_OWNER_ID:-}" ]]; then
  echo "請在 .env 設定 MCP_LOCAL_API_KEY 與 MCP_OWNER_ID。" >&2
  exit 1
fi

export PYTHONPATH="$ROOT_DIR/server${PYTHONPATH:+:$PYTHONPATH}"
exec python3 "$ROOT_DIR/server/mcp_server/server.py"
