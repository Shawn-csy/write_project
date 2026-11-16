# Database Runtime Notes

正式服務拓樸、發布流程與維運總覽見 [正式架構](../architecture/production-architecture.md)。
最後更新：2026-11-13

本文描述版本庫預設，不是線上 runtime 查驗結果。

## 正式模式（主用）
- 正式環境以 PostgreSQL 為唯一主用資料庫。
- 連線使用 `DATABASE_URL`，例如 `postgresql+psycopg://user:pass@host:5432/dbname`。
- 目前正式 compose 由 `write_project-postgres` 提供資料庫服務。

## SQLite 角色（備用）
- SQLite 不再作為正式主用 DB。
- 主應用程式的 SQLite 僅保留為：
  - 歷史資料來源（轉移到 Postgres）
  - 本機臨時備援/除錯用途（必要時）
- 程式層仍支援 `DB_PATH` 回退，但不建議作為 production 常態。

外部台本爬蟲另外使用獨立 SQLite 檔保存執行紀錄與探索候選；這是獨立 CLI 程序的工作狀態；目前未安裝爬蟲排程，不是公開作品的主資料庫。爬蟲唯讀查詢主資料庫，候選不會直接發布。狀態檔必須放在持久化資料目錄，操作方式見 [外部台本自動探索](external-script-crawler.md)。

## 啟動時初始化開關
- `DB_AUTO_CREATE_TABLES`（預設 `1`）  
  控制是否建立 ORM 缺表；PostgreSQL 逐表提交，SQLite 使用 `models.Base.metadata.create_all(...)`。production Compose 預設覆蓋為 `0`。
- `DB_RUN_LEGACY_MIGRATIONS`（預設 `1`）  
  控制是否執行 `migration.run_migrations()`

## 與 Postgres 相關注意事項
- 現有 `migration.py` 包含 `_run_postgres_migrations()`；在 Postgres 上會執行新增欄位、索引、外鍵調整與資料回填，並非跳過。
- PostgreSQL legacy migration 已在主要 schema 變更與資料回填之間分段提交，以縮短舊服務讀取被 DDL 鎖住的時間；它仍包含非 concurrent 索引與其他可能阻塞寫入的操作，不能只靠本機讀取探針宣稱正式環境零中斷。
- PostgreSQL 缺表建立改由 `schema_bootstrap.create_missing_tables()` 依缺表的外鍵相依順序逐表提交，避免一筆交易跨越整個 ORM catalog；production Compose 仍預設不在 Backend 啟動時自動執行這一步。
- 正式 schema 的獨立作業入口是 `scripts/migrate-prod-schema.sh`；`--plan` 只檢查、`--verify` 要求完整，`--apply` 先排練與備份再修改。作業連線有鎖／單句時間上限及 advisory lock，且與 API 啟動分開。目標 schema 是否完整須在發布時執行 `--verify`，本文不宣稱目前線上狀態。
- 工作區的 production Compose 已將兩個初始化開關預設設為 `0`，候選 Backend 啟動不會自行改動 schema。使用新版服務前，須獨立驗證 schema，必要時完成受控遷移，再以候選 readiness 驗證，最後才切換流量。正式 `.env` 若明確把開關設為 `1`，仍會覆蓋 Compose 預設；發布前須檢查實際解析結果。
- 2026-11-10 的缺表檢查與複本排練是歷史觀察，不代表目前線上 schema。發布仍須驗證並發寫入、鎖等待上限與目標 `--verify`；canonical procedure 見 [發布程序](continuous-deployment.md)。

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
