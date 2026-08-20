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

echo "\n🔎 Type check"
npm run typecheck

# 相依套件稽核。docs/engineering/dependency-audit.md 原本規定「每季人工 audit、
# 新增 high/critical 必須當個 sprint 處理」，實務上會逾期 —— 該文件曾停在
# 2026-06-30，期間 react-router 又中了新的 CSRF advisory 卻沒人發現。改由 CI 把關。
#
# 已接受風險（非安全用途的 exceljs -> uuid）記錄在該文件中。
# 若要豁免特定 advisory，請先在文件補上理由。
echo "\n🔐 Dependency audit (production deps)"
if ! npm audit --omit=dev --audit-level=high; then
  echo "❌ 發現 high/critical 等級的相依套件漏洞。"
  echo "   請修復，或在 docs/engineering/dependency-audit.md 記錄已接受風險的理由。"
  exit 1
fi

echo "\n🐍 Backend deps + tests"
if [ -x "./server/venv/bin/python" ]; then
  (cd server && ./venv/bin/python -m pytest -q)
else
  if command -v python3 >/dev/null 2>&1; then
    PYTHON_BIN="python3"
  elif command -v python >/dev/null 2>&1; then
    PYTHON_BIN="python"
  else
    echo "❌ 找不到可用的 Python（python3/python）"
    exit 1
  fi
  "$PYTHON_BIN" -m pip install -r server/requirements.txt
  (cd server && "$PYTHON_BIN" -m pytest -q)
fi

echo "\n✅ CI checks passed"

if [ "${AUTO_DEPLOY:-0}" = "1" ]; then
  echo "\n🚀 Auto deploy (docker-compose.prod.yml)"
  RUN_CI=0 bash "$ROOT_DIR/scripts/deploy.sh"
fi
