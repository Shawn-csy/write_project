# Frontend Architecture & Performance Refactor Plan v2

> Branch: `dev-export`
> Status: ✅ All Tasks Complete
> Last updated: 2026-05-15

---

## 背景

這份文件針對目前前端架構（`App.tsx` orchestration + route split + metadata dialog sliced contexts）定義可落地的效能與可維護性重構計畫。

原則：
- 每個 Task 需可獨立提交
- 預設可獨立執行，只有明確標註 `依賴 Task N` 的項目需要順序
- 每個 Task 都要有「行為不變」與「效能改善」兩種驗證

---

## 現況快照（2026-05-15）

1. `main.tsx` 已是乾淨 Provider 入口（Router / Helmet / Theme / I18n / Auth / Settings / Toast）。
2. `AppRouter.tsx`、`PublicRoutes.tsx`、`WorkspaceRoutes.tsx` 已存在且負責路由拆分與 lazy routes。
3. `App.tsx` 仍承擔跨域 orchestration：`useScriptManager`、navigation 衍生、theme apply、tracking、download options、cloud title update。
4. Metadata Dialog 已做第一層 sliced context（`UI/Status/Checklist/Overlay/Form`），但 `ScriptMetadataDialogBody` 仍為大型 `useFormContext()` consumer，導致切片收益受限。
5. `useScriptMetadataSave` 與 `useScriptMetadataJsonPreview` 仍各自組 payload，存在重複與行為漂移風險。

---

## 已完成的修復（本 branch 已 commit）

- `useScriptMetadataSupplementalState`: 17 個 reducer dispatch wrappers 加 `useCallback(fn, [])`
- 三個 reducer（license/series/activity）加 identity bailout（值不變不產生新 state 物件）
- Provider slice 物件（ui/status/checklist/overlay）加 `useMemo`，並移除對 `eslint-disable` 的依賴
- `useScriptMetadataDetailsProps` 回傳物件加 `useMemo`
- `useScriptMetadataHydration` 改為先 fetch full script，再一次性 hydrate state，消除雙重渲染

---

## 已完成 Task（v2 驗證，2026-05-15）

所有 Task 1–5 已在 `dev-export` branch 完成並驗證。

| Task | 說明 | 狀態 |
|------|------|------|
| T1 | AuthContext: login/logout/saveProfile → useCallback([]) | ✅ 完成 |
| T2 | useScriptMetadataJsonPreview: jsonMode/script early-return guard | ✅ 完成 |
| T3 | 抽出 buildScriptPayload 純函式 → src/lib/scriptMetadataPayload.ts | ✅ 完成 |
| T4 | FormContext 拆成 Publication/Content/License/Exposure/Activity domain contexts | ✅ 完成 |
| T5 | App.tsx slim → EditorShell.tsx 承接 orchestration | ✅ 完成 |

---

## 原始待修復清單（v2 優先順序，供參考）

### Task 1 — AuthContext 函式穩定化【極低難度 · 高收益】

**檔案：** `src/contexts/AuthContext.tsx`

**問題：**
`login`、`logout`、`saveProfile` 每次 render 都重建，導致 context value `useMemo` 失效，連帶所有 `useAuth()` consumer 重渲染。

**修法：**
1. `login`、`logout`、`saveProfile` 改為 `useCallback`
2. 在目前實作下可用 `[]` deps
3. 補註解：若未來讀取可變 state / env，需重新檢視 deps

**驗證：**
- `npx tsc --noEmit`
- `npx vitest run src/contexts/AuthContext.test.tsx`

---

### Task 2 — JSON Preview 計算守門【極低難度 · 中收益】

**檔案：** `src/hooks/dashboard/useScriptMetadataJsonPreview.ts`

**問題：**
`jsonMode` 關閉時仍執行 payload 組裝與 `JSON.stringify`。

**修法：**
在 effect 最前面加：
```ts
if (jsonMode !== "true") return;
if (!script) return;
```

**驗證：**
- `npx vitest run src/hooks/dashboard/useScriptMetadataJson.test.ts`
- 手動驗證：JSON 面板關閉時，編輯欄位不應觸發 `setJsonText`

---

### Task 3 — 抽出 Script Metadata Payload 純函式【低難度 · 高維護性收益】

**新檔案：** `src/lib/scriptMetadataPayload.ts`

**目標：**
統一 `save` 與 `json preview` 的 payload 組裝邏輯，避免欄位漂移。

**注意（v2 補強）：**
抽象介面需覆蓋目前真實依賴，不只 form fields，還包括：
- `seriesOptions`（`seriesId -> seriesName` 映射）
- author preserve 邏輯（`preserveAuthorInternalData` + `authorEditedRef` + `workingAuthorMetadataEntries`）
- `normalize/serialize activityDemoLinks`
- 注意：`workingAuthorMetadataEntries` 屬於外部 snapshot（來自 `workingScript.customMetadata`），必須在 hook 先取好後透過 options 傳入純函式，不可在 pure builder 內部自行讀取

