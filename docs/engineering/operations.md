# 操作手冊（開發 / 測試 / 部署）
最後更新：2026-11-16（本分支精簡設定；尚未部署）

## 1. 環境需求
- Node.js：`20.19+`
- npm：`10+`（建議）
- Python：`3.11+`
- Docker / Docker Compose：最新版穩定版

## 2. 本機啟動（不使用 Docker）
1. 安裝前端依賴
```bash
npm ci
```
2. 啟動前端
```bash
npm run dev
```
3. 啟動後端
```bash
python3 -m pip install -r server/requirements.txt
cd server
python3 main.py
```

預設常用位址：
- Frontend：`http://localhost:5173`（或 Vite 指定埠）
- Backend API：`http://localhost:1091/api`

### 本機內容管理 MCP

若要使用外部公開台本與 Demo 管理的本機 MCP，先在專案根目錄 `.env` 設定
`MCP_OWNER_ID` 與至少 32 字元的 `MCP_LOCAL_API_KEY`，再安裝：

```bash
server/venv/bin/pip install -r server/mcp_server/requirements.txt
```

MCP client 應執行 `scripts/run-local-external-script-mcp.sh`。它使用 `stdio`，
不會開啟 HTTP port；完整工具、預覽／確認流程與安全邊界見
`docs/architecture/local-external-script-mcp.md`。

## 3. Compose 檔案分工

專案有三份 compose，用途不同，**混用會出事**：

| 檔案 | 用途 | Postgres | 資料目錄 |
|---|---|---|---|
| `docker-compose.prod.yml` | 正式站 | ✅ 有 | `server/data/postgres` |
| `docker-compose.yml` | 完整本機環境（含 DB） | ✅ 有 | `server/data/postgres-dev`（埠 `15432`） |
| `docker-compose.dev.yml` | 輕量開發（backend + Vite dev server） | ❌ 無 | 依 `DATABASE_URL` / `DB_PATH` 外部提供 |

> ⚠️ **2026-08-17 之前 `docker-compose.yml` 與 `docker-compose.prod.yml` 共用
> `server/data/postgres`**。在跑著正式站的機器上執行前者的 `docker compose down`，
> 等同對正式資料庫強制關機 —— 這是那次 WAL 遺失事故最可能的觸發原因。
> 現已分離，且 dev 的對外埠改為 `15432`，避免本機 `psql` 連錯資料庫。

### 完整本機環境（含獨立 DB）

```bash
docker compose up --build
```

首次啟動會在 `server/data/postgres-dev` 建立**空的**資料庫，與正式資料完全分離。
需要測試資料請自行灌入。

### 輕量開發（backend + Vite dev server）

```bash
docker compose -f docker-compose.dev.yml up --build
```

此組合不含 Postgres，需自行以 `DATABASE_URL` 指向可用的資料庫。

對外埠：
- Frontend：`http://localhost:1090`
- Backend：`http://localhost:1091`

## 4. Docker 正式模式（本機模擬）

**必填環境變數（production 不提供即啟動失敗）：**
- `POSTGRES_PASSWORD`：Postgres 密碼，無預設值
- `DATABASE_URL`：後端 DB 連線字串

```bash
POSTGRES_PASSWORD=yourpassword DATABASE_URL=postgresql+psycopg://... docker compose -f docker-compose.prod.yml up --build -d
```

或在 `.env` 設定後再執行：
```bash
docker compose -f docker-compose.prod.yml up --build -d
```

服務組成（checked-in production Compose defaults）：

- `write_project-frontend`：Nginx，只綁 `127.0.0.1:1090` 與 `[::1]:1090`。
- `write_project-backend`：FastAPI，internal network，不 publish host port。
- `write_project-postgres`：PostgreSQL，internal network，不 publish host port。
- 公開 JSON 與 `/api/public-media`：統一由 FastAPI 提供；新版正式部署不再啟動 `write_project-public`。舊版回滾紀錄可保留 Next server。
- `write_project-frontend-build`：Vite 工作室建置。

正式公開入口採 Pages 靜態檔，瀏覽器跨網域讀 Tunnel 主 API，失聯時讀 D1／R2 唯讀備援；工作室經 Tunnel 進本機 Nginx。Compose 基線不證明線上 release 容器的設定，實際 port bindings 與 readiness 須依發布程序驗證。

## 5. 測試與驗證
前端單元測試：
```bash
npm test
```

覆蓋率：
```bash
npm run coverage
```

E2E：
```bash
npm run test:e2e
```

後端測試：
```bash
cd server
python3 -m pytest -q
```

全套測試（前後端）：
```bash
bash scripts/test.sh
```

CI 本機模擬：
```bash
bash scripts/ci.sh
```

## 6. 部署

### 網站發布與回滾

