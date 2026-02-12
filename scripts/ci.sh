#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

echo "🔍 CI Precheck"
NODE_VERSION=$(node -v | sed 's/v//')
REQUIRED_NODE="20.19.0"

version_ge() {
  [ "$(printf '%s\n' "$REQUIRED_NODE" "$NODE_VERSION" | sort -V | head -n1)" = "$REQUIRED_NODE" ]
}

if ! version_ge; then
  echo "❌ Node版本過低：$NODE_VERSION (需要 >= $REQUIRED_NODE)"
  exit 1
fi

echo "✅ Node版本：$NODE_VERSION"

echo "\n📦 Installing frontend deps (npm ci)"
npm ci

echo "\n🧪 Frontend tests"
npm test

echo "\n🐍 Backend deps + tests"
if [ -x "./server/venv/bin/python" ]; then
  (cd server && ./venv/bin/python -m pytest -q)
else
  python -m pip install -r server/requirements.txt
  (cd server && pytest -q)
fi

echo "\n✅ CI checks passed"

if [ "${AUTO_DEPLOY:-0}" = "1" ]; then
  echo "\n🚀 Auto deploy (docker-compose.prod.yml)"
  RUN_CI=0 bash "$ROOT_DIR/scripts/deploy.sh"
fi
