#!/usr/bin/env bash
#
# 安全部署包裝。
#
# 為什麼需要這一層：
# scripts/deploy.sh 會執行 `docker compose down`，而 compose 用的是「容器建立當下」
# 的 stop_grace_period。目前執行中的 postgres 容器是用舊設定（Docker 預設 10s）建的，
# 這正是 2026-08-17 事故的成因 —— 關機 checkpoint 沒做完就被 SIGKILL，WAL 遺失導致
# scripts 表索引與 heap 不同步。
#
# 本次部署會套用新的 stop_grace_period=120s，但「這一次」的關閉仍是舊設定，
# 所以先用 docker stop -t 120 手動安全關閉，並驗證關機日誌乾淨，才交給 deploy.sh。
# 部署後新容器就帶有 120s 寬限期，之後不再需要這支腳本的保護步驟。
#
# 用法：bash scripts/safe-deploy.sh

set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

PG=write_project-write_project-postgres-1

step() { printf '\n\033[1m==> %s\033[0m\n' "$*"; }
die()  { printf '\n\033[31m中止：%s\033[0m\n' "$*" >&2; exit 1; }

# ------------------------------------------------------------------ 1. 備份
step "1/4 部署前備份"
BACKUP_DIR="${BACKUP_DIR:-$HOME/write_project_backups}" bash scripts/backup-db.sh

# ------------------------------------------------------------------ 2. 安全關閉
if docker ps --format '{{.Names}}' | grep -qx "$PG"; then
  step "2/4 安全關閉 postgres（給 120 秒完成 checkpoint）"
  docker stop -t 120 "$PG"

  # 關機必須乾淨。出現 xlog flush 未滿足就是 WAL 遺失，絕不能繼續部署。
  LOGS=$(docker logs --tail 30 "$PG" 2>&1)
  if grep -q "xlog flush request" <<<"$LOGS"; then
    echo "$LOGS" | tail -15
    die "關機時 WAL flush 未完成 —— 資料可能已損壞，先檢查再部署"
  fi
  if ! grep -q "database system is shut down" <<<"$LOGS"; then
    echo "$LOGS" | tail -15
    die "沒看到正常關機訊息"
  fi
  echo "關機乾淨：checkpoint 完成、無 WAL 遺失"
else
  step "2/4 postgres 未在執行，略過安全關閉"
fi

# ------------------------------------------------------------------ 3. 部署
step "3/4 執行 deploy.sh"
bash scripts/deploy.sh "$@"

# ------------------------------------------------------------------ 4. 驗證
step "4/4 部署後驗證"

echo "等待服務就緒..."
for i in $(seq 1 45); do
  sleep 2
  code=$(curl -s -o /dev/null -w '%{http_code}' -m 5 https://open-scripts.shawnup.com/api/public-scripts || echo 000)
  [ "$code" = "200" ] && { echo "API 已就緒"; break; }
done

echo
echo "確認新版本已上線（health probe 應為 200，舊版是 404）："
curl -s -o /dev/null -w "  /api/health/ready = %{http_code}\n" -m 15 https://open-scripts.shawnup.com/api/health/ready || true

echo
echo "確認 postgres 新寬限期已生效（應為 120000000000 奈秒）："
docker inspect -f '  StopTimeout: {{.Config.StopTimeout}}s' "$PG" 2>/dev/null || true
docker inspect -f '  stop_grace_period: {{index .Config.Labels "com.docker.compose.project"}}' "$PG" >/dev/null 2>&1 || true

echo
echo "soft-404 迴歸檢查（加 cb 參數繞過 Cloudflare 快取）："
for p in "/read/00000000-0000-0000-0000-000000000000" \
         "/author/00000000-0000-0000-0000-000000000000" \
         "/org/00000000-0000-0000-0000-000000000000" \
         "/tag/__no-such-tag__" \
         "/series/__no-such-series__"; do
  s=$(curl -s -o /dev/null -w '%{http_code}' -m 20 "https://open-scripts.shawnup.com${p}?cb=$RANDOM$RANDOM")
  [ "$s" = "404" ] && r="OK  " || r="FAIL"
  printf '  %s  %s  %s\n' "$r" "$s" "$p"
done

echo
echo "正常頁面仍應為 200："
for p in "/" "/read/b33ad38a-a1b9-400f-8569-16a8bad5c593" "/read/735875e4-d7bf-4b26-8aed-7921db2646a1" "/sitemap.xml"; do
  s=$(curl -s -o /dev/null -w '%{http_code}' -m 20 "https://open-scripts.shawnup.com${p}?cb=$RANDOM$RANDOM")
  [ "$s" = "200" ] && r="OK  " || r="FAIL"
  printf '  %s  %s  %s\n' "$r" "$s" "$p"
done

cat <<'EOF'

────────────────────────────────────────────────────────
部署完成。

還有兩件事需要你手動做：

1. 清 Cloudflare 快取（否則舊的 404 頁面最久壓一年）
   Dashboard → Caching → Configuration → Purge Everything

2. 安裝每日備份排程
   cp scripts/com.shawnup.write-project-backup.plist ~/Library/LaunchAgents/
   launchctl load ~/Library/LaunchAgents/com.shawnup.write-project-backup.plist

回滾：bash scripts/rollback.sh
────────────────────────────────────────────────────────
EOF
