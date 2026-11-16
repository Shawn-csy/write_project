# Public App（Open Scripts）

`apps/public` 使用 Next.js App Router 編寫公開首頁、台本閱讀頁、作者／社團頁及 SEO metadata。正式站將 Next 產物靜態匯出至 Cloudflare Pages；瀏覽器讀取 FastAPI live API，主服務不可用時以 Worker/D1 JSON 與 R2 媒體提供唯讀 fallback。正式環境沒有常駐 Next server、ISR 或 Next image optimizer。

完整拓樸與更新時序見[正式環境架構](../../docs/architecture/production-architecture.md)；發布見[持續部署](../../docs/engineering/continuous-deployment.md)，靜態頁操作見[Pages production](../../docs/engineering/public-pages-production.md)。Studio 是 repository 根目錄的 Vite app。

## 本機開發

在 repository 根目錄安裝 workspace dependencies，執行：

```bash
npm ci
npm run dev -w apps/public
```

預設開啟 `http://localhost:3000`。`BACKEND_API_URL` 未設定時使用 `http://localhost:1091`；其他 API／媒體來源依環境設定。Next server-mode 的 route handlers、rewrites 與快取設定支援本機開發，不能用其驗收結果代替 Pages 靜態產物驗收。

## 建置與資料邊界

```bash
# Pages 預覽建置（不會發布）
npm run build:pages-preview -w apps/public

# 正式 Pages 建置（不會單獨完成正式發布）
npm run build:pages -w apps/public
```

使用 `scripts/build-public-pages.mjs` 的建置流程產生 `apps/public/out`，包含 HTML、SEO／sitemap 快照及 Pages 路由與標頭設定。`npm run build -w apps/public`／`npm run start -w apps/public` 是保留的 Next server-mode 建置／啟動命令，不是正式部署方式。

首頁及實體頁初始內容是建置快照；hydration 後由 browser API adapters 讀取公開資料。寫入、Firebase 認證與 PostgreSQL 由主 API 負責，fallback 不接收寫入。API／媒體 URL 必須是瀏覽器可達的公開來源，不能把 Docker 內部位址帶到產物。

程式發布與內容刷新是兩條流程：正常發布在 CI 通過後由 Mac self-hosted runner 發布 API／Studio 並驗證 Pages；內容刷新排程在每小時 `7,22,37,52` 分，以已部署 SHA 重建快照，可能延遲或因資料變動延後建置，不是 webhook 或即時逐項發布。

共享元件與產品模型邊界見[Frontend boundaries](../../docs/architecture/frontend-boundaries.md)、[Public homepage architecture](../../docs/architecture/public-homepage-architecture.md)及[Media presentation](../../docs/architecture/public-media-presentation-architecture.md)。

## 文件維護

只修改此 README 或其他 Markdown 時，PR 與 main push 由 `Documentation checks` 驗證，不會觸發程式部署；若程式部署尚在進行，較新的純 Markdown 提交不會取代該次 CI 核准的程式 SHA；入口切換前仍會重新確認其後沒有程式或設定變更。既有內容刷新排程仍使用已部署版本。提交前在 repository 根目錄執行 `python3 scripts/check-docs.py`，檢查本機連結、圖片目標及程式碼區塊是否閉合。CI 與部署條件見[持續部署](../../docs/engineering/continuous-deployment.md)。
