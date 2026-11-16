# 正式公開站（Cloudflare Pages）部署與重新部署

狀態：2026-11-11 起，`open-scripts.shawnup.com` 由 Cloudflare Pages 提供靜態前端；資料與圖片優先讀本機服務（Tunnel），失聯時改讀 D1／R2 唯讀備援。
設計背景見 `pending/cloudflare-pages-tunnel-d1-r2-direction.md`；本文只記錄正式環境的現況與操作。

本精簡分支尚未部署：新版把公開媒體與 JSON 路由統一交給 FastAPI，正式環境不再啟動 Next server。舊版仍可透過發布紀錄回滾；[精簡與驗收說明](production-runtime-simplification.md)。

## 資源與網域

| 用途 | 名稱 | 網域／位置 |
|---|---|---|
| 靜態前端 | Pages 專案 `write-project-public-site`（Production 分支 `main`） | `open-scripts.shawnup.com` |
| 主 API | 本機 nginx（`1090`）的 API 專用 server block → FastAPI | `api-open-scripts.shawnup.com`（Tunnel） |
| 工作室 | 本機 nginx（`1090`） | `studio-open-scripts.shawnup.com`（Tunnel） |
| 備援 API | Worker `write-project-public-fallback-prod`，綁 D1 | `fallback-open-scripts.shawnup.com` |
| 備援資料 | D1 `write-project-public`（id `fb59740e-2c40-4a3b-9dc6-12f5e21abe8d`） | — |
| 備援媒體 | R2 bucket `write-project-public-media` | `media-open-scripts.shawnup.com` |
| 同步 | launchd `com.shawnup.write-project-public-sync-prod`，每 15 分鐘 | 讀 `api-open-scripts` 寫 D1／R2 |

Tunnel 是與其他網站共用的 `91d6eb76-bd34-4655-94b3-a30b62f7eb89`（遠端設定）。新增主機名稱前會先備份設定到 `/Users/shanti/write_project_backups/prod-tunnel-config-<日期>.json`。

## 什麼時候要重新部署 Pages

