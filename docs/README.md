# 文件索引
最後更新：2026-07-01（v0.6.0 pre-release）

## 建議閱讀順序
1. `docs/engineering/operations.md`：如何啟動、測試、部署
2. `docs/product/architecture.md`：目前系統模組與分層
3. `docs/product/data-flows.md`：關鍵功能資料流（前後端對應）
4. `docs/engineering/testing.md`：測試策略與指令

## 產品與功能
- `docs/product/architecture.md`：系統架構與目錄對應
- `docs/product/data-flows.md`：公開頁/工作室/後台的主要資料流
- `docs/product/marker-config-guide.md`：標記規則與主題設定
- `docs/product/script-import-pipeline.md`：匯入與解析流程

## 架構參考
- `docs/architecture/frontend-boundaries.md`：Next public、Vite editor、shared packages 的前端邊界
- `docs/architecture/public-homepage-architecture.md`：Next public homepage 架構、URL state、資料契約
- `docs/architecture/public-homepage-appearance-layout-architecture.md`：首頁外觀字級 token 與 sidebar 架構
- `docs/architecture/public-shell-actions-architecture.md`：公開頁 shell actions 元件架構
- `docs/architecture/public-media-presentation-architecture.md`：公開頁圖片/媒體呈現架構
- `docs/architecture/public-motion-system.md`：公開頁動態系統架構
- `docs/architecture/read-page-seo-ux-architecture.md`：閱讀頁 SEO 與 UX 架構
- `docs/architecture/reader-display-preferences-architecture.md`：閱讀顯示偏好、Vite 編輯預覽與 renderer contract 長期架構
- `docs/architecture/read-page-export-metadata-projection.md`：閱讀頁匯出 metadata 投影
- `docs/architecture/read-page-download-architecture.md`：閱讀頁下載架構
- `docs/architecture/seo-google-content-visibility-contract.md`：Google 搜尋與 AI 爬蟲可見性契約
- `docs/architecture/color-token-guide.md`：色彩 token 使用指南
- `docs/architecture/security-protection.md`：安全防護實作與注意事項
- `docs/architecture/mcp-spec.md`：MCP 規格

## 工程與操作
- `docs/engineering/operations.md`：開發與部署操作手冊
- `docs/engineering/testing.md`：Vitest/Playwright/Pytest 使用方式
- `docs/engineering/ci-process.md`：CI 建議流程
- `docs/engineering/backend-auth.md`：API 驗證流程（Firebase / local）
- `docs/engineering/database-runtime.md`：資料庫執行策略
- `docs/engineering/database-architecture-current.md`：資料庫現況
- `docs/engineering/dependency-audit.md`：依賴安全稽核紀錄

## 待完成（Backend Blocked）
- `docs/pending/production-security-hardening-plan.md`：正式環境資安硬化計畫（view 去重、body size 限制、URL 驗證）
- `docs/pending/public-metadata-contract-migration-plan.md`：公開頁 metadata 欄位正規化遷移計畫
- `docs/pending/public-agent-discovery-plan.md`：公開頁 agent discovery、Link headers、API catalog 與 well-known soft-404 修正計畫

## 版本紀錄
- `docs/release-version-map-after-v0.5.0.md`：v0.5.0 之後各版本 commit 對應表

## 封存
- `docs/archive/`：已完成的計劃文件、歷史稽核報告、舊版架構紀錄