日常網站發布以 [持續部署與發布程序](continuous-deployment.md) 為準。`scripts/release.sh` 協調建置、schema 驗證、候選準備、入口切換、Pages 部署及驗證；`scripts/site-release.py` 留住 PostgreSQL 與其他服務，只管理本站候選及 loopback 入口交接。入口切換仍須驗證，不能由「不停止 DB」推論完全無中斷。

API／本機入口回滾與 Pages 回滾分開；schema 與切換後資料作業不隨映像回滾。Pages 資源、D1／R2 同步與備援驗證見 [正式公開站操作](public-pages-production.md)。CI 與 release reliability 的後續驗收見 [維護路線圖](../pending/architecture-maintenance-roadmap.md)。

### Schema 作業

Production Compose 預設 `DB_AUTO_CREATE_TABLES=0`、`DB_RUN_LEGACY_MIGRATIONS=0`。環境值可覆蓋，須核對實際設定；啟動 API 不替代 schema 作業。`scripts/migrate-prod-schema.sh --verify` 檢查目標完整性，`--plan` 列缺口，`--apply` 經備份、隔離排練與受限作業連線後修改。候選 readiness 仍須通過。

歷史排練或某次 `--apply` 成功不能證明目前線上 schema 完整。此文件未執行 production 檢查；版本庫行為與限制見 [Database Runtime](database-runtime.md)。

### 舊整組部署（只限停機維護）

`safe-deploy.sh` 與 `deploy.sh` 會停止正式 PostgreSQL／整組服務，預設拒絕執行。僅在已安排整組停機維護時使用 `ALLOW_SERVICE_DOWNTIME=1 bash scripts/safe-deploy.sh`；不要直接執行 `deploy.sh`。這是維護入口，不是日常網站發布流程；停機前須檢查備份、容器 stop grace period 與 schema 作業安排。

### 資料庫備份

```bash
bash scripts/backup-db.sh
```

新版產生 PostgreSQL custom dump + media 私有 bundle，保留 14 天；舊 `.sql.gz` 不轉換、不刪除。外接碟副本不代表異地備份。實際排程目前只有本機／外接碟設定，異地目的地尚未設定，也未上傳任何資料。

安裝新版時必須同時複製 `backup-db.sh`、`backup-bundle.py` 到 `~/bin`，並明確設定 `MEDIA_STORAGE_ROOT`；只更新 wrapper 會失敗。此變更未安裝或修改既有排程。完整設定、驗證、還原演練與一致性限制見 [backup-restore.md](backup-restore.md)。

### Cloudflare 快取清除

源站修復後，CDN 仍會依當初快取時的 `s-maxage` 繼續供應舊回應。

```bash
export CLOUDFLARE_API_TOKEN='...'   # 權限：Zone / Cache Purge / Purge
bash scripts/cf-purge.sh            # 預設清除事故受影響的頁面
bash scripts/cf-purge.sh --all      # 清除整個 zone
bash scripts/cf-purge.sh <url>...   # 清除指定網址
```

Token 只從環境變數讀取，不會出現在指令參數或任何輸出中。

### 公開站快照與 server-mode 快取

Pages HTML、metadata、JSON-LD 與 sitemap 固定於建置時。瀏覽器 API 可更新可見內容，但不會替換爬蟲取得的靜態快照；新路徑可能先以 404 外殼載入。內容改動後的 SEO 快照刷新仍須 Pages 重新建置，見 [Pages 操作](public-pages-production.md)；內容觸發刷新與來源新鮮度驗收仍列在 [待辦路線圖](../pending/architecture-maintenance-roadmap.md)。

Next server mode 的 ISR、`/api/revalidate`、媒體 proxy／sharp 與快取標頭只適用於本機 Next adapters，不代表 Pages 執行 Next server。`REVALIDATE_SECRET` 不能刷新已部署的 Pages HTML。CDN purge 只清快取，也不產生新快照。

## 7. 重要環境變數
- `VITE_API_URL`：前端 API 入口（預設 `/api`）
- `DATABASE_URL`：後端 DB 連線字串（正式主用 Postgres）
- `DB_AUTO_CREATE_TABLES`：啟動時是否建立缺表（程式預設 `1`，production Compose 預設 `0`；PostgreSQL 逐表提交）
- `DB_RUN_LEGACY_MIGRATIONS`：是否跑 legacy migration（程式預設 `1`，production Compose 預設 `0`）
- `PUBLIC_BASE_URL`：SEO/Sitemap 公開網址基底
- `FIREBASE_PROJECT_ID` / `FIREBASE_CREDENTIALS_JSON`：Firebase 驗證設定
- `REVALIDATE_SECRET`：Next server-mode `/api/revalidate` 使用的共用 secret；不更新 Pages 靜態快照。
- `ADMIN_USER_IDS` / `ADMIN_USER_EMAILS`：管理權限白名單。優先使用 `ADMIN_USER_IDS`
  —— 以 userId 為準的路徑不可竄改，email 路徑的安全性建立在
  「`users.email` 只由後端從已驗證的 Firebase token 寫入」這個前提上。
