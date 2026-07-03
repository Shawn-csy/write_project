# Release Notes — v0.6.0

Released: 2026-07-02

## Overview

v0.6.0 是 v0.5.0 之後的第一個 minor release，涵蓋公開前端全面切換至 Next.js SSR、Vite 公開頁退役、系列功能、editorial 設計語言重塑、媒體系統、行動版 shell 重設計，以及 SEO、安全與效能的完整落地。

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

---

## 新功能

### 公開前端（Next.js SSR）

- SSR 公開頁：`/read/[id]`、`/author/[id]`、`/org/[id]`、`/series/[name]`、`/tag/[name]`、首頁 gallery。
- ISR + on-demand revalidation（`/api/revalidate`）。
- Shared `@write/script-engine` package 統一解析與渲染。
- Marker-based reader presentation。
- Public reader PDF export pipeline。

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

---

## SEO

- `apps/public/app/sitemap.ts` 擁有 sitemap（Next 產出，nginx 不再 proxy 至 backend）。
- `apps/public/app/robots.ts` 擁有 robots policy。
- JSON-LD 全路由實作（`WebSite`、`CreativeWork`、`Person`、`Organization`、`CreativeWorkSeries`、`CollectionPage`）。
- OG fallback image（`/og/homepage.png`）。
- `llms.txt` 符合 llmstxt.org 規範（Markdown 連結格式）。
- `robots.txt` AI bot rules 修正（`Allow: /api/public-scripts/` 不再被 `Disallow: /api/` 覆蓋）。
- Lighthouse SEO 100、Accessibility 100、Best Practices 100、Agentic Browsing 100（本地 + 正式）。

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

---

## 升級注意

- `/gallery` 現在回傳 **410**，不會重導向至首頁。如有外部連結請更新。
- `customMetadata` runtime fallback 已移除。依賴此欄位的自訂整合需更新至 canonical fields。
- nginx `/.well-known/` 路由須 proxy 至 Next（見 `nginx.conf`），否則 `/.well-known/llms.txt` 等機器文件會 404。