後台改內容後，瀏覽器會向 API 重抓；搜尋引擎、分享 metadata 與新路徑的 HTTP 200 仍需要重新建置 Pages。本分支已加入[內容自動更新流程](#published-content-refresh)，首次正常發布包含該流程的程式並完成啟用後，會定期偵測變更並更新。這次實作尚未部署。

要重新部署的情況：

- 前端程式碼有變更（`apps/public`、`packages/`）。
- 要讓搜尋引擎與分享預覽看到新內容：`<title>`、描述、分享卡片、sitemap、JSON-LD 都是建置時寫入，新作品、新作者、新標籤要等重新部署才有 metadata，也才會被收錄。
- 環境網址變更（API、備援、媒體、工作室網域是編進靜態檔的，在 Pages 設定環境變數不會改寫已上傳的檔案）。

## 重新部署步驟

建置會向 `BACKEND_API_URL` 讀取公開資料，請在確認 `api-open-scripts.shawnup.com/healthz` 回 200 後執行。

```bash
cd apps/public
BACKEND_API_URL=https://api-open-scripts.shawnup.com \
NEXT_PUBLIC_DEPLOY_ENV=production \
NEXT_PUBLIC_API_ORIGIN=https://api-open-scripts.shawnup.com \
NEXT_PUBLIC_FALLBACK_API_ORIGIN=https://fallback-open-scripts.shawnup.com \
NEXT_PUBLIC_MEDIA_ORIGIN=https://api-open-scripts.shawnup.com \
NEXT_PUBLIC_MEDIA_FALLBACK_ORIGIN=https://media-open-scripts.shawnup.com \
NEXT_PUBLIC_STUDIO_ORIGIN=https://studio-open-scripts.shawnup.com \
NEXT_PUBLIC_BASE_URL=https://open-scripts.shawnup.com \
npm run build:pages
```

建置會拒絕下列錯配：production 使用 Dev 的 API／Studio／canonical 網域，或缺少備援與媒體備援網域。

在上傳前先在本機檢查輸出：

```bash
# 輸出沒有殘留 Dev 網域，環境標記為 production
grep -rl "dev-open-scripts" out | head
grep -o 'data-deploy-environment="[a-z]*"' out/index.html | head -1
test -f out/404.html && echo "404.html ok"
```

部署（專案已存在，不需要 `--force`）：

```bash
npx wrangler pages deploy out --project-name write-project-public-site --branch main
```

部署後驗證：

```bash
for p in / /authors /audio-works /demos /resources /about /sitemap.xml; do
  printf "%-16s" $p; curl -s -o /dev/null -w "%{http_code}\n" https://open-scripts.shawnup.com$p
done
curl -s -o /dev/null -w "不存在的作品（應為 404 外殼）%{http_code}\n" https://open-scripts.shawnup.com/read/zzz-nonexistent
```

## 回滾

Pages 保留每次部署。到 Cloudflare 後台的 `write-project-public-site` → 部署，對先前的成功部署選「回滾」即可。回滾只影響靜態檔，不動 API、D1 或 R2。

## 備援資料與媒體的同步

launchd 工作每 15 分鐘執行 `scripts/sync-public-cloudflare.mjs --production --scheduled`；資料沒變時略過寫入。日誌在 `~/Library/Logs/write-project-public-sync-prod/`。

手動同步：

```bash
PUBLIC_SYNC_API_ORIGIN=https://api-open-scripts.shawnup.com \
PUBLIC_SYNC_MEDIA_ORIGIN=https://api-open-scripts.shawnup.com \
PUBLIC_SYNC_EXTERNAL_COVER_ORIGIN=https://api-open-scripts.shawnup.com \
PUBLIC_SYNC_R2_PUBLIC_ORIGIN=https://media-open-scripts.shawnup.com \
node scripts/sync-public-cloudflare.mjs --production
```

- 外部封面（`/api/public-media/external/<id>`）由 FastAPI 提供，可與資料使用相同 API 網域。既有排程若仍指定本機 `127.0.0.1:1090`，也會經 Nginx 轉交 FastAPI；不依賴 Next server。
- 同步讀的是 `api-open-scripts`，不是本機 `127.0.0.1:1090`：後者的主站 server block 對 `/api/public-*` 有動態讀取限流，完整同步會收到 429。
- 封面檔名來自作品標題，可能含空格、逗號、括號；同步對「整個欄位就是媒體網址」的值整串處理，不能只靠空白斷詞。
- 修改備援 Worker（`apps/public/worker/`）後重新部署：`npm run deploy:api-fallback -w apps/public`。D1 的 schema 定義在 `worker/schema.sql`，新資料庫要先套用再同步。

停用或重裝排程：

```bash
launchctl bootout gui/$(id -u)/com.shawnup.write-project-public-sync-prod
cp scripts/com.shawnup.write-project-public-sync-prod.plist ~/Library/LaunchAgents/
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.shawnup.write-project-public-sync-prod.plist
```

## 主 API 的 nginx 注意事項

`deploy/nginx/default.conf` 有兩個 server block：

- 預設 block（`server_name _`）：供工作室與舊入口，公開 API／媒體直接交給 FastAPI，工作室由 Nginx 提供靜態檔；舊公開頁路徑轉址 Pages。
- `api-open-scripts.shawnup.com` block：`/api/` 與 `/media/` 一律交給 FastAPI，由它負責 CORS 允許清單（含 `https://open-scripts.shawnup.com`）。其餘路徑回 404。

- `/media/*.webp` 另有規則把 `Content-Type` 改成 `image/webp`：FastAPI 的靜態檔以 `application/octet-stream` 加 `nosniff` 回應 `.webp`，同網域沒事，但跨網域 `<img>` 會被瀏覽器（ORB）擋下。後端已在 `v0-7-4-r8` 補上 `.webp` 的 MIME 對照（`services/media_types.py`），這條 nginx 規則現在只是第二道保險，可以保留。若改動了 `/media/` 的標頭，要到 Cloudflare 對 `api-open-scripts.shawnup.com` 做「依主機名稱」清除快取（最長 4 小時的舊標頭會留在邊緣）。

修改 nginx 設定要走 `scripts/site-release.py` 的新 release（`prepare`、檢查、`activate`），詳見 `operations.md`。`site-release.py` 會把兩個 server block 的上游一併改寫；新版只有 API 上游，舊版紀錄仍支援 API／Next 雙上游供回滾。

## 驗證備援切換

不必停掉正式後端。在已開啟的正式站頁面用瀏覽器主控台模擬主 API 失效 60 秒，重新載入後應只看到對 `fallback-open-scripts.shawnup.com` 的請求：

```js
sessionStorage.setItem('public-api:primary-down-until', String(Date.now() + 60000)); location.reload();
```

測完清除：

```js
sessionStorage.removeItem('public-api:primary-down-until');
```

## 切換紀錄與回復

- 2026-11-11 將 `open-scripts.shawnup.com` 的 CNAME 從 Tunnel（`91d6eb76-bd34-4655-94b3-a30b62f7eb89.cfargotunnel.com`，Proxy）改為 `write-project-public-site.pages.dev`（Proxy）。切換後約 1 分鐘內為 522，等 Pages 驗證網域完成後轉為 200。
- 緊急回復到本機提供：把該 CNAME 改回上面的 Tunnel 網域。此時工作室路徑（`/dashboard` 等）也會恢復在原網域。
- 工作室入口改為 `https://studio-open-scripts.shawnup.com/dashboard`；Firebase Authentication 的授權網域須包含 `studio-open-scripts.shawnup.com`，否則工作室 Google 登入會失敗。

## 已知限制

- 新發布的作品／作者／標籤首次載入是 404 狀態外殼，沒有 metadata，直到下次重新部署。
- 內容自動更新程式與排程已實作；尚未部署驗證。啟用前仍使用人工重新部署，啟用後也需等待排程與建置完成。
- 正常情況備援同步間隔約 15 分鐘；同步失敗會落後更久。瀏覽次數、按讚、意見回饋在備援期間略過。
- `pages.dev` 網址沒有 `noindex`，canonical 指向正式網域；該網址上的跨網域 API 會被後端 CORS 擋下，不能用來驗證即時資料。

### Published-content refresh

內容更新流程位於 `.github/workflows/content-refresh.yml`，設定每小時第 7、22、37、52 分鐘執行，也可在 Actions 手動執行 **Refresh published content**。GitHub 可能延後排程，另需加上排隊、建置和上傳時間；這不是立即發布的時效保證。緊急下架可手動觸發，不必等待下一次排程。

**啟用前提**：先合併並正常發布一個包含 `scripts/content-refresh.py` 的完整版本，留下 `complete` 發布紀錄。排程設定合併到預設分支後才會由 GitHub 啟用；未具備完整版本紀錄時會停止並顯示初始化說明。本次只完成程式與本機驗收，未部署、未安裝本機排程。

流程先從 main checkout 唯讀解析目前入口與發布紀錄中的完整 commit SHA，再 checkout 該 SHA 執行。較新的 main 即使已有其他尚未發布的程式或文件，也不會混入內容發布。缺少舊版本紀錄、commit 不符或工作目錄不乾淨時會停止。

在對應正式 commit 的乾淨 checkout 中，可使用：

```sh
# WP_RELEASE_ROOT 必須與正式發布使用同一個持久目錄
python3 scripts/content-refresh.py resolve-source
python3 scripts/content-refresh.py status
python3 scripts/content-refresh.py run
```

內容流程只讀取公開 API，更新 Pages；不啟動 API 映像、不遷移資料庫、不執行身份收斂或舊版本清理。D1／R2 仍由既有同步排程獨立更新，失敗不會直接阻擋 Pages 的內容更新。

#### 資料與建置

- 擷取完整公開台本正文、列表、身份、主題與 bundle，檢查必要欄位、ID 集合及共同內容欄位，避免把缺漏或明顯不同版本的資料當成完整快照。
- Next 建置只讀固定的 loopback 快照；要求未擷取的 API 會使發布失敗，不會回退到線上 API。瀏覽器的 API、媒體與 canonical 仍使用正式網址。
- 內容指紋排除按讚、瀏覽數及瀏覽數衍生的熱門標籤；正文、作者、授權、主題、分類、目錄及有意義的排列變更會觸發建置。
- 上傳前再讀一次內容。指紋不同就丟棄這次產物，留待下次排程；不把建置途中出現的新版本誤記為已發布。這仍是多次公開讀取，不是資料庫交易快照。
- 每次使用全新輸出目錄，檢查作品 HTML、metadata、sitemap 與目錄一致。當某類動態路由確定沒有資料，只移除建置暫存副本中的 `page.tsx`，保留 404 外殼需要的共用元件；最後一篇下架及公開目錄完全清空也能匯出。

#### 狀態、重試與互斥

`$WP_RELEASE_ROOT/.content-refresh/state.json` 位於靜態檔根目錄之外，保存待更新指紋、正式 commit、階段、時間、公開版本標記與失敗步驟，不保存正文或秘密。

- 首次執行建立基準；已完成且內容未變時，仍會核對公開的 `/content-version.json`，一致才略過重建。
- 建置或上傳失敗保留待處理狀態，下次以相同內容重試。
- 上傳成功而驗證失敗，若公開版本標記仍一致，只重試驗證；確定標記已被其他部署替換或移除時重新建置。網路錯誤不當成標記不存在。
- 驗證包含公開版本標記、HTML 環境標記、抽樣作品標題與 canonical、以及 sitemap 作品 ID 集合；通過後才記錄完成。上傳成功但紀錄尚未落盤的中斷窗口可能造成安全的重傳。
- 依序取得 release-workflow、site-release、Pages 鎖。程式發布與內容更新共用 Actions concurrency；一般／人工 `release.sh pages` 也使用 Pages 鎖及固定快照建置。低階 `pages-build`／`pages-upload` 是內部子步驟，人工操作請走 `pages` 或完整發布入口。

若要讓 Pages 人工回滾持續保留，先暫停 **Refresh published content** workflow；否則下次執行會發現標記不同並恢復目前公開內容。暫停／恢復是營運操作，本次未執行。
