# 操作手冊（開發 / 測試 / 部署）
最後更新：2026-10-20

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

服務組成：
- `write_project-frontend`（Nginx；工作區 Compose 已改為只綁 `127.0.0.1:1090` 與 `[::1]:1090`，正式執行中的舊容器尚未套用，仍綁 `0.0.0.0:1090` 與 `[::]:1090`）
- `write_project-backend`（FastAPI，僅限 internal network，不對外 publish）
- `write_project-postgres`（PostgreSQL，僅限 internal network，不對外 publish）

> **注意**：Tunnel 的 `localhost:1090` 可能透過 IPv6 `::1` 連入；2026-11-10 實際連線亦如此。因此同時保留 IPv4、IPv6 loopback 綁定，不開放 LAN。部署後檢查兩種 loopback 的 `/healthz`、公開網址及 Docker 的 port binding。後端與 DB 維持 internal network，不要在 production compose 加 `ports`。

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

### 既有整組部署流程（需要維護時段）

```bash
# 僅在已安排停機維護時使用
ALLOW_SERVICE_DOWNTIME=1 bash scripts/safe-deploy.sh
```

`safe-deploy.sh` 會先停止正式 PostgreSQL，`deploy.sh` 接著對整組服務執行
`docker compose down`。兩支腳本預設拒絕執行，只有明確設定 `ALLOW_SERVICE_DOWNTIME=1` 才能進入停機流程。這條舊流程會中斷整組服務，不能用於目前只交接網站入口的優化發布；網站專用流程見下節。需要整組維護部署時，**不要直接執行 `scripts/deploy.sh`。** 後者的 `docker compose down` 會使用
容器「建立當下」的 `stop_grace_period`。2026-08-17 事故即因寬限期只有 10 秒，
Postgres 關機 checkpoint 未完成就被 SIGKILL，WAL 遺失導致 `scripts` 表索引與
heap 不同步、4 篇公開台本損毀。

工作區 production Compose 現已預設關閉 Backend 啟動時的建表與 legacy migration；線上舊容器的兩個開關仍是 `1`。這個預設不會更新線上容器，也不會替代正式 schema 遷移。若在維護時段走舊部署路徑，須先確認 schema 已就緒或明確安排獨立遷移，否則新版 Backend 的 readiness 會拒絕啟動。

新版公開站 `/api/health/ready` 會檢查 backend 的 `publicApiCapabilities`，包括 bundle 分區、外部封面單筆查詢、活動狀態與音聲作品；缺少時回 503、`checks.backend=incompatible`。Backend 會從 ORM 模型產生完整表／欄位契約，透過資料庫 metadata 單次查詢驗證，不掃描使用者資料；schema 不完整即回 503。2026-11-10 實測：新版程式配 Dev DB 回 200；新版公開站配線上舊 backend 回 503。網站專用切流因此先讓新版 backend、公開站與候選 Nginx 就緒，再交接入口；舊的整組部署腳本仍不具備此能力。

同日以正式 DB 的 11 MB 邏輯備份在隔離 PostgreSQL 排練：遷移前正式 schema 缺少 11 個新模型表、數個既有表的新欄位，唯讀候選 Backend 因此回 `schema=failed`。對複本執行缺表建置與 Postgres migration 後，新、舊 Backend 均能讀取公開 bundle；`scripts` 90、外部台本 125、personas 9、organizations 2、feedback 2、likes 0 的筆數與正式 DB 相同。正式庫後來已執行同一增量遷移；這段是遷移前的排練記錄。

可重跑的隔離排練：

```bash
bash scripts/rehearse-prod-schema.sh
```

腳本只從正式 PostgreSQL 執行 `pg_dump` 與筆數查詢；在獨立 Docker network/volume 的資料複本透過獨立作業執行目前 schema migration，作業連線設定 `lock_timeout=250ms`、`statement_timeout=10s`，再讓線上舊版與工作區新版 Backend 以唯讀連線檢查 readiness、公開 bundle。它比對核心表遷移前後筆數，完成後刪除暫存資料庫、volume 與 network。2026-11-10 實跑通過；這仍不能證明正式環境並發寫入時遷移不會短暫阻塞，因此不能當作直接修改正式 schema 的放行條件。

