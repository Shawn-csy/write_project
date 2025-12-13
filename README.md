# Screenplay Reader

React + Vite 的 Fountain 劇本閱讀器。自動掃描 `src/scripts_file/*.fountain`，提供順讀模式、角色篩選、匯出 PDF 與可調字級的閱讀體驗。

## 開發
```bash
npm install
npm run dev
```

## 功能
- 自動載入 `src/scripts_file` 下的 `.fountain` 檔案
- 角色篩選／順讀模式（淡化或隱藏其他對白），可切換「顯示段落 / 僅台詞」
- 字級快速切換：16 / 24 / 36 / 72，主題/重點色可自訂
- 快捷鍵：`Ctrl/Cmd + [` 或 `]` 調整字級、`Ctrl/Cmd + B` 開合側欄、`Ctrl/Cmd + G` 切換順讀（需先選角色）、`Ctrl/Cmd + ↑/↓` 快速跳場景、`Ctrl/Cmd + ←/→` 每次捲動固定行數
- 匯出 PDF（保留標題頁、留白標記與 SFX 標記）
- Sidebar：使用說明首頁、About（版權/簡介）、設定
- 設定分頁：主題/重點色、字級、列表顯示（檔名/標題）、順讀效果（隱藏/淡化）、專注內容（段落/台詞）、角色色塊開關、SFX 標記開關
- 留白標記：短留白(1秒)、中留白(3秒)、長留白(5秒)、留白(純空白) 會轉成三行區塊（PDF 亦同）
- SFX 標記：(SFX: ...) 會呈現標籤色塊，可在設定開關

## 劇本檔案
- 把 `.fountain` 檔案放在 `src/scripts_file/`（可用子資料夾），頁面會自動出現清單。
- 想指向特定檔案可用 `?file=subdir/name.fountain` 查詢參數。

## 路徑別名
- `@/` 指向 `src/`（定義於 `jsconfig.json`），例如 `import Sidebar from "@/components/Sidebar"`。

## 專案結構
- `src/App.jsx`：主要狀態與佈局
- `src/components/`：UI 元件、Sidebar、ReaderHeader、ScriptPanel、AboutPanel、HomePanel 等
- `src/components/ScriptViewer.jsx`：Fountain 解析顯示
- `src/constants/`：色系、使用說明／About 文案
- `src/lib/print.js`：匯出 PDF 的 HTML 模板

## Docker
- 建置：`docker build -t screenplay-reader .`
- 執行：`docker run --rm -p 8080:8080 screenplay-reader`（內部以 `npm run preview` 提供 8080 端口）。
- 如果要用本機劇本檔案：`docker run --rm -p 8080:8080 -v $(pwd)/src/scripts_file:/app/src/scripts_file screenplay-reader`

## 其它
- Tailwind 用於樣式，`src/index.css` 定義主題變數與劇本文字樣式。
