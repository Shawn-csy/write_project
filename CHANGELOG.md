# Changelog

All notable product-facing changes are documented here.

For the commit-level inventory between `v0.5.0` and `v0.6.0`, see `docs/archive/release-version-map-after-v0.5.0.md`.

## [Unreleased]

- No unreleased changes yet.

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

## [0.5.0] - baseline

`v0.5.0` is the baseline tag for this changelog. Earlier changes are not reconstructed here.