可加 `REHEARSAL_READ_PROBE=1 REHEARSAL_WRITE_PROBE=1`，在複本遷移期間反覆讀取五張既有表，並以每次回滾的更新交易測四張既有表寫入，列出樣本數、最大延遲和錯誤數；腳本亦會再跑一次遷移，核對核心與新建身份表筆數不變。2026-11-10 的隔離排練中，單一交易版本相關表讀取最慢約 0.3–0.5 秒；分段提交後讀取約 0.06–0.11 秒。原本整批建表時，`personas` 寫入曾等約 1.2 秒；改為按缺表相依順序逐表提交後，這次測得四張既有表讀取與寫入最慢約 0.07–0.10 秒，沒有錯誤。這些數字只是本機小資料量的回歸訊號，不是正式流量的延遲保證。若發生遷移失敗，分段已提交的 schema 變更不會自動回滾；須先檢查失敗點，再安全重跑。

探針只要有一次讀寫失敗，排練就會以非零狀態中止；不得把這種結果當作發布通過。

獨立遷移命令與目前實際狀態：

```bash
bash scripts/migrate-prod-schema.sh --plan    # 唯讀列出缺口
bash scripts/migrate-prod-schema.sh --verify  # 缺表／欄位時非零結束
# --apply 會先重跑隔離複本的讀寫探針、建立備份，然後才修改正式 schema
bash scripts/migrate-prod-schema.sh --apply
```

`--apply` 使用獨立容器與資料庫 advisory lock，所有連線套用 250 ms 鎖等待、10 秒單句與閒置交易上限；候選 Backend 仍須以 `DB_AUTO_CREATE_TABLES=0`、`DB_RUN_LEGACY_MIGRATIONS=0` 啟動。2026-11-10 已在複本驗證遷移、重跑、併發讀寫及第二個遷移工作被拒絕；正式 `--apply` 也已執行，備份位於 `/Users/shanti/write_project_backups/write_project_20261110_041812.sql.gz`。正式庫的 `--verify` 現為零個 mapped schema gap，原服務與公開首頁仍正常。這個命令只處理 schema，並未切換流量。

0.7.4 的新增資源結構再增加 9 張資料表。2026-11-10 17:38 以同一流程完成正式遷移，遷移前備份為 `/Users/shanti/write_project_backups/write_project_20261110_173802.sql.gz`，`--verify` 再次顯示零個缺口。17:44 先備份 38 張表至 `/Users/shanti/write_project_backups/write_project_20261110_174440.sql.gz`，再把 Dev 的已核准公開目錄固定為單一快照，在正式資料複本排練後用 `scripts/import-prod-public-catalog.py` 匯入正式庫。快照 SHA256 為 `bd56c7acd7fda29860378f95686e232e86a4225d7ae26cb580496379da64e6d1`。匯入後有 227 筆核准音聲作品、8 筆編輯資源、100 筆資源作品關聯及 835 筆音聲製作署名；新版 API 以唯讀連線回應 readiness／bundle 200，公開資料包含 53 筆資源。現行正式入口未切換。

切至 0.7.4 後發現第一輪匯入未包含 Demo 與外部作者公開資料。17:56 先備份至 `/Users/shanti/write_project_backups/write_project_20261110_175610.sql.gz`，再用 SHA256 `1e2f94a81418ea04ee91708e5454dd6e9a347fd06e35a9ee4e6f92d306482a61` 的補充快照於正式複本排練並匯入：2 筆已核准 Demo、2 筆外部作者資料頁及 20 篇外部台本的 Demo 連結。完成後重新驗證新版公開資料包：Dev 與正式站都顯示 2 筆 Demo、19 篇公開外部台本含 Demo 連結；正式站原有的 15 篇額外外部台本保留。Dev 的私人測試台本、拒絕投稿與測試橫幅沒有匯入。已通知 Next.js 清除 `/demos`、`/authors`、`/resources` 與 sitemap 快取。

