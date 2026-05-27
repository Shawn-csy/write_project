# 公開台本平台 (`write_project`)

最後更新：2026-05-26（v0.5.0）

本專案是一個同時提供「公開閱讀」與「創作工作室」的台本平台。

- 公開端：瀏覽/搜尋公開作品、作者頁、組織頁、閱讀器
- 工作室：作品管理、作者與組織管理、系列管理、標記規則與版面設定
- 後台：超級管理員可管理用戶與系統預設設定（含預設標記規則）

## 技術棧
- 前端：`Vite + React + TypeScript`（`src/`）
- 後端：`FastAPI + SQLAlchemy`（`server/`）
- DB：`PostgreSQL` 主用（SQLite 僅遷移/除錯用途）
- 測試：`Vitest`（前端）、`Playwright`（E2E）、`Pytest`（後端）

## v0.5.0 重點
- 完成前端 TS/TSX 全面遷移與型別收斂
- 多欄（V2）設定與路由流程升級（含主題別開關）
- 媒體裁切與 metadata 結構化欄位持久化
- 公開頁 SEO/快取/資料一致性強化
- 超級管理員可線上編輯並儲存系統預設標記規則

## 專案結構
- `src/`：前端應用（routes/pages/components/hooks/contexts/lib）
- `server/`：後端 API、CRUD、模型、schema、migration
- `docs/`：產品、工程、部署、安全文件
- `scripts/`：開發與維運腳本

## 快速開始

### 1) 安裝
```bash
npm ci
```

### 2) 前端開發
```bash
npm run dev
```

### 3) 後端（本機）
```bash
cd server
pip install -r requirements.txt
uvicorn main:app --reload --port 1091
```

### 4) Docker（建議）
- 開發：`docker-compose.dev.yml`
- 正式：`docker-compose.prod.yml`

## 常用指令
```bash
npm run test
npm run typecheck
npm run build
npm run test:e2e
```

## 主要文件入口
- 文件索引：`docs/README.md`
- 架構：`docs/product/architecture.md`
- 資料流：`docs/product/data-flows.md`
- 操作手冊：`docs/engineering/operations.md`
- 測試指南：`docs/engineering/testing.md`

## API 與認證備註
- 前端 API base：`VITE_API_URL`（未設時預設 `/api`）
- 同源部署：由 Nginx 反代 `/api`
- 認證：`Authorization: Bearer <Firebase token>`
- 本機可選 `X-User-ID` 測試模式（見 `docs/engineering/backend-auth.md`）
