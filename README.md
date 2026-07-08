# 公開台本平台 (`write_project`)

最後更新：2026-07-07（v0.6.0 release candidate）

本專案是一個台本創作、發布與公開閱讀平台。現在的前端已拆成兩個 runtime：

- `src/`：Vite 工作室/editor。負責創作、發布工作室、後台管理、匯入匯出與編輯器預覽。
- `apps/public/`：Next.js 公開站。負責 SEO、SSR/ISR、公開首頁、作者/組織/系列/標籤頁與公開閱讀器。

共享的解析、渲染、公開 UI、媒體裁切與 PDF 匯出能力放在 `packages/*`，避免 Vite 與 Next 重複實作。

## 目前產品面

- 公開站：首頁 gallery、作者頁、組織頁、系列頁、標籤頁、公開閱讀器、靜態內容頁。
- 閱讀器：marker-driven presentation renderer，支援一般閱讀、系列章節導航、marker 顯示控制、閱讀偏好、分享與 PDF 匯出。
- 工作室：作品管理、系列管理、作者/組織管理、metadata 編輯、marker/theme 設定、匯入與匯出。
- 後端：FastAPI API、權限與資料持久化；正式資料庫以 PostgreSQL 為主。

## 技術棧

| 層 | 技術 |
|---|---|
| 工作室前端 | Vite, React, TypeScript, React Router |
| 公開站 | Next.js App Router, React, TypeScript, SSR/ISR |
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

| Route | 用途 | Revalidate |
|---|---|---|
| `/` | 首頁 gallery, hero banner, scripts/authors/orgs views | 5 minutes |
| `/read/[id]` | 公開閱讀器 | 24 hours |
| `/author/[id]` | 作者頁 | 1 hour |
| `/org/[id]` | 組織頁 | 1 hour |
| `/series/[name]` | 系列頁 | 1 hour |
| `/tag/[name]` | 標籤集合頁 | 1 hour |
| `/about`, `/help`, `/license`, `/privacy`, `/terms` | 靜態內容頁 | static |

Public app BFF routes live under `apps/public/app/api/*` and proxy backend data through same-origin APIs.

## 架構邊界

- `apps/public` owns public routes, metadata, SSR/ISR, BFF route handlers, and public URL behavior.
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

- `docker-compose.prod.yml` 使用 repo root 作為 build context。
- `apps/public/Dockerfile` 建置 Next public app，並納入 workspace packages。
- Vite studio build output 仍由 root build 流程產生。
- Nginx 設定見 `nginx.conf`。

## 主要文件入口

- [Changelog](./CHANGELOG.md)
- [Frontend Runtime Boundaries](./docs/architecture/frontend-boundaries.md)
- [Public Homepage Architecture](./docs/architecture/public-homepage-architecture.md)
- [Read Page SEO/UX Architecture](./docs/architecture/read-page-seo-ux-architecture.md)
- [Read Page Download Architecture](./docs/architecture/read-page-download-architecture.md)
- [Read Page Export Metadata Projection](./docs/architecture/read-page-export-metadata-projection.md)
- [SEO Google Content Visibility Contract](./docs/architecture/seo-google-content-visibility-contract.md)
- [Security Protection](./docs/architecture/security-protection.md)

## 環境變數與認證

- Vite studio API base: `VITE_API_URL`，未設時預設 `/api`。
- Next public app backend base: `BACKEND_API_URL`，public client 透過 same-origin `/api/*` BFF 存取。
- Public canonical base: `NEXT_PUBLIC_BASE_URL`。
- 正式部署由 Nginx 反代 backend API。
- 認證使用 `Authorization: Bearer <Firebase token>`。
- 本機測試模式可使用 `X-User-ID`，詳見後端認證文件。

## 長期原則

- 公開頁功能以 Next.js 為準；Vite 不再承擔 public runtime。
- 編輯器與工作室仍由 Vite 承擔。
- 解析、marker theme、reader renderer、public gallery model、PDF export 必須放在 shared packages，不允許兩邊複製邏輯。
- SEO metadata、public URLs、BFF routes 只放在 `apps/public`。
- 新增 reader/public 功能前，先確認應放在 app adapter、public domain model、renderer package，或 engine package。
