# Dev 預覽站停用紀錄（2026-11-11）

Dev 預覽站已暫停，正式站 `open-scripts.shawnup.com` 不受影響。此次只停服務與公開入口，沒有刪除 Dev PostgreSQL、媒體卷、D1 或 R2 資料。

- Cloudflare Pages 專案 `write-project-public-site-preview` 的 `main` 部署改為全路徑回應 503、`no-store` 與 `noindex`。停用部署 ID 為 `4728f7f8-4920-43d7-92e1-d96d09a438a4`；原部署 ID 為 `79c12220-fff0-4c8c-b6c6-8d08249e91ac`。自訂網域與專案 `pages.dev` 主網址皆回應 503。其餘 201 個歷史部署已刪除，舊版部署網址不再提供內容。
- `write-project-public-fallback` 與 `write-project-public-preview` 兩個 Worker 的 `workers.dev` 和版本預覽網址已停用；D1 資料保留。Wrangler 設定同步改為 `workers_dev: false`、`preview_urls: false`。
- R2 bucket `write-project-public-preview-media` 的 `r2.dev` 公開入口已停用；物件保留。
- `write-project-dev-api-8891`、`write-project-dev-studio-8890` 兩個 Compose 專案已停止，容器與資料卷保留。獨立 Cloudflare Tunnel、每 15 分鐘的公開資料同步、Dev 音聲發現三項 launchd 工作已 `bootout` 並 `disable`。
- 本機備份目錄 `/Users/shanti/write_project_backups` 保存原 Pages 建置檔 `dev-pages-out-20261111.tar.gz`、完整的 202 筆部署紀錄 `dev-pages-deployments-all-20261111.json`、刪除進度 `dev-pages-deletion-progress-20261111.json`、入口原狀 `dev-workers-routes-20261111.json` 及 `dev-preview-pause-20261111.json`。部署紀錄只是中繼資料，無法用它恢復已刪除的 Cloudflare 部署。

恢復時先重新啟動兩個 Dev Compose 專案，再用 `launchctl enable` 與 `bootstrap` 恢復專用 Tunnel 和同步。Cloudflare Pages 須從封存的 `out` 或原始碼重新部署；已刪除的舊部署不能回滾。Worker 與 R2 公開入口須另外恢復。恢復前先核對 Dev API、資料庫、媒體與 Pages 的目的地設定，避免把 Dev 流量指向正式資料庫。
