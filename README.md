# Fountain Pro 劇本編輯與閱讀器

一個專業級的 Fountain 劇本編輯平台，專為編劇與劇組設計。整合了雲端專案管理、即時預覽編輯、強大的自訂標記系統與數據分析功能。

## ✨ 核心功能詳解

### 1. 編輯與寫作 (Editor & Writing)
- **Live Editor**: 左側編輯 Markdown/Fountain 原始碼，右側即時預覽標準劇本格式。
- **語法高亮**: 針對場景 (Slugline)、角色 (Character)、對白 (Dialogue)、括號 (Parenthetical) 的專屬高亮配色。
- **自動補全**: 智慧記憶角色與場景名稱，加速寫作流程。
- **快捷鍵支援**:
  - `Cmd/Ctrl + B`: 開闔側邊欄
  - `Cmd/Ctrl + [` / `]`: 調整字級大小
  - `Cmd/Ctrl + G`: 快速切換對白專注模式 (需先選定角色)
  - `Cmd/Ctrl + S`: 手動儲存 (雲端模式亦支援自動儲存)

### 2. 智慧標記系統 (Smart Marker System)
本系統支援高度客製化的「標記主題」，不僅是簡單的文字替換，更支援正則表達式 (Regex) 與區塊標記：
- **自訂規則**: 可設定 Inline (行內) 或 Block (區塊) 類型的標記。
- **樣式控制**: 針對每個標記設定獨立的顏色、字重、字體 (如宋體、黑體) 與對齊方式。
- **優先權排序**: 透過拖曳 UI 決定標記解析的優先順序。
- **預設支援**:
  - `(SFX: ...)`: 音效提示 (自動變色)
  - `[方位]`: 舞台指示
  - 支援自訂 JSON 匯入/匯出標記設定。

### 3. 數據統計與分析 (Statistics & Analysis)
內建 `StatisticsPanel` 提供劇本的量化分析數據：
- **預估時長**: 根據對話字數與動作用詞估算總片長。
- **指令統計**: 自動計算 SFX、VFX 等指令出現次數。
- **停頓分析**: 識別 `(..)` 或 `(pause)` 等停頓指令並統計總秒數。
- **對白分布**: 統計各角色的台詞行數與字數佔比。

### 4. 閱讀體驗 (Reading Experience)
- **雙模式架構**:
  - **Cloud Dashboard**: 管理多個雲端劇本，支援資料夾分類、封面設定。
  - **Local Reader**: 直接讀取 `src/scripts_file` 資料夾內的 `.fountain` 檔案，無需上傳。
- **沉浸式閱讀**:
  - **角色篩選**: 點擊角色名，其餘內容淡化，僅高亮該角色對白。
  - **順讀模式**: 隱藏場景描述與動作，僅顯示對白流。
  - **字級獨立設定**: 可分別調整「全文」與「對白」的字級大小，適應不同閱讀習慣 (例如演員背詞需求)。
- **RWD 響應式設計**: 支援手機版 Drawer 導覽與觸控操作。

### 5. 輸出與分享 (Export & Share)
- **PDF 匯出**: 
  - 工業標準格式，包含頁碼、場景號。
  - 支援「留白標記」轉換為實體空白行 (方便筆記)。
- **SEO 優化分享**:
  - 內建 Express Server (`server.js`) 處理動態 Meta Tags。
  - 分享連結時，預覽圖與標題會自動對應劇本內容 (Title/Summary)。

## 🛠 技術架構

- **前端核心**: React 18, Vite, React Router v7
- **編輯器引擎**: CodeMirror 6 (自定義 Fountain Language Support)
- **解析核心**: 
  - 採用 Dispatcher Pattern 的 AST 解析器 (`src/lib/screenplayAST.js`)。
  - 支援 Dual Dialogue (雙人對話) 解析與渲染。
- **狀態管理**: Context API (`SettingsContext`, `AuthContext`) + Custom Hooks。
- **樣式系統**: TailwindCSS + Radix UI Primitives + CSS Variables (支援動態主題切換)。
- **部署**: Docker Ready (包含 Node.js SEO Server)。

## � 開發指南

### 環境設置

```bash
npm install
npm run dev
```

### Docker 部署
```bash
docker build -t screenplay-reader .
docker run -p 8080:8080 screenplay-reader
```
docker run -p 8080:8080 screenplay-reader
```

### 後端測試 (Backend Testing)
本專案包含完整的後端單元測試，涵蓋 API、安全性與資料匯出。

**執行自動化測試**:
```bash
cd server
./run_tests.sh
```
此腳本會自動建立虛擬環境、安裝相依套件並執行所有測試。

### 檔案結構說明
- `src/components/renderer/`: 負責將 AST 轉換為 HTML/React Node 的渲染器。
- `src/components/settings/`: 包含 MarkerSettings 等複雜設定 UI。
- `src/lib/parsers/`: Fountain 語法解析邏輯 (Inline/Block/TitlePage)。
- `src/services/`: 負責與後端 API 溝通 (Settings, Auth)。
