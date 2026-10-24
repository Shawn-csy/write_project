# Changelog

All notable product-facing changes are documented here.

For the commit-level inventory between `v0.5.0` and `v0.6.0`, see `docs/archive/release-version-map-after-v0.5.0.md`.
The early `v0.1.0`–`v0.4.9` releases are summarized in the historical overview below.

## [Unreleased]

### SEO

- `robots.txt` 對一般爬蟲開放 `/api/public-media/`（卡片與主視覺圖片），並移除對已回 410 的 `/gallery` 的
  Disallow，讓搜尋引擎能看到 410 並移除舊索引。
- Sitemap 的 `lastmod` 改用真實內容日期（首頁取最新作品、靜態頁用固定日期），不再每次請求都變；
  移除搜尋引擎會忽略的 `changefreq`／`priority`；上游資料改走 Next data cache。
- 台本閱讀頁的伺服器端 HTML 加入完整簡介、大綱與目錄；JSON-LD 補上 `abstract`、`datePublished`、
  `mainEntityOfPage` 與作者頁網址；成人向作品輸出 `rating` meta 與 `isFamilyFriendly: false`。
- 外部台本連結加上 `rel="nofollow"`；首頁移除已被 Google 取消的 SearchAction，改附 publisher。

### 效能

- 首頁資料先在伺服器端瘦身（移除 marker theme、活動欄位與外部作品的重複文字），HTML 約減半；
  首屏只 SSR 前 24 張卡片，其餘於 hydration 後補上。
- 首頁、`/sitemap.xml`、`/llms.txt` 加上可被 CDN 快取的 `Cache-Control`（首頁 `s-maxage=120`）。
- 圖片 proxy 路徑加上 `.webp` 副檔名讓 Cloudflare 預設即可快取，支援 `?w=` 縮圖
  （240／360／480／720／960，使用 sharp），並加長快取時間；卡片圖改用 `srcset`。
- 外部封面查詢不再每張圖重抓整份 public bundle。

### 安全（公開媒體 proxy）

- 修正路徑穿越：先前 `%2e%2e` 可繞過 `..` 檢查，讓 proxy 代抓後端 `/media/` 以外的路徑；
  現在改驗證解析後的路徑與來源，並拒絕反斜線、控制字元與 `//`。
- 外部圖片來源除了字面 IP，也會解析 DNS 並拒絕私有網段；重新導向逐跳驗證（最多 3 次）。
- 上游請求加上逾時；宣告大小或實際串流超過 25 MB 的圖片會被拒絕或截斷；非圖片內容回 415。
- 縮圖只對已宣告大小（≤ 12 MB）的 JPEG/PNG/WebP 進行，並限制輸入像素數與同時處理數（3）；
  超出時改回原圖並只快取 60 秒，避免原圖被 CDN 長期綁在縮圖網址上。
- 回應加上 `X-Content-Type-Options: nosniff` 與沙箱化 CSP；錯誤回應不快取。
- `/api/revalidate` 同時讓 `public-bundle`／`public-scripts` 資料快取標記為過期，首頁與 sitemap 不再等 5～10 分鐘。
- 作品頁目錄（來自受同意閘門保護的正文）不再輸出給成人向作品。
- `/og/homepage.png` 由 808 KB 壓縮為 146 KB（尺寸不變）。
- `apps/public` 明確宣告 `sharp` 相依。


## [0.7.1] - 2026-10-20

本版加入外部公開台本匯入能力，並整理公開站的搜尋、推薦與清單操作介面。

### 外部公開台本

- 新增外部公開台本管理區，可從公開網址取得標題、摘要、封面、作者、作者介紹、組織與原始發表時間。
- 外部作品只在本站保存展示所需的 metadata 與封面／頭像快取，完整內容仍由原始網站提供。
- 支援手動覆寫標題、摘要、封面、作者／組織連結、分類、發布狀態與排序；可重新抓取外部 metadata。
- 外部作品的原始連結以新分頁開啟，作者與組織可連到本站的外部實體頁。

### 本機 MCP

