# 專業劇本編輯器開發路線圖 (Roadmap)

目標：打造一個專業級、基於網頁的劇本編輯器，專注於結構化數據、行業標準與創作者生產力。

## 1. 核心編輯體驗 (Core Editing Experience)
平台的基礎。從「閱讀器」轉型為「創作工具」。
- [x] **即時編輯整合 (Live Editor)**：
    - 已整合 CodeMirror。
    - 基礎 Fountain 語法高亮。
- [x] **同步與持久化 (Sync & Persistence)**：
    - 瀏覽器端自動儲存 (Auto-save) (部分實作 via localStorage)。
    - 雲端同步，支援跨裝置存取。

## 2. 進階解析引擎 (Advanced Parsing Engine)
支援標準好萊塢劇本以外的創作格式。
- [x] **架構重構 (Architecture Refactor)**：
    - 完成 AST 解析邏輯模組化 (Dispatcher Pattern)。
    - 完成渲染引擎模組化 (Renderer Components)。
- [x] **自訂解析模式 (Custom Modes)**：
    //使用自訂Marker解決了
    - **標準模式 (Standard)**：嚴格遵守好萊塢格式標準。
    - **音聲/廣播劇模式 (Voice Drama / ASMR)**：寬鬆的換行規則 (允許對話內空行)，括號內容自動標記為音效/語氣。
    - **大綱模式 (Outline)**：強化標題層級顯示，將大綱說明文 (Synopsis) 視為正文顯示。

## 3. 會員與雲端系統 (User System & Cloud)
SaaS 產品管理資料與商業化的核心。
- [x] **身份驗證 (Authentication - OAuth2)**：
    - Google / GitHub 登入整合。
    - 使用者個人檔案管理。
- [x] **專案管理 (Project Management)**：
    - 管理多個劇本的儀表板 (Dashboard)。
    - 資料夾結構 / 標籤分類功能。
- [x] **權限控制 (Permissions)**：
    - 私人 vs. 公開劇本設定。
    - 唯讀分享連結 (提供給客戶的 Demo 檢視模式)。

## 4. 製片與分析工具 (Production & Analysis Tools)
利用結構化數據創造高價值功能。
- [ ] **統計儀表板 (Statistics Dashboard)**：
    - 角色台詞行數統計、場景/地點分佈分析。
    - 講話時長/總片長估算。
- [ ] **匯出選項 (Export Options)**：
    - 標準 PDF 匯出 (具備完美的分頁演算法)。
    - 對話腳本提取 (提供給配音員專用的文本)。


//暫時先不用
## 5. AI 助理整合 (AI Assistant Integration)
利用大型語言模型 (LLM) 輔助創意，而非取代創作。
- [ ] **分析功能**：「分析這場戲的節奏」、「檢查是否有劇情漏洞」。
- [ ] **生成功能**：「根據劇本生成故事大綱」、「建議 3 種不同的結局走向」。
- [ ] **視覺化**：根據場景標頭，自動生成情緒板 (Mood Board) 參考圖。

## 技術堆疊考量 (Tech Stack Considerations)
- **前端 (Frontend)**：React (目前使用中)，考慮遷移至 Next.js 以獲得更好的 SEO/路由控制/API 支援。
- **編輯器核心 (Editor)**：**CodeMirror** (已採用)。
- **後端/驗證 (Backend/Auth)**：Supabase 或 Firebase。