### 同正式資料的唯讀候選站

```bash
bash scripts/stage-prod-candidate-readonly.sh --start
bash scripts/stage-prod-candidate-readonly.sh --status
bash scripts/stage-prod-candidate-readonly.sh --stop
```

此腳本用已建置的 `candidate-20261110` 映像和靜態檔，在正式 Docker 網路啟動獨立 API、公開站與 Nginx。API 使用 PostgreSQL 唯讀交易，候選入口只綁 IPv4 loopback 隨機埠。它完成 readiness 與九條路徑的煙霧測試，但不接收公開流量；結束後執行 `--stop`。2026-11-10 已在同一份正式資料上完成兩輪 HTTP 和五次 Chromium 比較，結果見 [public-performance-baseline.md](public-performance-baseline.md)；候選容器已停止。

切流前可另跑與正式寫入設定相同的雙路徑預備檢查：

```bash
RELEASE_TAG=candidate-lcp-20261110 bash scripts/stage-prod-release.sh --start
bash scripts/stage-prod-release.sh --status
bash scripts/stage-prod-release.sh --stop
```

此腳本從現行 API／公開站容器複製環境變數至權限 600 的暫存檔（離開時刪除），啟動新版 API、公開站與兩個只綁 IPv4／IPv6 loopback 隨機埠的 Nginx：新版入口指向候選服務，舊版入口指向現行服務。候選 API 使用正式資料目錄的可寫掛載，但關閉啟動建表及 legacy migration；檢查本身只發出唯讀 GET。新版九條路徑須回 200，舊版逐路徑與現行 1090 入口比對狀態碼，並檢查兩個 Nginx 的設定語法和 IPv6 入口。2026-11-10 實跑通過後已停止所有預備容器，沒有切換公開流量。此腳本只做一次性預備檢查，容器採 `--rm` 且設定目錄位於暫存區，不能直接作為正式持久部署或回滾機制。

舊 Nginx 容器的 `/etc/nginx/conf.d/default.conf` 單檔 bind mount 在容器內已不可見，`nginx -t` 因缺檔失敗，不能在該容器上安全 reload。新入口改掛載完整設定目錄；`nginx.conf` 是指向 `deploy/nginx/default.conf` 的相容符號連結。2026-11-10 網站專用切流後，舊前端容器已停止，新入口 `wp-prod-live-edge` 實際只綁 `127.0.0.1:1090` 與 `[::1]:1090`。舊版 fallback `wp-prod-legacy-edge` 曾接管同一個 loopback 埠完成回滾；最後再次切至新版。舊 `deploy.sh`／`safe-deploy.sh` 仍會停掉整組服務，不可用於此發布路徑，也不要在新入口運作時對舊 Compose 專案執行 `up`，以免爭用 `1090`。

### 網站專用切流與回滾（2026-11-10 已執行）

```bash
python3 scripts/site-release.py status
python3 scripts/site-release.py rollback --tag rsc-cache-all-20261110
```

`--activate` 先把候選靜態檔複製到不受 Vite 清理的 `releases/<tag>`，並保存舊站靜態檔供回滾；接著啟動有持久重啟政策的新版 API 與公開站，在隨機 loopback 埠檢查新版與舊版 Nginx、九條路徑、IPv6 及設定語法。舊版路徑狀態碼以切流前的實際入口為準。最後只停止網站的舊入口容器並交接 `1090`，不停止 PostgreSQL、舊 API、舊公開站或其他服務。若新入口檢查失敗，腳本接回已預先驗證的舊版 Nginx。交接 `1090` 仍可能有短暫的本站請求中斷，不是嚴格零停機發布。

