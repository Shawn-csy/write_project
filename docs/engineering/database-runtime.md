# Database Runtime Notes
最後更新：2026-03-20

## 支援模式
- SQLite（預設）：使用 `DB_PATH`，例如 `/data/scripts.db`
- Postgres：設定 `DATABASE_URL`，例如 `postgresql+psycopg://user:pass@host:5432/dbname`

當 `DATABASE_URL` 存在時，後端會優先使用它；否則回退到 `DB_PATH`。

## 啟動時初始化開關
- `DB_AUTO_CREATE_TABLES`（預設 `1`）  
  控制是否執行 `models.Base.metadata.create_all(...)`
- `DB_RUN_LEGACY_MIGRATIONS`（預設 `1`）  
  控制是否執行 `migration.run_migrations()`

## 與 Postgres 相關注意事項
- 現有 `migration.py` 為 SQLite legacy migration（使用 `PRAGMA` / `sqlite_master`）。
- 在 Postgres 下會自動略過 legacy migration，不會執行 SQLite 專用語法。
- 若要做正式 schema 版控，建議導入 Alembic 並將 `DB_AUTO_CREATE_TABLES` / `DB_RUN_LEGACY_MIGRATIONS` 在 production 設為 `0`，改由 CI/CD migration job 管理。

## SQLite -> Postgres 一次性轉移
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