- `FEEDBACK_NOTIFICATION_EMAIL`：公開頁回報／上架申請的通知收件人，預設為
  `silence0603@gmail.com`。
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USERNAME` / `SMTP_PASSWORD` / `SMTP_FROM`：回報通知寄信設定。
  Gmail 請使用應用程式密碼；`SMTP_USE_TLS=1`（預設）使用 STARTTLS，若使用 SSL 連線則設定
  `SMTP_USE_SSL=1`。

> 機敏檔案（`.env`、`server/secrets/firebase-service-account.json`）權限應為 `600`。

## 8. 故障排查
- 前端可開、API 全失敗：先檢查 `VITE_API_URL` 與後端是否在 `1091` 啟動。
- 後端啟動但 DB 錯誤：先確認 `DATABASE_URL`，再檢查 Postgres 容器健康狀態。
- E2E 啟動失敗：確認 Playwright 瀏覽器是否安裝（`npx playwright install`）。
- 權限錯誤（媒體上傳）：確認 `MEDIA_STORAGE_ROOT` 或 `server/data/media` 寫入權限。
- 公開頁內容未更新：分別檢查瀏覽器主／備援 API 的資料與 Pages 建置快照；SEO／分享資訊需重新建置 Pages。僅 Next server mode 再檢查 revalidate secret 與 server/CDN 快取。
- `/api/health/integrity` 回 503：索引與 heap 不同步，**重啟無效**。
  參考 2026-08-17 事故的處理方式：備份 → dump → 去重 → 匯入新資料庫 → 切換。

## 9. Health endpoints

Backend（FastAPI）：

- `GET /api/health/live`：只檢查 process 是否能回應。
- `GET /api/health/ready`：檢查資料庫連線與核心 schema；失敗回 `503`。
- `GET /api/health`：`ready` 的相容入口。
- `GET /api/health/auth`：需有效登入憑證的 Firebase Auth smoke test，不供容器探測。
- `GET /api/health/integrity`：資料完整性檢查，**供外部 status 監測輪詢**。

### `/api/health/integrity`

比對 `scripts` 表的 heap 實際列數與索引可見列數，並檢查主鍵是否有重複值。

```json
{"status":"ok","service":"backend",
 "checks":{"scripts":{"status":"ok","heapRows":82,"indexRows":82,"duplicateIds":0}}}
```

不一致時回 **503**：

```json
{"status":"degraded","service":"backend",
 "checks":{"scripts":{"status":"degraded","heapRows":84,"indexRows":83,"duplicateIds":2,
 "reason":"index and heap disagree — likely index corruption; rebuild required (REINDEX may not suffice)"}}}
```

**為什麼不併進 `/ready`**：`/ready` 是 Docker healthcheck 在用的。索引損壞無法靠重啟修復，
若讓它影響 `/ready`，容器只會進入重啟迴圈並讓整站下線。這個端點回 503 是要讓**人**知道，
不是要讓編排系統動作。已有測試釘住這個分界（`test_integrity_does_not_affect_readiness`）。

**由來**：2026-08-17 Postgres 被 SIGKILL 中斷關機 checkpoint，WAL 遺失導致 `scripts` 表
heap 有 84 列而索引只認得 69 列、主鍵出現重複值，4 篇公開台本從網站消失或點進去 404 ——
**三天後才靠肉眼發現**。heap 與索引筆數不一致正是當時最早可觀察到的訊號。
此檢查邏輯已對留存的損壞資料庫實測，能正確回報 degraded。

**注意**：
- 端點會跑全表掃描，結果以 60 秒 TTL 快取，避免公開輪詢放大成 DB 負載。
- 規劃器提示（`enable_seqscan` 等）是 Postgres 專屬；其他 dialect 回 `status: skipped`。
- `scripts/backup-bundle.py drill` 在隔離還原資料庫執行 `pg_amcheck`，驗證資料列與索引；每日備份本身不等同完成還原演練。見 [備份與還原](backup-restore.md)。

Public server adapters（Next.js container internal port 3000；不適用 Pages 靜態入口）：

- `GET /api/health/live`：只檢查 Next.js process。
- `GET /api/health/ready`：連鎖檢查 Backend readiness；失敗回 `503`。
- `GET /api/health`：`ready` 的相容入口。

Nginx 對外入口：

- `GET /healthz`：只檢查 Nginx process。完整依賴狀態請看 readiness endpoints。

所有 health response 都使用 `Cache-Control: no-store`。Docker Compose 與部署腳本只接受 readiness 的 HTTP `200`，`4xx/5xx` 不視為健康。
