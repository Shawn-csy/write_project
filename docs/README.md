# 文件索引

## 產品與功能
- `docs/product/architecture.md`：系統架構圖與說明
- `docs/product/data-flows.md`：核心資料流與功能資料流
- `docs/product/marker-config-guide.md`：標記設定說明
- `docs/product/script-import-pipeline.md`：匯入流程與解析

## 工程與部署
- `docs/engineering/backend-auth.md`：後端驗證（Firebase Token）
- `docs/engineering/ci-process.md`：CI 建議流程
- `docs/engineering/testing.md`：測試指南

## 安全
- `docs/weak-scan-2026-02-05.md`：弱點掃描最終版報告

## 封存（過時）
- `docs/archive/cloud-architecture.md`：舊版雲端備援架構（已封存）

---

# 檔案架構（整理後）

## 根目錄
- `README.md`：專案說明（面向非開發者）
- `docker-compose.yml`：正式模式（build + nginx serve）
- `docker-compose.dev.yml`：開發模式（Vite dev server）
- `docker-compose.prod.yml`：正式模式（備份/明確版本）
- `nginx.conf`：SPA fallback + `/api` 反代
- `vite.config.js`：Vite 設定
- `vitest.config.js`：Vitest 設定
- `playwright.config.js`：E2E 測試設定
- `tailwind.config.js` / `postcss.config.js`：樣式建置設定
- `package.json` / `package-lock.json`：前端依賴

## 主要目錄
- `src/`：前端原始碼
- `server/`：後端 FastAPI 服務
- `docs/`：文件
- `scripts/`：工具腳本
- `examples/`：範例資料
- `tests-e2e/`：E2E 測試
- `logs/`：本機日誌