本次先備份正式 DB 至 `/Users/shanti/write_project_backups/write_project_20261110_044451.sql.gz`（29 表、scripts heap/index 90/90），在隔離埠排練切換與回滾，再執行正式切換。後續台灣時區瀏覽器發現首頁日期 hydration 錯誤，立即以 `--rollback` 接回舊入口；核對後發現舊版也有相同時區錯誤。已將公開卡片日期固定為 `Asia/Taipei` 並以純函式子路徑供 SSR 使用，修正版在 UTC、台灣、洛杉磯三種時區的隔離入口都沒有頁面錯誤，於同日再切至 `candidate-date-20261110`。正式入口與公開網址的 `/`、`/authors`、`/audio-works`、readiness 均回 200，三種時區的正式首頁也都無 hydration 錯誤；新入口僅發布雙 loopback，舊 API／公開站／PostgreSQL 仍健康。舊 frontend 容器保留停止狀態，供事後比對；回滾使用上方命令，不依賴其失效的單檔掛載。

同日另以 `scripts/relocate-prod-release.sh` 將正式入口、API 與公開站切到 `releases/candidate-date-20261110`：新 API 的 `/app/dist` 及新 Nginx 的靜態檔與設定都掛在持久目錄。預備階段檢查新舊雙入口、九條路徑、Nginx 語法與 IPv6；切流後正式入口及公開網址的主要路徑均回 200，UTC、台灣、洛杉磯三種時區的首頁／作者頁／音聲頁瀏覽器檢查均無 page error，PostgreSQL 和原本服務保持健康。舊 `wp-prod-live-api`／`wp-prod-live-public` 留作臨時回滾來源，舊入口已停止。第一次切流腳本在清理 `--rm` 預覽容器時遇到 Docker 移除競態而回傳非零；正式切流與驗證已成功，清理邏輯已修正，殘留預覽容器已停止。

0.7.4 前的正式入口是 `wp-site-rsc-cache-all-20261110-edge`，掛載持久 `releases/rsc-cache-all-20261110`。更早版的映像、設定與靜態檔仍留存供人工重建。一次性 `relocate-prod-release.sh` 僅保留為遷移歷程；整組 `rollback.sh` 不適用於目前的入口容器組合。

2026-11-10 0.7.4 已切至 `wp-site-v0-7-4-r3-edge`。候選版在隔離入口通過 13 條路徑、22 次手機／平板瀏覽器巡覽、投稿表單必填驗證、讀寫限流及 RSC 快取邊界檢查；切流後公開網址的首頁、作者、資源、資源詳情、Demo、音聲作品、關於、說明及 API 回應 200，手機瀏覽器複查無頁面錯誤。`/resources` 與 `/demos` 的 Nginx 路由是在候選驗收時發現並修正的。回滾使用 `python3 scripts/site-release.py rollback --tag v0-7-4-r3`，會接回上一版 `wp-site-rsc-cache-all-20261110-edge`。資料庫匯入不會隨入口回滾而回復。

同日將修正版切至 `wp-site-v0-7-4-r5-edge`。此版把工作室 Demo 管理移至 `/studio/demos`，公開 `/demos` 保持由 Next.js 提供；修正 CI 在新版 FastAPI 的路由檢查及後端缺少 `mcp` 依賴。首次候選建置因未帶入 Vite 公開登入設定，瀏覽器檢查發現 Firebase 錯誤，已停止該候選版並用正式設定重建。`r5` 預備檢查通過 14 條路徑、IPv4／IPv6、RSC 快取邊界；寫入與讀取限流檢查通過，375px 與 811px 的公開 Demo、資源及工作室管理頁沒有頁面錯誤或橫向溢出。正式網址複查三頁回應 200 且無瀏覽器錯誤；main 的兩組 CI 均通過，前端 2,515 項測試通過。現在回滾請用 `python3 scripts/site-release.py rollback --tag v0-7-4-r5`，直接回到 `r3`。資料庫不會隨入口回滾而回復。

2026-11-11 發布 `wp-site-v0-7-4-r12-edge`，加入 Persona 作者頁資料補充，以及管理端作者／聲演共用審核。申請沿用既有 profile submission table，以 JSON `profileKind` 區分種類，不需資料庫 schema migration。公開站、FastAPI 與 Vite 工作室均以同一 tag 建置；候選版通過 14 條路徑、IPv4／IPv6、RSC 快取邊界、寫入與讀取限流檢查後，只交接雙 loopback `1090`，PostgreSQL 與其他服務未重啟。Cloudflare Pages 前端當時未同步重建，故正式網域仍顯示舊表單。