**建議介面：**
- `buildCustomMetadataEntries(input, options)`
- `buildJsonPreviewPayload(input)`
- `resolveSeriesName(input)`（可內聚在 helper）

**options 介面最低需求：**
- `preserveAuthor: boolean`
- `existingAuthorEntries: Array<{ key: string; value: string }>`

**驗證：**
- 新增：`src/lib/scriptMetadataPayload.test.ts`
- 保留 integration：
  - `npx vitest run src/hooks/dashboard/useScriptMetadataSave.test.ts`
  - `npx vitest run src/hooks/dashboard/useScriptMetadataJson.test.ts`

---

### Task 4 — Metadata Dialog Domain Context 深化切分【中難度 · 大收益】

> 依賴：Task 3

**問題（v2 定義）：**
目前已經有 `UI/Status/Checklist/Overlay/Form` slice，但 `ScriptMetadataDialogBody` 仍一次讀取大型 `FormContext`，再把大量 props 傳給 section，造成高頻 re-render 擴散。

**目標：**
把 `FormContext` 再拆成 domain contexts，並讓 section component 直接 consume 對應 context。

**建議切分：**
- `PublicationContext`：`status`, `identity`, `selectedOrgId`, `targetAudience`, `contentRating`
- `ContentContext`：`title/synopsis/outline/.../author/date/contact`
- `LicenseContext`：`licenseCommercial/Derivative/Notify/SpecialTerms/copyright`
- `ExposureContext`：`cover/series/tags/markerTheme/showMarkerLegend/disableCopy`
- `ActivityContext`：`activityName/banner/content/demoLinks/workUrl`

**section 對應（修正版）：**
- `ScriptMetadataPublishSection` → `PublicationContext + LicenseContext`
- `ScriptMetadataBasicSection` → `ContentContext + PublicationContext`
- `ScriptMetadataExposureSection` → `ExposureContext + ContentContext`（author fields）
- `ScriptMetadataActivitySection` → `ActivityContext`
- `ScriptMetadataDemoSection` → `ActivityContext`
- `ScriptMetadataAdvancedSection` → `ExposureContext + ContentContext`（聯絡資訊/自訂欄位由 details props 決定）

**驗證：**
- `npx vitest run src/components/dashboard/metadata/`
- React Profiler：編輯 `activityContent` 時，不應觸發 Basic/Publish sections 重渲染

---

### Task 5 — App Orchestration 下沉到 Editor Shell【中難度 · 中收益】

**問題：**
`App.tsx` 目前是全域編排中心，橫跨 reader/editor concern。

**注意（v2 修正）：**
`AppRouter.tsx` 已存在，此 Task 不是新增 router，而是把 `App.tsx` 的 orchestrator 職責下沉。

**目標：**
- `App.tsx` 聚焦：全域容器 + cross-route 設定
- `EditorShell` 聚焦：`useScriptManager`、editor/read mode 導航與 callback、theme apply、tracking、download options

**步驟：**
1. 建立 `src/components/editor/EditorShell.tsx`
2. 將 `App.tsx` 內 editor-specific logic 移入 shell
3. `AppRouter` 改接收 shell 提供的最小必要 props
4. 確保 Public routes 不被 editor state 牽動

**驗證：**
- `npx vitest run src/routes/`
- `npx vitest run src/hooks/useAppNavigation.test.ts`
- 手動 smoke：`/`, `/read/:id`, `/dashboard`, `/edit/:id`

---

## 執行指引

### 給 Codex 的通用原則

1. 每個 Task 獨立 commit，不混改
2. 每個 Task 完成後至少跑：`npx tsc --noEmit && npx vitest run`
3. 不修改測試邏輯（除非為了對齊新抽象而必須調整測試 fixture）
4. 不新增 `eslint-disable`
5. reducer 行為不改，只做搬移/包裝/切分

### 驗證命令

```bash
# 類型檢查
npx tsc --noEmit

# 目標區測試
npx vitest run src/contexts/
npx vitest run src/hooks/dashboard/
npx vitest run src/components/dashboard/metadata/
npx vitest run src/routes/

# 全量測試
npx vitest run
```

---

## 效能驗證標準（新增）

每個標示「高收益」或「大收益」的 Task，PR 需附：

1. **Profiler 對比截圖（Before/After）**
   - 場景 A：Metadata dialog 開啟後，連續輸入 10 次 `activityContent`
   - 場景 B：JSON mode 關閉時，編輯任一 basic 欄位
2. **量化指標**
   - Commit 次數
   - 最長 commit duration
   - 主要 section re-render 次數
3. **行為一致性檢查**
   - Save payload 欄位完整一致
   - JSON preview 欄位不缺漏

---

## 架構原則（供後續開發參考）

1. State 以 domain 分組，不以 setter 型態分組
2. Reducer 處理高耦合批次更新，獨立欄位用 `useState`
3. Reducer case 保持 identity check，避免 cascade re-render
4. Context value 的 `useMemo` deps 僅含該 domain 欄位
5. Payload 組裝是純函式，hook 只負責副作用與流程編排
6. 優先讓 section 直接 consume domain context，避免單一 giant props pipeline
