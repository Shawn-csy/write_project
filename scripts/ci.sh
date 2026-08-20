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
# 新增 high/critical 必須當個 sprint 處理」，實務上會逾期 —— 該文件停在 2026-06-30，
# 期間 react-router 又中了新的 CSRF advisory 卻沒人發現。改由 CI 把關。
#
# 門檻目前設在 critical（阻擋）。理應設在 high，但 2026-08-20 當下尚有 7 個未修的
# high，需要 next 16.2.7 -> 16.3.1；該升級會連帶更動約 70 個套件並使 apps/public
# 的 React 解析出現兩份 React（測試全面失敗），必須獨立處理，不宜夾帶。
#
# 待 next 升級完成且 `npm audit --omit=dev --audit-level=high` 為綠，
# 請把下面的 critical 改成 high 並移除這段說明。
echo "\n🔐 Dependency audit (production deps)"
npm audit --omit=dev || true   # 完整報告一律印出，供人工檢視

if ! npm audit --omit=dev --audit-level=critical; then
  echo "❌ 發現 critical 等級的相依套件漏洞，必須處理後才能部署。"
  echo "   已接受風險請記錄於 docs/engineering/dependency-audit.md。"
  exit 1
fi

HIGH_COUNT=$(npm audit --omit=dev --json 2>/dev/null \
  | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{console.log(JSON.parse(s).metadata.vulnerabilities.high||0)}catch{console.log(0)}})")
if [ "${HIGH_COUNT:-0}" -gt 0 ]; then
  echo "⚠️  尚有 ${HIGH_COUNT} 個 high 等級漏洞未修（見上方報告與 dependency-audit.md）"
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
