#!/usr/bin/env bash
#
# Cloudflare 快取清除。
#
# 為什麼需要這支腳本：
# 源站修好後，Cloudflare 邊緣仍會依當初快取時的 s-maxage 繼續供應舊回應。
# 2026-08-20 資料庫事故期間，三篇台本頁的 404 被快取住，源站恢復正常後訪客
# 仍持續看到錯誤頁 —— 唯一的解法是主動 purge。
#
# Token 只從環境變數讀取，不會出現在指令參數或任何輸出中。
#
# 準備 Token（約兩分鐘）：
#   Cloudflare → 右上角頭像 → Profile → API Tokens → Create Token
#   → Create Custom Token → Permissions 選 Zone / Cache Purge / Purge
#   → Zone Resources 選 Include / Specific zone / shawnup.com
#
# 用法：
#   export CLOUDFLARE_API_TOKEN='貼在這裡'
#   bash scripts/cf-purge.sh              # 清這次事故受影響的三篇台本頁
#   bash scripts/cf-purge.sh --all        # 清整個 zone
#   bash scripts/cf-purge.sh <url> [url…] # 清指定網址

set -Eeuo pipefail

ZONE_NAME="${ZONE_NAME:-shawnup.com}"
SITE="${SITE:-https://open-scripts.shawnup.com}"
API="https://api.cloudflare.com/client/v4"

# 這次事故被快取住的頁面
DEFAULT_URLS=(
  "${SITE}/read/b33ad38a-a1b9-400f-8569-16a8bad5c593"
  "${SITE}/read/17d3b2c4-2314-4016-9c35-5288b804a02b"
  "${SITE}/read/735875e4-d7bf-4b26-8aed-7921db2646a1"
)

step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
die()  { printf '\n\033[31m中止：%s\033[0m\n' "$*" >&2; exit 1; }

[ -n "${CLOUDFLARE_API_TOKEN:-}" ] || die "請先設定 CLOUDFLARE_API_TOKEN（見本檔開頭說明）"
command -v python3 >/dev/null || die "需要 python3 解析回應"

auth=(-H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" -H "Content-Type: application/json")

# 只印 success/errors，絕不回顯 token
api_ok() {
  python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    print("PARSE_FAIL")
    sys.exit()
if d.get("success"):
    print("OK")
else:
    parts = []
    for e in (d.get("errors") or []):
        parts.append(str(e.get("code")) + " " + str(e.get("message")))
    print("FAIL: " + ("; ".join(parts) if parts else "unknown error"))
'
}

# ------------------------------------------------------------------ 1. 驗證 Token
step "1/4 驗證 Token"
r=$(curl -s -m 20 "${auth[@]}" "${API}/user/tokens/verify")
v=$(printf '%s' "$r" | api_ok)
case "$v" in
  OK) echo "Token 有效" ;;
  *)  die "Token 驗證失敗 — $v" ;;
esac

# ------------------------------------------------------------------ 2. 查 Zone ID
step "2/4 查詢 ${ZONE_NAME} 的 Zone ID"
r=$(curl -s -m 20 "${auth[@]}" "${API}/zones?name=${ZONE_NAME}")
ZONE_ID=$(printf '%s' "$r" | python3 -c '
import json,sys
d=json.load(sys.stdin)
res=d.get("result") or []
print(res[0]["id"] if d.get("success") and res else "")
')
[ -n "$ZONE_ID" ] || die "查不到 ${ZONE_NAME} 的 Zone —— 確認 Token 的 Zone Resources 有涵蓋這個網域"
echo "Zone ID: ${ZONE_ID:0:8}…（已遮蔽）"

# ------------------------------------------------------------------ 3. 清除
if [ "${1:-}" = "--all" ]; then
  step "3/4 清除整個 zone"
  BODY='{"purge_everything":true}'
  TARGETS=()
else
  if [ $# -gt 0 ]; then TARGETS=("$@"); else TARGETS=("${DEFAULT_URLS[@]}"); fi
  step "3/4 清除 ${#TARGETS[@]} 個網址"
  for u in "${TARGETS[@]}"; do echo "  $u"; done
  BODY=$(printf '%s\n' "${TARGETS[@]}" | python3 -c '
import json,sys
print(json.dumps({"files":[l.strip() for l in sys.stdin if l.strip()]}))
')
fi

r=$(curl -s -m 30 -X POST "${auth[@]}" --data "$BODY" "${API}/zones/${ZONE_ID}/purge_cache")
v=$(printf '%s' "$r" | api_ok)
case "$v" in
  OK) echo "清除成功" ;;
  *)  die "清除失敗 — $v" ;;
esac

# ------------------------------------------------------------------ 4. 驗證
step "4/4 驗證（等 5 秒讓邊緣節點同步）"
sleep 5

CHECK=("${TARGETS[@]:-}")
[ ${#CHECK[@]} -eq 0 ] || [ -z "${CHECK[0]}" ] && CHECK=("${DEFAULT_URLS[@]}")

fail=0
for u in "${CHECK[@]}"; do
  h=$(curl -s -D- -o /tmp/cf-purge-check.html -m 25 "$u")
  cf=$(grep -i '^cf-cache-status' <<<"$h" | tr -d '\r' | awk '{print $2}')
  code=$(head -1 <<<"$h" | awk '{print $2}')
  bad=$(grep -c '找不到台本' /tmp/cf-purge-check.html || true)
  if [ "$bad" = "0" ] && [ "$code" = "200" ]; then
    printf '  \033[32mOK\033[0m    %s  CF=%s  %s\n' "$code" "${cf:-?}" "$u"
  else
    printf '  \033[31mFAIL\033[0m  %s  CF=%s  %s（仍為錯誤頁）\n' "$code" "${cf:-?}" "$u"
    fail=1
  fi
done
rm -f /tmp/cf-purge-check.html

if [ "$fail" = "0" ]; then
  printf '\n\033[32m全部恢復正常。\033[0m\n'
else
  cat <<'EOF'

部分頁面仍是錯誤頁。可能原因：
  * 瀏覽器端快取 —— Cloudflare 的 Browser Cache TTL 預設 4 小時會覆蓋源站設定。
    建議改為 Caching → Configuration → Browser Cache TTL → Respect Existing Headers。
    （用 curl 測不受此影響，若 curl 顯示 OK 就是你的瀏覽器在快取，強制重新整理即可。）
  * 邊緣節點尚未同步 —— 稍等一分鐘再跑一次本腳本驗證。
EOF
  exit 1
fi
