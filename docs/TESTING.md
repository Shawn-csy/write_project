# 測試指南 (Testing Guide)

Fountain Pro 專案採用 Vitest 進行單元測試，Playwright 進行統合測試 (E2E)。本文件旨在協助開發者了解如何執行與撰寫測試。

## 1. 測試環境概觀

- **Unit Test Runner**: Vitest (相容 Jest API)
- **E2E Test Runner**: Playwright
- **UI Component Testing**: Vitest + React Testing Library (部分) 
- **Mocking**: Vitest default mocks, Playwright Network Mocks

## 2. 單元測試 (Unit Tests)

主要針對 `src/lib/` 下的核心邏輯進行驗證，包含 Parser、AST Builder 與 Statistics 模組。

### 執行指令

```bash
# 執行所有單元測試
npm run test

# 監聽模式 (開發時推薦)
npx vitest

# 執行特定檔案
npx vitest src/lib/metadataParser.test.js

# 查看覆蓋率報告
npm run coverage
```

### 關鍵測試檔案

- `src/lib/metadataParser.test.js`: 驗證 Metadata 解析 (包含 UTF-8, 空值處理)。
- `src/lib/importPipeline/directASTBuilder.test.js`: 驗證原始 Fountain 到 AST 的轉換邏輯。
- `src/lib/statistics/`: 包含各項統計指標 (Duration, Dialogue Count) 的測試。

> **注意**: 專案已從 Node Native Test (`node:test`) 遷移至 Vitest。請勿使用 `node --test` 執行測試。

## 3. 統合測試 (E2E Tests)

使用 Playwright 模擬使用者真實操作，涵蓋 Dashboard 載入、閱讀器導航與藝廊篩選。

### 執行指令

```bash
# 首次使用需安裝瀏覽器
npx playwright install

# 執行所有 E2E 測試 (Headless Mode)
npx playwright test

# 開啟 UI 模式 (推薦用於除錯)
npx playwright test --ui

# 產出 HTML 報告
npx playwright show-report
```

### 測試場景 (Scenarios)

1. **Main Flow (`main-flow.spec.js`)**: 
   - 驗證 Dashboard 標題與 Tabs (作品/作者/組織) 是否正確顯示。
2. **Reader Flow (`reader-flow.spec.js`)**:
   - 驗證從首頁進入閱讀器的流程。
   - 驗證閱讀器 Header 與 Back Button 的可訪問性與功能。
   - 使用 Mock API 模擬後端回傳，不依賴真實資料庫。
3. **Gallery Flow (`gallery-flow.spec.js`)**:
   - 驗證公開藝廊的搜尋功能。
   - 驗證 "找不到劇本" 的空狀態顯示。

## 4. 撰寫測試守則

1. **優先使用 Accessible Selectors**: 
   - 推薦: `getByRole('button', { name: '返回' })`, `getByPlaceholder('搜尋...')`
   - 避免: `locator('.div > .span')` (除非無其他選擇)
2. **Mock External IO**: 
   - E2E 測試中應 Mock Backend API (`page.route`) 以確保測試穩定性與速度。
3. **Testing Edge Cases**:
   - 在 Core Logic 測試中應包含邊界條件 (如空字串、重疊區間、特殊字元)。