同日發布 `wp-site-v0-7-4-r13-edge` 並重新部署 Cloudflare Pages。根因是指定身份公開的是作者角色，聲演角色則未公開；舊頁面仍將資料送成聲演申請，因而回覆「找不到公開的聲演身份」。新版表單預設更新作者資料並改用通用「更新資料」標題，後端也會把舊頁面送來的聲演申請轉成作者申請。候選版指定作者頁回 200 並顯示新文案，RSC 邊界及入口讀寫限流檢查通過；切換後 readiness 回 200。Pages 部署 `70f4475f.write-project-public-site.pages.dev` 與正式網域指定作者頁均回 200，舊標題已不再出現。回滾後端使用 `python3 scripts/site-release.py rollback --tag v0-7-4-r13`；Cloudflare Pages 可從 `write-project-public-site` 的部署記錄回滾。

清理舊發布資產時保留正式版 r13 與唯一回滾版 r12，移除本機 r3、r5–r11 的服務容器、映像標籤及部署檔；Cloudflare Pages 保留目前部署和一個前版。

2026-11-11 發布 `wp-site-v0-7-4-r14-edge` 與 Cloudflare Pages。管理端的外部作者頁已有 `linkedPersonaId`，但舊 `ExternalAuthor` 紀錄仍為空；公開資料包先讀舊紀錄，導致同一作者分裂成外部作者卡與聲演 Persona 卡。修正後公開身份投影以管理端明確連結為準，外部台本寫入流程亦同步該連結；伊橙與安里的既有作者頁透過管理介面重新儲存，讓資料庫紀錄一致。作者名錄只列有已公開台本關係的身份，雙角色頁將台本作品與音聲作品放在同一頁；作者路由固定顯示作者導覽。另移除作者頁舊組織關聯的展示，並接受原有 Email／Discord 聯絡值隨資料補充一併送審。候選與正式網址的指定頁面均回 200，作者名錄各只顯示一張伊橙、安里卡片。後端回滾使用 `python3 scripts/site-release.py rollback --tag v0-7-4-r14`。

### 一鍵發布腳本（2026-11-11 起）

`scripts/release.sh` 把下方手動流程串成固定步驟，並補上身份收斂與 Cloudflare Pages：

```bash
bash scripts/release.sh build <tag>      # 只接受已推送、兩組 CI 皆綠燈的 main；建 API／公開站映像與工作室靜態檔
bash scripts/release.sh schema           # 列出 schema 缺口（--apply 會先排練、備份再遷移）
bash scripts/release.sh prepare <tag>    # site-release prepare ＋ 讀寫限流與 RSC 快取邊界檢查
bash scripts/release.sh activate <tag>   # 交接 1090，接著在新 API 執行身份收斂
bash scripts/release.sh pages            # 建置並上傳 Cloudflare Pages
bash scripts/release.sh verify           # 正式網域煙霧測試
bash scripts/release.sh all <tag>        # 依序執行；需要 schema 遷移時會停下，除非加 --apply-schema
```

正式 API 以 `DB_RUN_LEGACY_MIGRATIONS=0` 啟動，因此啟動時**不會**執行身份收斂（`DB_RUN_IDENTITY_CONVERGENCE` 預設跟隨該開關）；`activate` 切流後才執行，避免候選容器在舊版仍服務時改寫資料。`migrate-prod-schema.sh`、`rehearse-prod-schema.sh` 等腳本改由 `site-release.py current-api` 找出 1090 背後的現行 API，不再寫死已不存在的 `write_project-write_project-backend-1`；必要時可用 `MIGRATION_SOURCE_BACKEND` 指定。`prepare` 複製舊容器環境變數時會去除重複鍵（先前每次發布都會累加一份）。

### 自動部署

main 的 CI 全綠後由 GitHub Actions 自架 runner 自動執行 `release.sh auto`，詳見 [continuous-deployment.md](continuous-deployment.md)。下方的手動流程仍可用於需要人工把關的發布。