- 新增本機 `stdio` MCP，提供 `preview_external_public_script`、
  `add_external_public_script` 與 `list_external_public_scripts`。
- 匯入流程預設先預覽，只有明確以 `confirm=true` 呼叫才會寫入公開台本資料。
- MCP 使用限定於外部台本 admin API 的 `X-MCP-Key`，不開放劇本本文、刪除資料或其他管理操作。

### 公開站與媒體

- 新增外部作者頁與外部組織頁，補上外部作者／組織頭像、封面與作品導覽。
- 新增外部封面與社群頭像的公開媒體代理與本地化快取，避免公開頁直接依賴外部圖片來源。
- 公開台本 gallery 新增隨機推薦、可點擊標籤、搜尋／進階篩選整合與清單快速搜尋。
- 清單檢視中的作者名稱可連到作者頁，外部作品日期與作者 metadata 也會一致呈現。

## [0.7.0] - 2026-08-21

本版以 2026-08-17 的資料庫損壞事故為起點，涵蓋事故修復、根因處理、
一輪資安檢視，以及相依套件升級。

### 資安

- **修正權限提升漏洞**：`PUT /api/me` 先前接受客戶端提供的 `email`，
  並以 `setattr` 直接寫入 `users.email`；而管理權限判定會拿該欄位比對
  `ADMIN_USER_EMAILS`。任何已登入使用者皆可藉此取得管理權限。
  現一律拒絕客戶端提供的 `email` 與 `isAdmin`。
  已檢查現有帳號，無遭利用跡象。
- `users.email` 改由後端從**已驗證的 Firebase token** 取得，並要求
  `email_verified` 為真。未驗證的 email 不可信 —— 攻擊者能以任意 email 註冊帳號。
- 格式錯誤／過期／已撤銷的 token 由 **500 改回 401**。先前 `verify_id_token`
  的例外未被捕捉。這不是繞過（請求仍被拒），但會讓外部監測看到大量假的
  伺服器錯誤而掩蓋真正的故障。憑證抓取失敗另回 503 以資區別。
- 憑證檔權限由 644 收緊為 600（`.env`、`server/secrets/firebase-service-account.json`）。
- `.env` 移除重複的 `DATABASE_URL` 定義。

### 事故修復與防護

- **Postgres `stop_grace_period` 設為 120s**。原本沿用 Docker 預設的 10s，
  關機 checkpoint 來不及完成就被 SIGKILL，WAL 遺失造成 `scripts` 表索引與
  heap 不同步（15 筆列從索引消失、主鍵出現重複值），4 篇公開台本損毀。
- **開發環境改用獨立的 Postgres 資料目錄** `server/data/postgres-dev`（對外埠 15432）。
  先前兩份 compose 共用 `server/data/postgres`，在跑著正式站的機器上執行 dev 的
  `docker compose down` 等同對正式資料庫強制關機 —— 這是事故最可能的觸發原因。
- 新增 **`GET /api/health/integrity`**：比對 `scripts` 表的 heap 與索引筆數並
  檢查主鍵重複，不一致時回 503，供外部 status 監測輪詢。
  刻意與 `/ready` 分開 —— 索引損壞無法靠重啟修復，若影響容器 healthcheck
  只會造成重啟迴圈。結果以 60 秒 TTL 快取。
- 新增 `scripts/backup-db.sh` 每日備份（gzip 完整性驗證、資料表數檢查、
  索引健康度監測、14 天輪替）與 `scripts/com.shawnup.write-project-backup.plist` 排程。
- 新增 `scripts/safe-deploy.sh`：部署前備份、以足夠寬限期安全關閉 Postgres
  並驗證關機日誌無 WAL 遺失，才交給 `deploy.sh`。
- 新增 `scripts/cf-purge.sh`：Cloudflare 快取清除，Token 只從環境變數讀取。
- 正式站四個服務加上記憶體上限（postgres 512m / backend 768m / public 512m /
  frontend 128m）。先前完全無上限，任一服務失控會拖垮整台主機。

