# 文件索引
最後更新：2026-06-17（Next public cutover complete）

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
- `docs/public-homepage-architecture.md`：Next public homepage 的長期架構、URL state、資料契約與 parity 計畫
- `docs/public-homepage-appearance-layout-architecture.md`：首頁外觀字級 design token 與桌面篩選 sidebar 收合架構
- `docs/homepage-hero-banner-placement-plan.md`：首頁 Hero Banner 作為正式圖片 placement 的資料契約、superadmin 編輯與超寬預覽規劃
- `docs/seo-homepage-audit-2026-06-17.md`：首頁 SEO 與分享預覽圖問題稽核
- `docs/seo-homepage-improvement-plan-2026-06-17.md`：首頁 SEO 改善執行計劃

## 工程與操作
- `docs/engineering/operations.md`：開發與部署操作手冊
- `docs/engineering/testing.md`：Vitest/Playwright/Pytest 使用方式
- `docs/engineering/ci-process.md`：CI 建議流程
- `docs/engineering/backend-auth.md`：API 驗證流程（Firebase / local）
- `docs/engineering/database-runtime.md`：資料庫執行策略
- `docs/engineering/database-architecture-current.md`：資料庫現況

## 安全
- `docs/security-protection.md`：安全防護實作與注意事項
- `docs/production-security-hardening-plan.md`：正式環境資安硬化計畫（部署邊界、公開寫入 API、防濫用、revalidate、依賴掃描）
- `docs/weak-scan-2026-02-05.md`：弱點掃描歷史報告

## 封存
- `docs/archive/cloud-architecture.md`：舊版架構（封存）
- `docs/archive/nextjs-migration-plan.md`：Next public frontend migration 執行紀錄（已完成）
- `docs/archive/public-reader-parity.md`：Next public reader 替換 Vite public reader 的 parity 紀錄（已完成）
- `docs/archive/public-series-aggregation-plan.md`：公開頁系列聚合、章節導覽、更新提示策略（已完成）
- `docs/archive/publisher-series-create-flow.md`：發布工作室系列建立流程設計紀錄（已完成）
- `docs/archive/publisher-series-editor-architecture.md`：發布工作室系列管理架構設計紀錄（已完成）

## 本次同步重點（2026-05-26）
- `README.md`：更新 v0.5.0 功能與技術概述
- `docs/product/architecture.md`：補齊 v2 多欄、主題別設定、管理端預設設定路徑
- `docs/product/data-flows.md`：重寫核心資料流與角色分流（Public / Studio / Admin）
