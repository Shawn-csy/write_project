# 文件索引
最後更新：2026-05-26（v0.5.0）

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
- `docs/frontend-boundaries.md`：Next public、Vite editor、shared packages 的長期前端邊界與退場規則
- `docs/public-reader-parity.md`：Next public reader 替換 Vite public reader 的長期架構與 parity checklist
- `docs/public-homepage-architecture.md`：Next public homepage 的長期架構、URL state、資料契約與 parity 計畫

## 工程與操作
- `docs/engineering/operations.md`：開發與部署操作手冊
- `docs/engineering/testing.md`：Vitest/Playwright/Pytest 使用方式
- `docs/engineering/ci-process.md`：CI 建議流程
- `docs/engineering/backend-auth.md`：API 驗證流程（Firebase / local）
- `docs/engineering/database-runtime.md`：資料庫執行策略
- `docs/engineering/database-architecture-current.md`：資料庫現況

## 安全
- `docs/security-protection.md`：安全防護實作與注意事項
- `docs/weak-scan-2026-02-05.md`：弱點掃描歷史報告

## 封存
- `docs/archive/cloud-architecture.md`：舊版架構（封存）

## 本次同步重點（2026-05-26）
- `README.md`：更新 v0.5.0 功能與技術概述
- `docs/product/architecture.md`：補齊 v2 多欄、主題別設定、管理端預設設定路徑
- `docs/product/data-flows.md`：重寫核心資料流與角色分流（Public / Studio / Admin）