### 相依套件

- 升級 `next` 16.2.7 → 16.3.1、`react-router-dom` 7.18.1 → 7.18.2，並套用
  `npm audit fix`。生產相依漏洞由 **0 critical / 7 high / 3 moderate**
  降為 **0 / 0 / 2**，剩餘兩項為 `docs/engineering/dependency-audit.md`
  已記錄的可接受風險。其中 `sharp`（libvips CVE）是唯一有實際暴露面的一條 ——
  `next/image` 會處理使用者上傳的封面圖。
- **統一 React 版本為 19.2.4**。先前 root（Vite 工作區 SPA）宣告 React 18、
  `apps/public`（Next 16）宣告 React 19，npm 因而巢狀安裝兩份。next 16.3.1 起
  `next` 改為巢狀安裝，其 CJS client 元件內部以 `require("react")` 解析而繞過
  Vite 的 alias/dedupe，導致測試中 next/link 取得 React 19、renderer 卻是
  React 18。升級前能通過只是安裝佈局的巧合。統一後不再有巢狀副本。
- **移除 `react-helmet-async`**，改用 `src/lib/useHeadTags.ts`。該套件 peer
  僅到 `^18.0.0`，是統一 React 版本的唯一阻擋。新實作命令式套用 title 與
  head 標籤、卸載時還原，輸出與原本完全一致。
- `scripts/ci.sh` 加入 `npm audit --omit=dev`（**high 以上讓 CI 失敗**）
  與 `npm run typecheck`。原本仰賴的「每季人工 audit」已逾期近兩個月。

### 路由與索引品質

- **移除所有 `loading.tsx`**（根目錄與 `read` / `author` / `org` / `series` / `tag`
  動態路由）。這些 Suspense 邊界會讓 Next 在頁面解析完成前就送出 HTTP 200，
  導致 `notFound()` 無法改寫狀態碼，所有「路由正確但實體不存在」的網址都變成
  soft-404。移除後五個路由全部回真 404，正常頁面維持 200。
  代價是失去載入骨架；ISR 快取過的頁面本來就不會顯示骨架。
  `scripts/verify-public-seo.mjs` 新增對應迴歸檢查。

### 快取與內容更新

- 收斂 ISR 快取視窗：`next.config.ts` 設定 `expireTime: 7200`，台本頁
  `revalidate` 由 86400 改為 3600。原本送出的是
  `s-maxage=86400, stale-while-revalidate=31449600`，等同允許 CDN 供應舊版本
  近一年 —— 事故期間三篇台本頁的 404 就是這樣被 CDN 鎖住，源站修好後訪客
  仍持續看到錯誤頁。現為 `s-maxage=3600, stale-while-revalidate=3600`。
- 補上部署環境的 `REVALIDATE_SECRET`。後端在台本更新時本來就會呼叫 Next 的
  `/api/revalidate`，但該變數從未設定，呼叫一律被擋在 500，主動更新等同失效。

### 修正

- **handle 唯一性判斷**。先前以字串比對 `"UNIQUE constraint failed"` 辨識衝突，
  那是 SQLite 的錯誤訊息；正式站的 Postgres 回的是
  `duplicate key value violates unique constraint`，因此衝突一律落到 500 而非 409。
  改為明確的可用性檢查加上 `IntegrityError` 後備防線。
  同時，handle 一旦設定就不可變更的規則原本是靜默忽略並回 200（使用者以為
  修改成功），現在會明確回 409。
- 移除 `server/database.py` 中未加 dialect 保護的 SQLite PRAGMA 監聽器
  （隨 main 發佈線併入時一併處理）。正式環境已改用 Postgres，該段會使每條
  連線都拋 `syntax error at or near "PRAGMA"`。
- `scripts/verify-public-seo.mjs` 兩個永遠不會通過的檢查：舊網域比對誤把
  `open-scripts.shawnup.com` 當成 `scripts.shawnup.com`（子字串）；
  canonical 比對未考慮 Next 會正規化掉根路徑的尾斜線。
