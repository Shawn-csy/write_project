#!/usr/bin/env bash
#
# 正式資料庫定期備份。
#
# 背景：2026-08-17 Postgres 被 SIGKILL 中斷關機 checkpoint，WAL 遺失導致 scripts
# 表索引與 heap 不同步（15 筆列從索引查不到、主鍵出現重複值）。當時沒有任何備份，
# 只能靠 pg_dump 現場搶救。這支腳本確保下次有可回復的還原點。
#
# 用法：
#   bash scripts/backup-db.sh              # 備份到預設目錄
#   BACKUP_DIR=/path bash scripts/backup-db.sh
#   KEEP_DAYS=30 bash scripts/backup-db.sh
#
# 排程見 scripts/com.shawnup.write-project-backup.plist

set -Eeuo pipefail

PG_CONTAINER="${PG_CONTAINER:-write_project-write_project-postgres-1}"
DB_NAME="${DB_NAME:-write_project}"
DB_USER="${DB_USER:-write_project}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/write_project_backups}"
KEEP_DAYS="${KEEP_DAYS:-14}"

TS=$(date +%Y%m%d_%H%M%S)
OUT="${BACKUP_DIR}/write_project_${TS}.sql.gz"
LOG="${BACKUP_DIR}/backup.log"

mkdir -p "$BACKUP_DIR"

log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" | tee -a "$LOG"; }

if ! docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; then
  log "ERROR 找不到執行中的容器 ${PG_CONTAINER}，備份中止"
  exit 1
fi

log "開始備份 ${DB_NAME} → ${OUT}"

if ! docker exec "$PG_CONTAINER" pg_dump -U "$DB_USER" -d "$DB_NAME" | gzip > "$OUT"; then
  log "ERROR pg_dump 失敗"
  rm -f "$OUT"
  exit 1
fi

# 驗證：檔案非空，且 gzip 結構完整、內容看得到 COPY 區塊
if [ ! -s "$OUT" ]; then
  log "ERROR 備份檔是空的"
  rm -f "$OUT"
  exit 1
fi

if ! gzip -t "$OUT" 2>/dev/null; then
  log "ERROR 備份檔 gzip 損壞"
  rm -f "$OUT"
  exit 1
fi

TABLES=$(gzip -dc "$OUT" | grep -c '^COPY public\.' || true)
if [ "$TABLES" -lt 10 ]; then
  log "ERROR 備份只含 ${TABLES} 個資料表，疑似不完整"
  rm -f "$OUT"
  exit 1
fi

SIZE=$(du -h "$OUT" | cut -f1)
log "備份完成：${SIZE}，${TABLES} 個資料表"

# 一併記錄索引健康度 —— 這正是上次故障時最早可觀察到的訊號。
# heap 與索引筆數不一致，就代表索引又壞了。
HEAP=$(docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c \
  "SET enable_indexscan=off; SET enable_bitmapscan=off; SET enable_indexonlyscan=off; SELECT count(*) FROM scripts;" 2>/dev/null | tail -1 || echo "?")
IDX=$(docker exec "$PG_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -t -A -c \
  "SET enable_seqscan=off; SELECT count(*) FROM scripts WHERE id > '';" 2>/dev/null | tail -1 || echo "?")

if [ "$HEAP" = "$IDX" ]; then
  log "索引健康檢查：scripts heap=${HEAP} index=${IDX} 一致"
else
  log "WARNING 索引不一致！scripts heap=${HEAP} index=${IDX} —— 需要 REINDEX 或重建資料庫"
fi

# 清掉過期備份
DELETED=$(find "$BACKUP_DIR" -name 'write_project_*.sql.gz' -type f -mtime "+${KEEP_DAYS}" -print -delete | wc -l | tr -d ' ')
[ "$DELETED" -gt 0 ] && log "清除 ${DELETED} 份超過 ${KEEP_DAYS} 天的備份"

log "現有備份：$(find "$BACKUP_DIR" -name 'write_project_*.sql.gz' -type f | wc -l | tr -d ' ') 份"