2026-11-11 以 `release.sh` 手動發布 `v0-7-4-r15`（#38 統一身份頁、#39 發布修正）。先以 `release.sh schema --apply` 新增 `persona_credits`、`persona_credit_names` 兩表與 `production_resources.personaId` 欄位，排練讀寫最慢約 30 ms、無錯誤，備份 `/Users/shanti/write_project_backups/write_project_20261111_154017.sql.gz`；`prepare` 通過全部檢查後切流，接著在新 API 執行身份收斂：新建 63 個身份，一介、海聶、芽瑪合併進既有身份，連結 14 位外部作者與 8 筆舊資源。Cloudflare Pages 部署 `0e91b6d8.write-project-public-site.pages.dev`；正式網域主要路徑與 API readiness 回 200，舊 `/resources/credit-…` 網址轉至身份頁。回滾使用 `python3 scripts/site-release.py rollback --tag v0-7-4-r15`（接回 r14）；資料不隨之回復。

### 後續版本的網站專用發布

新版本需先有相同 tag 的 `write_project-backend:<tag>`、`write_project-public:<tag>` 映像，以及 `dist/releases/<tag>/index.html`。設定新的 release tag 後執行：

```bash
RELEASE_TAG=release-20261110-r2
python3 scripts/site-release.py status
python3 scripts/site-release.py prepare --tag "$RELEASE_TAG"
CANDIDATE_PORT=$(docker port "wp-site-${RELEASE_TAG}-check" 80/tcp | awk -F: '/^127[.]0[.]0[.]1:/ {print $NF}')
python3 scripts/check-ingress-write-limits.py --base-url "http://127.0.0.1:${CANDIDATE_PORT}"
python3 scripts/check-ingress-read-limits.py --base-url "http://127.0.0.1:${CANDIDATE_PORT}"
python3 scripts/check-rsc-cache-boundary.py --base-url "http://127.0.0.1:${CANDIDATE_PORT}" --sample-sitemap
python3 scripts/site-release.py activate --tag "$RELEASE_TAG"
python3 scripts/site-release.py rollback --tag "$RELEASE_TAG"
```

`prepare` 從目前佔用雙 loopback `1090` 的入口辨識其 API、公開站、靜態目錄與 Nginx 設定，將候選靜態檔複製到持久 `releases/<tag>`，把控制資料與新 Nginx 設定放在靜態根目錄之外的 `releases/.site-release/<tag>`。它啟動候選 API／公開站及新舊兩條隨機 loopback 預覽入口，檢查 readiness、Nginx 語法、IPv4／IPv6 與 14 條路徑，不切換正式流量。若 Docker 分配的候選埠不可連入，預覽入口最多重建三次；仍失敗就停止候選且不切流。`activate` 再次驗證兩條入口、舊入口容器 ID 與新舊靜態檔摘要，最後只交接 `1090`；若驗證失敗會重啟原入口。`rollback` 先驗證原入口的預覽及其靜態檔摘要，再交接回原容器；候選容器仍保留供排查。未啟用的預備容器可用 `stop-prepared --tag <tag>` 移除。腳本以鎖避免同時執行兩個發布動作，且不停止 PostgreSQL 或其他服務。每個 tag 只能準備一次，需以新的 tag 重試。

`prepare` 與 `activate` 現在也會在候選入口自動執行 RSC 快取邊界檢查，從 sitemap 抽樣首頁、台本、作者、社團與系列等頁面。2026-11-10 以現行映像排練 `prepare` 通過；用舊版公開站映像排練時因 RSC 回應仍為公開快取而拒絕，候選容器與控制資料自動清除，正式入口未切換。手動執行上方 `check-rsc-cache-boundary.py` 可在切流前查看同一項結果。

切流穩定後，可執行 `python3 scripts/site-release.py retire-ancestors --dry-run` 檢查清單，再執行 `python3 scripts/site-release.py retire-ancestors` 停用比直接回滾版本更早的本站 API／公開站。工具會先核對正式版、直接回滾版、每個舊入口的 upstream 與預覽容器狀態；只停止舊程序，保留容器、映像、設定與靜態檔。在仍保留容器的兩層回滾範圍內，`rollback` 會先重啟其 API／公開站並驗證 readiness，再切換入口；更早版需要依留存映像與設定人工重建。2026-11-10 已停用 `candidate-fold-20261110` 與 `wp-prod-durable` 的四個舊程序，約釋放 334 MiB 常駐記憶體；正式版和直接回滾版仍運作，其他服務未重啟。