- 修正 5 個既有的測試型別問題（vitest 4.1 型別收斂後才暴露）：`TocEntry`
  fixture 欄位過時、`pickRenderedRoot` mock 未宣告可為 null、
  `fetchMock.mock.calls` 解構過窄、`coverDesign` fixture 形狀不符、
  `renderHook` 的 `as const` 過度窄化。

### 升級注意

- `docker-compose.yml`（開發）現在使用 `server/data/postgres-dev` 與埠 `15432`。
  首次啟動會建立空的資料庫，與正式資料完全分離。
- 部署請改用 `scripts/safe-deploy.sh`，而非直接執行 `scripts/deploy.sh` ——
  後者的 `docker compose down` 會使用容器建立當下的 `stop_grace_period`。
- 需在 `.env` 設定 `REVALIDATE_SECRET`，否則 on-demand revalidation 無法運作。

## [0.6.1] - 2026-07-29

### SEO 與社群預覽

- 首頁 Open Graph 圖改用正式網站 Hero 畫面，修正原圖片中文字缺字方框。
- 音聲台本探索詞彙由「聲劇台本」調整為「廣播劇劇本」，同步網站 metadata 與 `llms.txt`。

### 路由與索引品質

- 建立 Nginx、Vite 工作區與後端共用的路由所有權契約。
- 僅允許正式工作區路由取得 SPA shell；未知路徑一律回傳真正的 `404`，避免 soft-404、錯誤 canonical 與 `noindex` 噪音。
- 退役 `/gallery` 在入口與後端層皆維持 `410 Gone`。
- 新增路由契約測試與正式環境 SEO 驗證項目。

## [0.6.0] - release candidate

Status: draft for release candidate
Base: `v0.5.0`
Reviewed through: `d7341e44 Improve audio script SEO discovery`

## Overview

v0.6.0 是 v0.5.0 之後的第一個 minor release，將公開站從 Vite SPA 重建為 Next.js SSR/SEO-first 前台，並同步重構台本閱讀器、公開頁設計系統、系列功能、媒體裁切、PDF 匯出、SEO/AI discovery、行動版 UX、資安與部署邊界。

這版的產品定位也從「免費台本／劇本線上閱讀」擴展為「免費台本、音聲台本、配音台本與 ASMR 台本的公開閱讀與發布平台」。Google 搜尋與 AI assistant 可透過 SSR 頁面、JSON-LD、sitemap、robots、`llms.txt` 與 `/.well-known/api-catalog` 正確發現公開作品與 raw content endpoint。

---

## 重大變更

### Vite 公開頁正式退役

- `/gallery` 回傳 410，不再重導向。
- 所有公開頁（`/read/`、`/author/`、`/org/`、`/series/`、`/tag/`）由 Next.js SSR 擁有。
- Vite `index.html` 不再處理任何公開頁路由。

### Legacy metadata runtime 移除

- `customMetadata` runtime reads 已移除。
- User-to-Persona fallback 已移除。
- 公開頁所有 metadata 來自 canonical backend fields。

### 公開資料來源收斂

- 作者頁、組織頁、系列頁與標籤頁改用 canonical public API/entity model。
- Profile tags 與 work tags 分離，作者／組織身份標籤不再誤連到作品標籤。
- 公開作品卡片統一走 shared card frame，避免首頁、作者頁、組織頁、標籤頁顯示邏輯漂移。

---

## 新功能

### 公開前端（Next.js SSR）

- SSR 公開頁：`/read/[id]`、`/author/[id]`、`/org/[id]`、`/series/[name]`、`/tag/[name]`、首頁 gallery。
- ISR + on-demand revalidation（`/api/revalidate`）。
- Shared `@write/script-engine` package 統一解析與渲染。
- Marker-based reader presentation。
- Public reader PDF export pipeline。
- 首頁移除 CSR bailout，初始作品卡片可由 Next SSR 輸出，提升 crawler 可見性。
- `ScriptGalleryCardFrame` 成為 server-safe card DOM 單一來源，client wrapper 僅負責互動。

### 系列功能

