# 正式公開站（Cloudflare Pages）部署與重新部署

狀態：2026-11-11 起，`open-scripts.shawnup.com` 由 Cloudflare Pages 提供靜態前端；資料與圖片優先讀本機服務（Tunnel），失聯時改讀 D1／R2 唯讀備援。
設計背景見 `pending/cloudflare-pages-tunnel-d1-r2-direction.md`；本文只記錄正式環境的現況與操作。

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

後台改內容、發布新作品**不需要**重新部署：瀏覽器載入後會向 API 重抓，新作品由 `404.html` 外殼載入（見設計文件）。

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
PUBLIC_SYNC_EXTERNAL_COVER_ORIGIN=http://127.0.0.1:1090 \
PUBLIC_SYNC_R2_PUBLIC_ORIGIN=https://media-open-scripts.shawnup.com \
node scripts/sync-public-cloudflare.mjs --production
```

- 外部封面（`/api/public-media/external/<id>`）是 Next.js 路由，API 專用網域不提供，所以另用 `PUBLIC_SYNC_EXTERNAL_COVER_ORIGIN=http://127.0.0.1:1090`（本機入口）；手動同步時也要加上這個變數，否則 31 張外部封面會被略過。
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

- 預設 block（`server_name _`）：供工作室與舊入口，部分公開讀取（`/api/public-bundle`、`public-personas`、`public-organizations`、`public-terms-config`、`public-media`）經 Next.js，**不帶 CORS 標頭**。
- `api-open-scripts.shawnup.com` block：`/api/` 與 `/media/` 一律交給 FastAPI，由它負責 CORS 允許清單（含 `https://open-scripts.shawnup.com`）。其餘路徑回 404。

- `/media/*.webp` 另有規則把 `Content-Type` 改成 `image/webp`：FastAPI 的靜態檔以 `application/octet-stream` 加 `nosniff` 回應 `.webp`，同網域沒事，但跨網域 `<img>` 會被瀏覽器（ORB）擋下。根本修法是後端補上 `.webp` 的 MIME 對照；在此之前請保留這條規則。若改動了 `/media/` 的標頭，要到 Cloudflare 對 `api-open-scripts.shawnup.com` 做「依主機名稱」清除快取（最長 4 小時的舊標頭會留在邊緣）。

修改 nginx 設定要走 `scripts/site-release.py` 的新 release（`prepare`、檢查、`activate`），詳見 `operations.md`。`site-release.py` 會把兩個 server block 的上游一併改寫；`$api_backend` 與 `$backend` 各只能出現一次。

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
- 自動重新部署（SEO）尚未設定，需手動執行上述步驟。
- 備援資料最多落後一次同步（約 15 分鐘），瀏覽次數、按讚、意見回饋在備援期間略過。
- `pages.dev` 網址沒有 `noindex`，canonical 指向正式網域；該網址上的跨網域 API 會被後端 CORS 擋下，不能用來驗證即時資料。
