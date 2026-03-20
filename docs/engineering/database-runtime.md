# Database Runtime Notes
最後更新：2026-03-20

## 正式模式（主用）
- 正式環境以 PostgreSQL 為唯一主用資料庫。
- 連線使用 `DATABASE_URL`，例如 `postgresql+psycopg://user:pass@host:5432/dbname`。
- 目前正式 compose 由 `write_project-postgres` 提供資料庫服務。

## SQLite 角色（備用）
- SQLite 不再作為正式主用 DB。
- SQLite 僅保留為：
  - 歷史資料來源（轉移到 Postgres）
  - 本機臨時備援/除錯用途（必要時）
- 程式層仍支援 `DB_PATH` 回退，但不建議作為 production 常態。

## 啟動時初始化開關
- `DB_AUTO_CREATE_TABLES`（預設 `1`）  
  控制是否執行 `models.Base.metadata.create_all(...)`
- `DB_RUN_LEGACY_MIGRATIONS`（預設 `1`）  
  控制是否執行 `migration.run_migrations()`

## 與 Postgres 相關注意事項
- 現有 `migration.py` 為 SQLite legacy migration（使用 `PRAGMA` / `sqlite_master`）。
- 在 Postgres 下會自動略過 legacy migration，不會執行 SQLite 專用語法。
- 若要做正式 schema 版控，建議導入 Alembic 並將 `DB_AUTO_CREATE_TABLES` / `DB_RUN_LEGACY_MIGRATIONS` 在 production 設為 `0`，改由 CI/CD migration job 管理。

## SQLite -> Postgres（一次性轉移）
在專案根目錄執行：

```bash
python3 server/migrate_sqlite_to_postgres.py \
  --source-sqlite server/data/scripts.db \
  --target-database-url 'postgresql+psycopg://user:pass@host:5432/dbname'
```

若目標 DB 已有舊資料，要覆蓋時加上 `--truncate`：

```bash
python3 server/migrate_sqlite_to_postgres.py \
  --source-sqlite server/data/scripts.db \
  --target-database-url 'postgresql+psycopg://user:pass@host:5432/dbname' \
  --truncate
```

備註：
- 腳本會依表相依順序搬資料，搬完做逐表筆數比對。
- 目標不是 PostgreSQL 時會直接中止。