2026-11-10 清理 OrbStack 容器清單：在鎖定發布流程、核對 52 個目標容器 ID 均已停止後，移除 16 組更早發布版本的 48 個容器與 4 個舊 `wp-prod` 容器。正式版、直接回滾版和第二層回滾版共 9 個 `wp-site-*` 容器保留；映像、靜態檔、控制資料、PostgreSQL、Dev 與其他服務均未刪除。清理後首頁、readiness 與雙 loopback 網路邊界正常，`retire-ancestors --dry-run` 會略過已完整移除的舊版本，仍拒絕只缺部分容器的版本。

2026-11-10 以同版本映像的臨時 tag 完成 `prepare → activate → rollback → stop-prepared` 排練，最終入口回到 `wp-prod-durable-edge`；之後在控制檔移出靜態根目錄的版本上完成 `prepare → stop-prepared`，並驗證候選靜態檔遭修改時 `activate` 會拒絕切流。排練容器、臨時映像 tag 與臨時靜態副本已清除。此流程仍有切換 `1090` 時的短暫本站連線中斷；正式 DB 與其他服務持續運作。下一次真實版本發布前，仍須以該版候選入口執行瀏覽器與安全驗證。

`safe-deploy.sh` 會：

1. 部署前備份（`scripts/backup-db.sh`）
2. 以 `docker stop -t 120` 安全關閉 Postgres，並**檢查關機日誌**：
   出現 `xlog flush request ... is not satisfied` 即中止部署
3. 交由 `deploy.sh` 執行實際部署
4. 部署後驗證：health probe、soft-404 五路由、正常頁面狀態碼

`deploy.sh` 的參數可直接透傳。若 backend 或 public readiness 失敗，腳本會以非零狀態中止，不會更新部署雜湊：

```bash
ALLOW_SERVICE_DOWNTIME=1 bash scripts/safe-deploy.sh force=1
```

常用參數：
- `force=1`：略過 commit hash 檢查，強制部署
- `ci=1`：部署前先跑 CI precheck
- `migrate_pg=1`：執行 SQLite -> PostgreSQL 一次性遷移

```bash
# 注意：production DB 不對外 publish port，migration 需透過 SSH tunnel 或 docker exec 執行
ALLOW_SERVICE_DOWNTIME=1 bash scripts/safe-deploy.sh migrate_pg=1 target_db='postgresql+psycopg://user:pass@127.0.0.1:5432/write_project'
```

回滾：

目前網站專用回滾請使用本節上方的 `scripts/relocate-prod-release.sh --rollback`；舊整組 `rollback.sh` 需要明確設定 `ALLOW_SERVICE_DOWNTIME=1`，並會影響 PostgreSQL 與其他服務。

### 資料庫備份

```bash
bash scripts/backup-db.sh
```

輸出至 `~/write_project_backups/`，保留 14 天。每次備份會：

- 驗證 gzip 完整性與資料表數（少於 10 張視為不完整並中止）
- **檢查索引健康度**：比對 `scripts` 表的 heap 與索引筆數，不一致時寫入
  `WARNING` —— 這正是 2026-08-17 事故最早可觀察到的訊號

排程（macOS launchd，每日 04:00）：

```bash
cp scripts/com.shawnup.write-project-backup.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.shawnup.write-project-backup.plist
```

### Cloudflare 快取清除

源站修復後，CDN 仍會依當初快取時的 `s-maxage` 繼續供應舊回應。

```bash
export CLOUDFLARE_API_TOKEN='...'   # 權限：Zone / Cache Purge / Purge
bash scripts/cf-purge.sh            # 預設清除事故受影響的頁面
bash scripts/cf-purge.sh --all      # 清除整個 zone
bash scripts/cf-purge.sh <url>...   # 清除指定網址
```

