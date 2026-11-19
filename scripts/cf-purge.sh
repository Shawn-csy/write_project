#!/usr/bin/env bash
#
# Cloudflare 快取清除。
#
# 為什麼需要這支腳本：
# 源站修好後，Cloudflare 邊緣仍會依當初快取時的 s-maxage 繼續供應舊回應。
# Token 只從環境變數讀取，不會出現在指令參數或任何輸出中。
#
# 準備 Token（約兩分鐘）：
#   Cloudflare → 右上角頭像 → Profile → API Tokens → Create Token
#   → Create Custom Token → Permissions 選 Zone / Cache Purge / Purge
#   → Zone Resources 選 Include / Specific zone / shawnup.com
#
# 用法：
#   export CLOUDFLARE_API_TOKEN='貼在這裡'
#   bash scripts/cf-purge.sh --all        # 清整個 zone
#   bash scripts/cf-purge.sh <url> [url…] # 清指定網址

set -Eeuo pipefail

ZONE_NAME="${ZONE_NAME:-shawnup.com}"
API="https://api.cloudflare.com/client/v4"

step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
die()  { printf '\n\033[31m中止：%s\033[0m\n' "$*" >&2; exit 1; }

[ "$#" -gt 0 ] || die "用法：$0 <url> [url…] 或 $0 --all"
if [ "$1" = "--all" ]; then
  [ "$#" -eq 1 ] || die "--all 不可和個別網址一起使用"
else
  for url in "$@"; do
    case "$url" in
      http://?*|https://?*) ;;
      *) die "請提供完整 HTTP 或 HTTPS 網址" ;;
    esac
  done
fi

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
if [ "$1" = "--all" ]; then
  step "3/4 清除整個 zone"
  BODY='{"purge_everything":true}'
else
  TARGETS=("$@")
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

if [ "$1" = "--all" ]; then
  echo "可執行 bash scripts/release.sh verify 驗證正式站。"
  exit 0
fi

# ------------------------------------------------------------------ 4. 驗證
step "4/4 驗證（等 5 秒讓邊緣節點同步）"
sleep 5

fail=0
check_body="$(mktemp)"
trap 'rm -f "$check_body"' EXIT
for u in "${TARGETS[@]}"; do
  if ! h=$(curl -sS -D- -o "$check_body" -m 25 -- "$u"); then
    printf '  FAIL  %s（無法讀取）\n' "$u"
    fail=1
    continue
  fi
  h=$(tr -d '\r' <<<"$h")
  cf=$(awk 'tolower($1) == "cf-cache-status:" { result = $2 } END { print result }' <<<"$h")
  code=$(awk '/^HTTP\// { result = $2 } END { print result }' <<<"$h")
  bad=$(grep -c '找不到台本' "$check_body" || true)
  if [ "$bad" = "0" ] && [ "$code" = "200" ]; then
    printf '  \033[32mOK\033[0m    %s  CF=%s  %s\n' "$code" "${cf:-?}" "$u"
  else
    printf '  \033[31mFAIL\033[0m  %s  CF=%s  %s（仍為錯誤頁）\n' "$code" "${cf:-?}" "$u"
    fail=1
  fi
done

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
