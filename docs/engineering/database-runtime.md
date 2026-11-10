# Database Runtime Notes
最後更新：2026-11-10

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
  控制是否建立 ORM 缺表；PostgreSQL 逐表提交，SQLite 使用 `models.Base.metadata.create_all(...)`。production Compose 預設覆蓋為 `0`。
- `DB_RUN_LEGACY_MIGRATIONS`（預設 `1`）  
  控制是否執行 `migration.run_migrations()`

## 與 Postgres 相關注意事項
- 現有 `migration.py` 包含 `_run_postgres_migrations()`；在 Postgres 上會執行新增欄位、索引、外鍵調整與資料回填，並非跳過。
- PostgreSQL legacy migration 已在主要 schema 變更與資料回填之間分段提交，以縮短舊服務讀取被 DDL 鎖住的時間；它仍包含非 concurrent 索引與其他可能阻塞寫入的操作，不能只靠本機讀取探針宣稱正式環境零中斷。
- PostgreSQL 缺表建立改由 `schema_bootstrap.create_missing_tables()` 依缺表的外鍵相依順序逐表提交，避免一筆交易跨越整個 ORM catalog；production Compose 仍預設不在 Backend 啟動時自動執行這一步。
- 正式 schema 的獨立作業入口是 `scripts/migrate-prod-schema.sh`；`--plan` 只檢查、`--verify` 要求完整，`--apply` 先排練與備份再修改。作業連線有鎖／單句時間上限及 advisory lock，且與 API 啟動分開。現行線上 schema 尚不完整，正式 `--apply` 尚未執行。
- 工作區的 production Compose 已將兩個初始化開關預設設為 `0`，候選 Backend 啟動不會自行改動 schema。現行線上容器仍是舊設定；要使用新版服務，須先獨立完成受控遷移，再以候選 readiness 驗證，最後才切換流量。正式 `.env` 若明確把開關設為 `1`，仍會覆蓋 Compose 預設；發布前須檢查實際解析結果。
- 2026-11-10 的正式資料庫唯讀檢查發現多個新模型表和欄位尚未存在；隔離複本排練可成功遷移，新舊 API 都能讀取公開 bundle。仍須驗證並發寫入與鎖等待上限，不能直接用整組停機部署腳本替代。

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
