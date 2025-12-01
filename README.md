# Screenplay Reader

React + Vite 的 Fountain 劇本閱讀器。自動掃描 `src/scripts/*.fountain`，提供順讀模式、角色篩選、匯出 PDF 與可調字級的閱讀體驗。

## 開發
```bash
npm install
npm run dev
```

## 功能
- 自動載入 `src/scripts` 下的 `.fountain` 檔案
- 角色篩選／順讀模式（淡化或隱藏其他對白）
- 字級快速切換：16 / 24 / 36 / 72
- 匯出 PDF（使用 Fountain 解析後的原始 HTML）
- 可切換主題與重點色
- Sidebar 顯示「使用說明」首頁、About（版權/簡介）

## 專案結構
- `src/App.jsx`：主要狀態與佈局
- `src/components/`：UI 元件、Sidebar、ReaderHeader、ScriptPanel、AboutPanel、HomePanel 等
- `src/components/ScriptViewer.jsx`：Fountain 解析顯示
- `src/constants/`：色系、使用說明／About 文案
- `src/lib/print.js`：匯出 PDF 的 HTML 模板

## 其它
- Tailwind 用於樣式，`src/index.css` 定義主題變數與劇本文字樣式。
- `jsconfig.json` 已配置 `@/` 路徑別名指向 `src/`。
