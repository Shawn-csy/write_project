# Changelog

All notable product-facing changes are documented here.

For the commit-level inventory between `v0.5.0` and `v0.6.0`, see `docs/release-version-map-after-v0.5.0.md`.

## [Unreleased]

### 路由與索引品質

- 移除所有 `loading.tsx`（根目錄與 `read` / `author` / `org` / `series` / `tag` 動態路由）。
  這些 Suspense 邊界會讓 Next 在頁面解析完成前就送出 HTTP 200，導致 `notFound()`
  無法改寫狀態碼，所有「路由正確但實體不存在」的網址都變成 soft-404。移除後五個路由
  全部回真 404，正常頁面維持 200。`scripts/verify-public-seo.mjs` 新增對應迴歸檢查。

### 維運

- Postgres 的 `stop_grace_period` 設為 120s。原本沿用 Docker 預設的 10s，關機
  checkpoint 來不及完成就被 SIGKILL，WAL 遺失造成 `scripts` 表索引與 heap 不同步。
- 新增 `scripts/backup-db.sh` 每日備份（含 gzip 完整性驗證、資料表數檢查、索引健康度
  監測、14 天輪替），搭配 `scripts/com.shawnup.write-project-backup.plist` 排程。

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
- `docs/release-version-map-after-v0.5.0.md` 保留為 v0.5.0 後變更盤點。

---

## 升級注意

- `/gallery` 現在回傳 **410**，不會重導向至首頁。如有外部連結請更新。
- `customMetadata` runtime fallback 已移除。依賴此欄位的自訂整合需更新至 canonical fields。
- nginx `/.well-known/` 路由須 proxy 至 Next（見 `nginx.conf`），否則 `/.well-known/llms.txt` 等機器文件會 404。

## [0.5.0] - baseline

`v0.5.0` is the baseline tag for this changelog. Earlier changes are not reconstructed here.
