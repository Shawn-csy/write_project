# 目前資料庫架構說明（Current）
最後更新：2026-03-20

## 1) 目前正式環境資料庫拓樸
- DB 引擎：PostgreSQL 16（Docker service: `write_project-postgres`）
- 服務埠：
  - Frontend: `1090`
  - Backend: `1091`
  - PostgreSQL: `1092`（host）對應容器內 `5432`
- Backend 連線：`DATABASE_URL` 預設指向 compose 內部主機 `write_project-postgres:5432`

## 2) 資料持久化位置
- PostgreSQL data dir（容器內）：`/var/lib/postgresql/data`
- PostgreSQL data dir（主機 bind mount）：`server/data/postgres`

> 重點：資料現在是放在專案內 `server/data/postgres`，不是 SQLite 檔案。

## 3) DB 啟動與初始化流程
- 由 `docker-compose.prod.yml` 啟動 Postgres（含 healthcheck）。
- Backend `depends_on` Postgres healthy 後再啟動。
- Backend 啟動時：
  1. `models.Base.metadata.create_all(...)`
  2. `migration.run_migrations()`
- `migration.py` 對非 SQLite 會略過 legacy SQLite migration（避免 `PRAGMA`/`sqlite_master` 在 Postgres 爆掉）。

## 4) SQLite -> Postgres 遷移流程（現況）
- 腳本：`server/migrate_sqlite_to_postgres.py`
- 負責：
  - 依表相依順序匯入
  - JSON/Boolean/數值正規化
  - 匯入完成逐表 row count 比對
- `scripts/deploy.sh` 在 `migrate_pg=1` 時會：
  1. 先確保 Postgres 服務已啟動且 healthy
  2. 沒給 `target_db` 時自動推導本機連線（預設 1092）
  3. 執行 SQLite -> Postgres 遷移
  4. 完成後正常重啟整包服務

## 5) 目前資料模型來源
- ORM 模型：`server/models.py`
- DB 連線層：`server/database.py`
- 遷移邏輯：`server/migration.py` + `server/migrate_sqlite_to_postgres.py`

## 6) 營運注意事項
- 日常部署：`./scripts/deploy.sh`
- 只有首次搬資料或強制覆蓋時才用：`./scripts/deploy.sh migrate_pg=1 truncate=1`
- 若要保留 SQLite 歷史檔，建議放到 `backup/`（手動管理）。
