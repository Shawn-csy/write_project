# 正式環境精簡

本分支移除新版正式發布的 Next.js 常駐服務；尚未合併、尚未部署。2026-11-16 先前架構分支已透過 PR #46 合併，這份變更位於獨立的 `codex/simplify-production-runtime`。

## 執行邊界

- Cloudflare Pages：Next.js 建置的公開 HTML、SEO、sitemap 與瀏覽器程式。
- Nginx：loopback 入口、工作室靜態檔、既有流量與請求大小限制、API 代理；舊公開頁網址轉址 Pages。
- FastAPI：業務 API、公開資料與公開媒體。PostgreSQL 仍是正式資料來源。
- D1／R2：保留既有唯讀備援與獨立同步排程。
- Next.js 開發服務：仍可本機開發公開頁，但媒體轉交同一套 FastAPI，不再維護另一套影像代理實作。

新版不建立或啟動 `write_project-public` 映像／容器，也不向 Next server 發送正式內容 revalidation。內容更新由 Pages 快照流程處理；爬蟲的候選收集仍獨立，不因本次精簡啟用排程或自動刊登。

## 媒體與網址

`/api/public-media?token=...`、`/api/public-media/{token}` 與 `/api/public-media/external/{id}` 保留原本網址格式，改由 FastAPI 提供。保留 `.webp` 外觀副檔名、固定縮圖寬度、安全本機檔案解析、遠端公開 IP 驗證、DNS pinning、重新驗證轉址、回應與解碼大小上限、併發上限與有界縮圖快取。

外部作品封面只查詢已發布作品。錯誤與降級縮圖不使用長效成功快取。媒體 location 優先於一般靜態圖片 regex，避免帶 `.webp` 的 API URL 被錯誤當成工作室檔案。

工作室入口保留 `/login`、`/dashboard` 等深層路由。`/authors`、`/read/...` 等舊公開網址轉往 `https://open-scripts.shawnup.com`，保留路徑與 query。API 專用網域繼續只提供 API／媒體，不變成另一個工作室入口。

## 發布、回滾與維護

新發布使用 API-only 的版本紀錄；舊的 API＋Next 紀錄仍可解析。回滾時依目標版本恢復其所需容器，不會把舊版必需的 Next 容器提前刪除。保留目前版與直接回滾版，其餘清理遵循現有執行中資源保護。

CI 改驗證正式 Pages 匯出，不再把 standalone Next 建置當作正式發布門檻。仍實際建置「新增／修改／下架」與「公開目錄清空」兩種快照。候選入口檢查工作室、API、媒體、公開轉址、IPv4／IPv6 與流量限制；Pages 上線驗證仍獨立執行。

同步工具預設從正式 API 網域讀取資料與外部封面；preview 必須明確設定 API 來源。已安裝的舊同步排程仍可使用 loopback 媒體入口，升級時再更新 plist，不需為此次改造停止同步。

保留 PostgreSQL、Tunnel、Nginx、Pages 與 D1／R2。正式部署與排程設定不在本分支本機驗收時執行。

## 本機驗收

- 後端完整測試：490 項通過，包含公開媒體的路由、檔案邊界、DNS／轉址、SVG sandbox、大小與容量限制，以及慢速 HTTP 標頭和 chunk framing 的期限測試。
- 公開站：97 個測試檔、803 項測試通過；刪除舊路由後重建 Next 型別產物，TypeScript 檢查通過。
- 發布／快照測試：85 項中 84 項通過，Docker 整合測試預設跳過；另外明確啟動該隔離測試並通過。正式 CI 已加入這個 Docker 檢查。
- 實際 Pages 匯出：新增／修改／下架與完全空目錄兩種情境均通過；原始 API fixture 關閉後，建置只讀固定快照。
- 隔離 Nginx：驗證工作室深層網址、公開網址轉址保留 query、API 專用網域、媒體副檔名優先序、讀寫／連線限制；所有測試容器與獨立 network 已清理。

媒體目前接受 JPEG、PNG、WebP、GIF、AVIF 與 SVG。SVG 不做縮圖，使用 sandbox CSP 與 nosniff；其他格式或缺少遠端 MIME 回應 415。超大串流在回傳前拒絕為 413，與舊服務先回 200 再中斷串流不同。縮圖快取有容量上限，但不同請求同時未命中時仍可能重複編碼，受併發上限限制。