- Public series 聚合頁（章節列表、閱讀進度）。
- Canonical series chapter navigation。
- Publisher series editor：建立、drag reorder、panel 分解、unsaved draft 保護。

### Editorial 設計語言

- Gallery 全新 editorial 視覺設計（動態效果、sliding tab indicator）。
- 閱讀頁 editorial 設計延伸。
- Hero reveal 動畫、Anime.js lazy loading + idle prewarm。
- Public motion system（`prefers-reduced-motion` guard、coarse pointer guard）。

### 行動版 Shell

- 行動版 navigation 全面重設計（inline tabs、無 hamburger overlay）。
- `MobileActionSheet`：role=dialog、Esc、focus trap、body scroll lock。
- 行動版從公開頁進入工作室入口（`<a href="/dashboard">`）。
- 所有 overlay 不推 layout（portal-based）。

### Hero Art Direction

- Hero banner placement editor（transform model、超寬預覽 QA）。
- Hero art direction pipeline：focal-point、crop zoom、injected images。
- Lane URL param + unified hero pipeline。

### 媒體系統

- Public media presentation presets。
- Dashboard image focal-point 非破壞性調整。
- `next/image` `/media/` 路徑絕對 URL 解析。
- Public image 未知 host fallback：`<img referrerpolicy="no-referrer">`，不走 Next optimizer proxy。

### 外觀偏好

- Public shell appearance preferences（字級、版面）。
- Homepage appearance scale model（text scale tokens）。
- Shared appearance preferences 跨 gallery 與 reader。
- Reader toolbar title slot。
- Reader display preferences 抽成 shared nested model，並建立 renderer capability matrix。
- `V2` 命名逐步改為 presentation renderer API。
- 行底線輔助依實際 presentation mode 與 mobile auto-linear mode gating。

### 公開資訊頁與 Footer

- `PublicInfoPageShell` 統一 about/help/license/privacy/terms layout。
- Info pages 使用 server topbar，降低 client JS 與閃爍。
- 關於、使用說明、授權、隱私政策、使用條款收斂到 public footer。
- 使用說明頁新增音聲台本／ASMR 劇本寫作指引與 FAQ structured data。

---

## SEO

- `apps/public/app/sitemap.ts` 擁有 sitemap（Next 產出，nginx 不再 proxy 至 backend）。
- `apps/public/app/robots.ts` 擁有 robots policy。
- JSON-LD 全路由實作（`WebSite`、`CreativeWork`、`Person`、`Organization`、`CreativeWorkSeries`、`CollectionPage`）。
- OG fallback image（`/og/homepage.png`）。
- `llms.txt` 符合 llmstxt.org 規範（Markdown 連結格式）。
- `robots.txt` AI bot rules 修正（`Allow: /api/public-scripts/` 不再被 `Disallow: /api/` 覆蓋）。
- Lighthouse SEO 100、Accessibility 100、Best Practices 100、Agentic Browsing 100（本地 + 正式）。
- favicon / apple-touch-icon 由 Next 與 nginx exact-match route 正確提供。
- `/.well-known/api-catalog` 提供 `application/linkset+json`，列出 sitemap、`llms.txt`、public script collection、metadata 與 raw markdown endpoint。
- `llms.txt` 與 `/.well-known/llms.txt` 補上 whole-site extraction workflow。
- 站台 SEO 語彙補上「音聲台本」「免費音聲台本」「配音台本」「ASMR 台本」「ASMR劇本」「聲音台本」。
- 作品頁 CreativeWork JSON-LD 補 `keywords`，fallback description 改為「公開台本與音聲台本」。

---

## 安全

- Docker Compose 生產邊界：只有 nginx 對外 publish，postgres 僅 internal network 可達。
- Public write API rate limits（view counter、terms acceptance）。
- Revalidate scope lockdown（`MAX_PATHS=50`、path 白名單驗證）。
- Dependency audit：`npm audit --omit=dev` 0 high / 0 critical，已知例外文件化。
- Security regression test suite（`scripts/security-check.sh`）。

