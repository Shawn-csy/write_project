# 資料庫架構（版本庫現況）
最後更新：2026-11-13

本文描述 checked-in defaults，並非線上容器、資料或 schema 的即時驗證。

## 主資料與備援

- FastAPI／SQLAlchemy 以 PostgreSQL 16 為主資料庫；production Compose 的 service 為 `write_project-postgres`，容器內埠 `5432`，**沒有 host port publish**。
- `DATABASE_URL` 為 production 必填值，不提供預設連線字串。Backend 同樣不 publish host port；Nginx 僅綁 IPv4／IPv6 loopback `1090`。
- 公開入口是 Pages 靜態檔，瀏覽器讀 Tunnel 主 API；D1／R2 保存公開資料／媒體的唯讀備援，不是 PostgreSQL 寫入替代品。見 [Pages 操作](public-pages-production.md)。

## 持久化與隔離

- 容器資料目錄：`/var/lib/postgresql/data`。
- production bind mount：`server/data/postgres`；dev：`server/data/postgres-dev`，dev host port 為 `15432`。
- 不得共用 dev／prod 資料目錄。歷史 SQLite 來源與除錯資料不代表正式主資料庫。

## 啟動與 schema

程式本身的 `DB_AUTO_CREATE_TABLES`、`DB_RUN_LEGACY_MIGRATIONS` 預設為 `1`；production Compose 將兩者預設覆蓋為 `0`，明確的環境值仍可覆蓋。啟用時，PostgreSQL 缺表建立由 `schema_bootstrap.create_missing_tables()` 逐表提交；`migration.run_migrations()` 會執行 PostgreSQL migration，並非跳過非 SQLite 資料庫。

Schema 作業與 API 啟動分離。以 `scripts/migrate-prod-schema.sh --verify` 檢查目標 schema 完整性，不以本文或歷史紀錄推定線上已就緒；`--plan` 列缺口，`--apply` 經隔離排練及備份後才修改。程序與限制見 [runtime notes](database-runtime.md) 和 [發布程序](continuous-deployment.md)。

## 模型與維護入口

- ORM：`server/models.py`；連線：`server/database.py`。
- 目前遷移：`server/migration.py`；SQLite 一次性轉移：`server/migrate_sqlite_to_postgres.py`（`--truncate` 會覆蓋目標資料）。
- 網站發布由 `scripts/release.sh`／`scripts/site-release.py` 管理，不停止 PostgreSQL。舊整組 `safe-deploy.sh` 僅限已安排的停機維護，不能作為日常發布路徑。
- 版本化 migration 與 restore 驗收仍是 [待辦路線圖](../pending/architecture-maintenance-roadmap.md)，不代表已完成。