Token 只從環境變數讀取，不會出現在指令參數或任何輸出中。

### 公開站快取設定

- 首頁為動態渲染，`next.config.ts` 給它 `s-maxage=120, stale-while-revalidate=300`；
  Cloudflare 是否真的快取 HTML 取決於 zone 的 Cache Rule。若要讓首頁走邊緣快取，
  需在 Cloudflare 建立 Cache Rule（Eligible for cache、Edge TTL 選 *Use cache-control header if present*）。
  `cf-cache-status: DYNAMIC` 代表該請求沒有被快取。
- `/about`、`/help`、`/license`、`/privacy`、`/terms` 是公開資訊頁，頁面每小時重新驗證。
  若要讓這些 HTML 頁面也走邊緣快取，可在同一 Cache Rule 使用下列條件：
  `http.host eq "open-scripts.shawnup.com" and http.request.uri.path in {"/" "/about" "/help" "/license" "/privacy" "/terms"}`。
  設為 *Eligible for cache*，Edge TTL 選 *Use cache-control header if present*；保留預設 cache key，
  讓首頁篩選用的 query string 仍分開快取。不要把 `/read/*`、API 或登入後頁面放進此規則。
- 圖片 proxy `/api/public-media/*.webp` 帶 `s-maxage=2592000`（本站媒體）或 `s-maxage=86400`（外部封面）；
  因網址含 `.webp` 副檔名，Cloudflare 預設即會快取。`?w=` 只接受固定寬度，避免快取被任意參數打散。
- 縮圖由 `sharp` 在 Next 容器內產生；若解碼或載入失敗，proxy 才以 60 秒短快取退回原圖。`?w=` 來源會按實際串流位元組限制為 12 MiB，原圖串流限制為 25 MiB，不信任上游 `Content-Length`；超限的縮圖回 413，滿額或逾時回不快取的 503。
- 靜態頁（`/about` 等）的 sitemap `lastmod` 在 `lib/publicSeoModel.ts` 的 `STATIC_PAGES_LASTMOD`，
  修改這些頁面的內容時請一併更新。

## 7. 重要環境變數
- `VITE_API_URL`：前端 API 入口（預設 `/api`）
- `DATABASE_URL`：後端 DB 連線字串（正式主用 Postgres）
- `DB_AUTO_CREATE_TABLES`：啟動時是否建立缺表（程式預設 `1`，production Compose 預設 `0`；PostgreSQL 逐表提交）
- `DB_RUN_LEGACY_MIGRATIONS`：是否跑 legacy migration（預設 `1`）
- `PUBLIC_BASE_URL`：SEO/Sitemap 公開網址基底
- `FIREBASE_PROJECT_ID` / `FIREBASE_CREDENTIALS_JSON`：Firebase 驗證設定
- `REVALIDATE_SECRET`：**必填**。後端在台本更新時會呼叫 Next 的 `/api/revalidate`
  觸發即時重新產生頁面；未設定時該端點一律回 500，主動更新等同失效，公開頁只能
  等 ISR 逾時（1 小時）。兩個容器都需要，值必須相同。
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
- 公開頁改了台本卻沒更新：先確認 `REVALIDATE_SECRET` 已設定（見上），
  再檢查 CDN 是否仍供應舊快取（`cf-cache-status` 標頭），必要時執行 `scripts/cf-purge.sh`。
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
- `scripts/backup-db.sh` 每日備份時也會做同一項檢查並寫入 log。

Public（Next.js container internal port 3000）：

- `GET /api/health/live`：只檢查 Next.js process。
- `GET /api/health/ready`：連鎖檢查 Backend readiness；失敗回 `503`。
- `GET /api/health`：`ready` 的相容入口。

Nginx 對外入口：

- `GET /healthz`：只檢查 Nginx process。完整依賴狀態請看 readiness endpoints。

所有 health response 都使用 `Cache-Control: no-store`。Docker Compose 與部署腳本只接受 readiness 的 HTTP `200`，`4xx/5xx` 不視為健康。
