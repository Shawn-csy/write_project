# 文件索引
最後更新：2026-08-21（v0.7.0）

## 目錄分工

| 目錄 | 內容 |
|---|---|
| `engineering/` | 日常操作：啟動、測試、部署、CI、資料庫、稽核 |
| `architecture/` | 現行架構與契約，描述「現在是怎麼運作的」 |
| `product/` | 產品面規則與流程 |
| `pending/` | 進行中或長期的計畫 |
| `archive/` | 已完成的計畫與歷史稽核紀錄，保留供追溯 |

## 建議閱讀順序

1. `engineering/operations.md`：Compose 檔案分工、啟動、測試、**部署**、備份、health endpoints
2. `architecture/frontend-boundaries.md`：Next public、Vite editor、shared packages 的前端邊界
3. `architecture/public-homepage-architecture.md`：Next public homepage 架構、URL state、資料契約
4. `engineering/testing.md`：測試策略與指令

> ⚠️ 正式部署請使用 `scripts/safe-deploy.sh`，不要直接執行 `scripts/deploy.sh`。
> 原因見 `engineering/operations.md` 第 6 節。

## 工程操作

- `engineering/operations.md`：操作手冊（Compose 分工、部署、備份、CDN 快取、health endpoints、故障排查）
- `engineering/ci-process.md`：CI 流程（測試、型別檢查、相依稽核門檻）
- `engineering/testing.md`：測試策略與指令
- `engineering/dependency-audit.md`：相依套件稽核紀錄與已接受風險
- `engineering/backend-auth.md`：後端驗證機制
- `engineering/database-architecture-current.md`：資料庫架構現況（含 dev/prod 資料目錄分離）
- `engineering/database-runtime.md`：資料庫 runtime 行為
- `engineering/public-seo-preindex-checklist.md`：公開頁上線前的 SEO 檢查清單

## 架構參考

- `architecture/frontend-boundaries.md`：Next public、Vite editor、shared packages 的前端邊界
- `architecture/public-homepage-architecture.md`：Next public homepage 架構、URL state、資料契約
- `architecture/public-homepage-ssr-data-architecture.md`：首頁 SSR 資料邊界
- `architecture/public-homepage-appearance-layout-architecture.md`：首頁外觀字級 token 與 sidebar 架構
- `architecture/public-entity-page-data-contract.md`：作者／組織／系列／標籤頁資料契約
- `architecture/public-shell-actions-architecture.md`：公開頁 shell actions 元件架構
- `architecture/public-media-presentation-architecture.md`：公開頁圖片／媒體呈現架構
- `architecture/public-motion-system.md`：公開頁動態系統架構
- `architecture/read-page-seo-ux-architecture.md`：閱讀頁 SEO 與 UX 架構
- `architecture/reader-display-preferences-architecture.md`：閱讀顯示偏好與 renderer contract
- `architecture/read-page-export-metadata-projection.md`：閱讀頁匯出 metadata 投影
- `architecture/read-page-download-architecture.md`：閱讀頁下載架構
- `architecture/seo-google-content-visibility-contract.md`：Google 搜尋與 AI 爬蟲可見性契約
- `architecture/security-protection.md`：資安防護架構
- `architecture/color-token-guide.md`：色彩 token 規範
- `architecture/mcp-spec.md`：MCP 介面規格

## 產品與功能

- `product/marker-config-guide.md`：標記規則與主題設定
- `product/script-import-pipeline.md`：匯入與解析流程

## 進行中

- `pending/production-security-hardening-plan.md`：正式環境資安基線（長期路線圖）

## 歷史紀錄

`archive/` 保留已完成的計畫、稽核報告與版本盤點，供追溯決策脈絡。較常被引用的有：

- `archive/release-version-map-after-v0.5.0.md`：v0.5.0 之後各版本 commit 對應表
- `archive/metadata-boundary.md`：metadata 邊界 RFC（程式碼註解仍引用）
- `archive/nextjs-migration-plan.md`：公開站遷移至 Next.js 的計畫
- `archive/next-native-public-frontend-architecture.md`：Next 原生公開前端架構
