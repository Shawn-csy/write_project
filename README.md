# 公開台本平台 (`write_project`)

最後更新：2026-11-13（依版本庫設定整理，未重新查驗線上狀態）

本專案是一個台本創作、發布與公開閱讀平台。公開網站與工作室分別由兩個前端提供：

- `src/`：Vite 工作室/editor。負責創作、發布工作室、後台管理、匯入匯出與編輯器預覽。
- `apps/public/`：Next.js 公開站原始碼。正式公開入口採 Cloudflare Pages 靜態匯出，瀏覽器向 Tunnel 主 API 取得即時公開資料，失聯時使用 D1／R2 唯讀備援。SEO HTML、metadata 與 sitemap 是建置快照；本機 Next server 仍保留 BFF、外部封面與 SSR/ISR 等 server adapters。

共享的解析、渲染、公開 UI、媒體裁切與 PDF 匯出能力放在 `packages/*`，避免 Vite 與 Next 重複實作。

## 目前產品面

- 公開站：首頁作品目錄、作者／組織／系列／標籤頁、公開閱讀器、音聲作品、Demo、資源名錄及說明頁。
- 製作資源：聲演、後製、封面與錄音室共用名錄與詳情頁，呈現聯絡方式、參與作品及作品連結；參與作品可包含站外作品。
- 公開投稿：台本、音聲作品、Demo 與製作資源由訪客提交，經管理員審核後公開；已刊登資源也可提交補充或修正。
- 外部公開台本：管理員可只匯入外部作品的標題、摘要、封面、作者與分類，完整內容仍由原網站提供。
- 閱讀器：marker-driven presentation renderer，支援一般閱讀、系列章節導航、marker 顯示控制、閱讀偏好、分享與 PDF 匯出。
- 工作室：作品管理、系列管理、作者/組織管理、metadata 編輯、marker/theme 設定、匯入與匯出。
- 後端：FastAPI API、權限與資料持久化；正式資料庫以 PostgreSQL 為主。

## 技術棧

| 層 | 技術 |
|---|---|
| 工作室前端 | Vite, React 19, TypeScript, React Router |
| 公開站 | Next.js 16 App Router, React 19, TypeScript；Pages 靜態匯出／本機 server adapters |
| 共享套件 | npm workspaces under `packages/*` |
| 後端 | FastAPI, SQLAlchemy |
| DB | PostgreSQL（SQLite 僅用於遷移/除錯） |
| 測試 | Vitest, Playwright, Pytest |
| 樣式 | Tailwind CSS, CSS variables, shared marker theme tokens |

## 專案結構

```text
apps/public/              Next.js public frontend
  app/                    public routes, server data loading, metadata
  components/             public app adapters and shell actions
  lib/                    API/BFF adapters, SEO models, public projections

src/                      Vite studio/editor frontend
  components/             editor, dashboard, reader preview, metadata UI
  hooks/                  studio/editor state and API hooks
  lib/                    Vite app adapters and compatibility shims

packages/
  script-engine/          marker config normalization, parser, AST, render model
  script-reader-renderer/ React renderers and marker-driven presentation layout
  script-reader-ui/       reader state, toolbar primitives, reading preferences
  script-theme/           shared marker color CSS tokens
  public-ui/              router-neutral public domain models and UI components
  reader-export/          PDF/print export, metadata projection, print HTML
  media-crop/             media crop encode/decode/style helpers
  browser-download/       browser download primitives

server/                   FastAPI backend
docs/                     architecture, SEO, reader, security, migration notes
scripts/                  development and maintenance scripts
```

## 公開站路由

下表 Revalidate 僅描述 Next **server mode** 的 ISR／快取設定。Pages 靜態匯出不執行 ISR，不會自行刷新 SEO HTML、metadata 或 sitemap；瀏覽器即時 API 更新與重新建置快照是不同路徑。

| Route | 用途 | Revalidate |
|---|---|---|
| `/` | 首頁 gallery, hero banner, scripts/authors/orgs views | `force-dynamic`（資料快取另計） |
| `/read/[id]` | 公開閱讀器 | 1 hour |
| `/author/[id]` | 作者頁 | 1 hour |
| `/org/[id]` | 組織頁 | 1 hour |
| `/author/external/[name]` | 外部作者頁 | 依公開資料快取 |
| `/org/external/[name]` | 外部組織頁 | 依公開資料快取 |
| `/series/[name]` | 系列頁 | 1 hour |
| `/tag/[name]` | 標籤集合頁 | 1 hour |
| `/authors`, `/audio-works`, `/demos`, `/resources` | 公開名錄 | 依頁面資料快取 |
| `/resources/[id]` | 製作資源詳情與參與作品 | 依公開資料快取 |
| `/about`, `/help`, `/license`, `/privacy`, `/terms` | 公開資訊頁 | 1 hour |

BFF routes 位於 `apps/public/app/api/*`，僅在 Next server mode 執行；Pages 瀏覽器使用編入建置的主／備援 API origins。
工作室 Demo 管理頁使用 `/studio/demos`；公開 `/demos` 由 Next.js 提供。

