# 操作手冊（開發 / 測試 / 部署）
最後更新：2026-07-30

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

## 3. Docker 開發模式
```bash
docker compose -f docker-compose.dev.yml up --build
```

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

服務組成：
- `write_project-frontend`（Nginx，對外唯一入口，1090）
- `write_project-backend`（FastAPI，僅限 internal network，不對外 publish）
- `write_project-postgres`（PostgreSQL，僅限 internal network，不對外 publish）

> **注意**：production compose 只有 nginx（1090）對外。若需直接連後端或 DB 進行維運，請使用 `docker exec` 或 SSH tunnel，不要在 production compose 加 `ports`。

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

## 6. 部署腳本
正式部署腳本：
```bash
bash scripts/deploy.sh
```

常用參數：
- `force=1`：略過 commit hash 檢查，強制部署
- `ci=1`：部署前先跑 CI precheck
- `migrate_pg=1`：執行 SQLite -> PostgreSQL 一次性遷移

範例：
```bash
bash scripts/deploy.sh ci=1 force=1
bash scripts/deploy.sh migrate_pg=1 target_db='postgresql+psycopg://user:pass@127.0.0.1:5432/write_project'
# 注意：production DB 不對外 publish port，migration 需透過 SSH tunnel 或 docker exec 執行
```

## 7. 重要環境變數
- `VITE_API_URL`：前端 API 入口（預設 `/api`）
- `DATABASE_URL`：後端 DB 連線字串（正式主用 Postgres）
- `DB_AUTO_CREATE_TABLES`：啟動時是否 `create_all`（預設 `1`）
- `DB_RUN_LEGACY_MIGRATIONS`：是否跑 legacy migration（預設 `1`）
- `PUBLIC_BASE_URL`：SEO/Sitemap 公開網址基底
- `FIREBASE_PROJECT_ID` / `FIREBASE_CREDENTIALS_JSON`：Firebase 驗證設定

## 8. 故障排查
- 前端可開、API 全失敗：先檢查 `VITE_API_URL` 與後端是否在 `1091` 啟動。
- 後端啟動但 DB 錯誤：先確認 `DATABASE_URL`，再檢查 Postgres 容器健康狀態。
- E2E 啟動失敗：確認 Playwright 瀏覽器是否安裝（`npx playwright install`）。
- 權限錯誤（媒體上傳）：確認 `MEDIA_STORAGE_ROOT` 或 `server/data/media` 寫入權限。

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
- `scripts/backup-db.sh` 每日備份時也會做同一項檢查並寫入 log。

Public（Next.js container internal port 3000）：

- `GET /api/health/live`：只檢查 Next.js process。
- `GET /api/health/ready`：連鎖檢查 Backend readiness；失敗回 `503`。
- `GET /api/health`：`ready` 的相容入口。

Nginx 對外入口：

- `GET /healthz`：只檢查 Nginx process。完整依賴狀態請看 readiness endpoints。

所有 health response 都使用 `Cache-Control: no-store`。Docker Compose 與部署腳本只接受 readiness 的 HTTP `200`，`4xx/5xx` 不視為健康。