---

## 效能

- LCP image candidates：`CoverImageRenderer` 使用 `next/image`（proper `srcset`）。
- Anime.js 不進 initial sync bundle，idle callback prewarm。
- 公開頁字體 payload 減少（subset + preload 優化）。
- Public info pages render path 優化（server topbar、font split）。
- Route cache 策略：首頁 5m、read 1d、entity 1h、sitemap 1h。
- Public reader pages 加上 cache policy。
- Homepage metadata 與 SSR data boundary 穩定化，避免 build-time empty homepage。
- Renderer sibling keys 穩定化，降低重新渲染與 hydration 風險。

---

## Publisher Studio

- 封面設計器 Figma 風格縮放把手。
- Studio covers/loading 優化。
- Export metadata 選擇 dialog。
- Docker image versioning 與 rollback 機制。

---

## 其他

- 隱私條款、服務條款靜態頁面。
- Public info pages 統一 shell（`PublicInfoPageShell`）。
- Gallery card summaries、outline previews、hover previews。
- Gallery URL state model（tab/view mode 持久化）。
- Workspace 登入入口從公開頁可達。
- `about` 頁近期更新條目同步。
- Project docs 重新整理為 `architecture/`、`archive/`、`pending/`、`engineering/` 分層。
- `docs/archive/release-version-map-after-v0.5.0.md` 保留為 v0.5.0 後變更盤點。

---

## 升級注意

- `/gallery` 現在回傳 **410**，不會重導向至首頁。如有外部連結請更新。
- `customMetadata` runtime fallback 已移除。依賴此欄位的自訂整合需更新至 canonical fields。
- nginx `/.well-known/` 路由須 proxy 至 Next（見 `nginx.conf`），否則 `/.well-known/llms.txt` 等機器文件會 404。

## 歷史版本概覽（v0.1.0–v0.4.9）

這段早期版本沒有完整的逐版 changelog，以下依 Git tags、當時的 README 與 release commit
整理產品演進，細部修正仍以各版本 commit 為準。

### v0.1.0–v0.2.2：Fountain 閱讀器基礎

- 從 React + Vite 的本機 Fountain 台本閱讀器起步，讀取 `src/scripts_file` 內的 `.fountain` 檔案。
- 加入角色篩選、順讀／專注模式、字級與主題設定、PDF 匯出、Sidebar 與 About 頁面。
- 支援 SFX、方位、情緒／口氣與留白等台本標記，並補上快捷鍵、單元測試與手機版元件。

### v0.3.0：編輯器與創作工作室

- 從閱讀器擴展成 Fountain Pro 編輯平台，加入雲端工作室、Live Editor 與即時預覽。
- 建立可自訂的智慧標記系統，支援 inline／block 規則、Regex、樣式、優先順序與匯入／匯出。
- 加入角色／場景／停頓統計、雙模式閱讀、RWD、SEO 分享預覽與 Docker 部署基礎。

### v0.4.0–v0.4.4：公開台本平台成形

- 產品定位從單機閱讀器轉為公開閱讀與創作工作室平台。
- 新增公開作品列表、搜尋排序、作者／組織頁、工作室 Dashboard、授權與 metadata 管理。
- 持續補強系列、標籤、公開 Hero、雙欄編輯預覽、反向代理與正式部署架構。

### v0.4.5–v0.4.9：資料與正式環境成熟化

- metadata、授權、作者資料與封面裁切逐步改為結構化欄位，移除舊 fallback 寫入路徑。
- 加入 PostgreSQL 正式資料庫支援、SQLite 遷移工具、媒體庫、封面裁切／縮放與公開頁效能優化。
- 補強 CSP、瀏覽統計、手機版 UX、多語系、公開頁 SEO 與 script metadata 流程。
- 大量重構為 TypeScript，共用閱讀器／公開頁元件，並補上測試與效能改善。

## [0.5.0] - baseline

`v0.5.0` is the baseline tag for the detailed release entries in this changelog.
The historical overview above is intentionally high-level rather than a complete commit inventory.