## 架構邊界

- `apps/public` owns public routes, build-time metadata, public URL behavior, and the remaining Next server adapters (SSR/ISR/BFF).
- `src` owns studio/editor workflows. Vite public-looking modules that remain are editor preview code or compatibility facades.
- `packages/script-engine` is the single source for parser/AST/render model logic.
- `packages/script-reader-renderer` owns canonical script rendering and marker-driven presentation layout. Legacy `v2` names are compatibility aliases.
- `packages/public-ui` owns router-neutral public models and UI components. It exports a client barrel (`index.ts`) and a server-safe barrel (`server.ts`).
- `packages/reader-export` owns PDF/print export and public metadata projection for exported documents.

See [docs/architecture/frontend-boundaries.md](./docs/architecture/frontend-boundaries.md) for the full boundary rules.

## 快速開始

### 1. 安裝依賴

```bash
npm ci
```

### 2. 啟動 Vite 工作室/editor

```bash
npm run dev
```

### 3. 啟動 Next 公開站

```bash
npm run dev -w apps/public
```

### 4. 啟動後端（本機）

```bash
cd server
pip install -r requirements.txt
uvicorn main:app --reload --port 1091
```

## 常用指令

```bash
npm run typecheck        # root TypeScript check
npm run test             # Vitest multi-project suite
npm run build            # Vite studio build
npm run build:public     # Next public build
npm run test:e2e         # Playwright E2E
```

後端測試請在 `server/` 內使用 Pytest。

## 部署

- 正式公開入口為 Cloudflare Pages 靜態檔；工作室與主 API 經 Tunnel 連到本機入口。D1／R2 是公開資料與媒體唯讀備援，不接管寫入。
- 網站發布以 [持續部署與發布程序](./docs/engineering/continuous-deployment.md) 為準；`scripts/release.sh` 協調建置、獨立 schema 檢查、候選準備、入口切換、Pages 上傳及驗證。
- `scripts/site-release.py` 管理網站候選與回滾，不停止 PostgreSQL；API／入口回滾與 Pages 靜態檔回滾分開，資料變更不隨之回復。
- `docker-compose.prod.yml` 是本機服務設定基線，並非目前線上 release tag 的證據。Pages 資源與快照限制見 [正式公開站操作](./docs/engineering/public-pages-production.md)。

## 主要文件入口

- [Changelog](./CHANGELOG.md)
- [Frontend Runtime Boundaries](./docs/architecture/frontend-boundaries.md)
- [Public Homepage Architecture](./docs/architecture/public-homepage-architecture.md)
- [Read Page SEO/UX Architecture](./docs/architecture/read-page-seo-ux-architecture.md)
- [Read Page Download Architecture](./docs/architecture/read-page-download-architecture.md)
- [Read Page Export Metadata Projection](./docs/architecture/read-page-export-metadata-projection.md)
- [SEO Google Content Visibility Contract](./docs/architecture/seo-google-content-visibility-contract.md)
- [Security Protection](./docs/architecture/security-protection.md)
- [內容管理本機 MCP](./docs/architecture/local-external-script-mcp.md)
- [外部公開台本匯入流程](./docs/product/external-public-script-import.md)

## 環境變數與認證

- Vite studio API base: `VITE_API_URL`，未設時預設 `/api`。
- Next server／Pages build backend base: `BACKEND_API_URL`；Pages 瀏覽器主／備援由 `NEXT_PUBLIC_API_ORIGIN`／`NEXT_PUBLIC_FALLBACK_API_ORIGIN` 決定，媒體另有主／備援 origins（見正式公開站操作）。
- Public canonical base: `NEXT_PUBLIC_BASE_URL`。
- `FEEDBACK_NOTIFICATION_EMAIL`：公開頁回報／上架申請的通知收件人，預設為 `silence0603@gmail.com`。
- `SMTP_HOST` / `SMTP_PORT` / `SMTP_USERNAME` / `SMTP_PASSWORD`：寄信服務設定；Gmail 請使用應用程式密碼，不要使用一般登入密碼。
- `SMTP_FROM`：寄件地址，未設定時使用 `SMTP_USERNAME`。
- `SMTP_USE_TLS` / `SMTP_USE_SSL`：SMTP 加密方式，預設使用 STARTTLS。
- 正式部署由 Nginx 反代 backend API。
- 認證使用 `Authorization: Bearer <Firebase token>`。
- 本機測試模式可使用 `X-User-ID`，詳見後端認證文件。

## 長期原則

- 公開頁功能以 Next.js 為準；Vite 不再承擔 public runtime。
- 編輯器與工作室仍由 Vite 承擔。
- 解析、marker theme、reader renderer、public gallery model、PDF export 必須放在 shared packages，不允許兩邊複製邏輯。
- SEO metadata、public URLs、BFF routes 只放在 `apps/public`。
- 新增 reader/public 功能前，先確認應放在 app adapter、public domain model、renderer package，或 engine package。
