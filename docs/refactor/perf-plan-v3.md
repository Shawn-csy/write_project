# Frontend Performance Refactor Plan v3

> Branch: `dev-export`
> Status: ✅ All Tasks Complete
> Last updated: 2026-05-15

---

## 背景

架構重構（v2，T1–T5）已全部完成。
本文件針對剩餘效能問題，以實際程式碼閱讀為依據，記錄真實問題與修法。

四大功能流：閱讀器 / 編輯器 / 公開畫廊 / Dashboard+Publisher
最大複雜度集中在：metadata dialog（已重構）、SettingsContext、LiveEditor

原則：
- 每個 Task 獨立提交，行為不可改變
- 驗證：npx tsc --noEmit && npx vitest run

---

## 已確認問題（實際讀檔後）

### 誤判澄清
- `I18nContext.t()` — 已透過 `useMemo([lang, setLang, activeMessages])` 包裝，lang 不變時穩定 ✅
- `usePublicGalleryFiltering` — 所有 useMemo deps 正確，filteredScripts 含排序，結構合理 ✅
- `GalleryScriptsView` 大列表 — 最多 15 筆（slice(0,15)），不需虛擬化 ✅
- `featuredSeries` — `.slice(0, 10)` 已限制，buckets 用 Map，合理 ✅

---

## 修復項目與完成紀錄

---

### 功能歸屬對照

| Task | 功能項目 | 影響範圍 |
|------|----------|----------|
| A — SettingsContext 函式穩定化 | 全域設定基礎層（跨閱讀器/編輯器/畫廊） | 所有 `useSettings()` consumer |
| B — SettingsContext 拆分 | 全域設定基礎層（跨閱讀器/編輯器/畫廊） | Context 架構與高頻 render 隔離 |
| C — Metadata Context 語意邊界深化 | Dashboard（metadata dialog） | 劇本 metadata 編輯流程 |
| D — Gallery 列表渲染優化 | 公開畫廊（Public Gallery） | 首頁精選 lane、腳本卡列表 |
| E — LiveEditor 回調與 effect 收斂 | 編輯器（Live Editor） | 編輯區/預覽區互動與同步 |
| F — EditorShell 再模組化 | 編輯器入口層（Editor Shell） | route orchestration、export、nav |
| G — Reader render-path 計算 memo 化 | 閱讀器（Public Reader） | 讀者頁資訊覆蓋層與排版 |

---

### Task A — SettingsContext 函式穩定化【高優先 · 低難度】

**檔案：** `src/contexts/SettingsContext.tsx`
**功能項目：** 全域設定基礎層（跨閱讀器/編輯器/公開畫廊/Dashboard+Publisher）

**問題（已確認）：**
以下函式每次 render 都重建，導致 `useMemo` deps 缺漏（line 397 加了 `eslint-disable`）：

| 函式 | 行號 | 問題 |
|------|------|------|
| `setAccent` | 113 | `(next) => setAccentRaw(next)` — 多餘 wrapper，可直接用 `setAccentRaw` |
| `setReadingFontFamily` | 121 | inline arrow with normalize，未 useCallback |
| `setUiFontFamily` | 124 | 同上 |
| `setDesktopUiScale` | 132 | inline with clamp logic，未 useCallback |
| `setTransparentBg` | 141 | inline arrow，未 useCallback |
| `setShowLineUnderline` | 145 | 同上 |
| `setHideWhitespace` | 181 | 同上 |
| `fontSteps` | 147 | `[12,14,16,24,36,72]` 每次 render 重建，應移到 module scope |
| `adjustFont` | 148 | 依賴 `fontSteps` 與 `fontSize`，未 useCallback |
| `toggleMarkerVisibility` | 187 | inline，未 useCallback |
| `apiCall` | 210 | inline，每次重建（未入 context，但傳入 theme hook） |

**修法：**
1. `fontSteps` → module-level constant
2. `setAccent` → 直接用 `setAccentRaw`（去掉 wrapper）
3. `setReadingFontFamily`、`setUiFontFamily` → `useCallback([setReadingFontFamilyRaw])` / `useCallback([setUiFontFamilyRaw])`
4. `setDesktopUiScale` → `useCallback([setDesktopUiScaleRaw])`
5. `setTransparentBg`、`setShowLineUnderline`、`setHideWhitespace` → `useCallback` 各自穩定
6. `adjustFont` → `useCallback([fontSize, setFontSize])`（fontSteps 已成 constant，不需入 deps）
7. `toggleMarkerVisibility` → `useCallback([setHiddenMarkerIds])`（用 functional update，deps 穩定）
8. 移除 `eslint-disable-next-line react-hooks/exhaustive-deps`，補齊 useMemo deps

**驗證：**
- `npx tsc --noEmit`
- `npx vitest run src/contexts/`

---

### Task B — SettingsContext 拆分【高優先 · 中難度】

> 依賴 Task A

**檔案：** `src/contexts/SettingsContext.tsx`
**功能項目：** 全域設定基礎層（跨閱讀器/編輯器/公開畫廊/Dashboard+Publisher）

**問題（已確認）：**
單一 context 混合四類 state，改動頻率差異大：

| 分類 | 改動頻率 | 主要 state |
|------|---------|-----------|
| 外觀 | 低（用戶設定後長期不變） | theme/accent/font/lineHeight/transparentBg |
| Marker 主題 | 中（切換主題） | markerThemes/currentThemeId/configs + CRUD |
| Marker 可見性 | 高（Reader 閱讀中頻繁切換） | hiddenMarkerIds/toggleMarkerVisibility |
| Stats 設定 | 極低 | statsConfig |

`hiddenMarkerIds` 每次改動 → 所有 `useSettings()` consumer 重渲染
包含字型、accent、theme 等毫不相關的元件。

**目標切分：**
- `AppearanceContext`：theme/accent/font/lineHeight/desktopUiScale/transparentBg/showLineUnderline/hideWhitespace
- `MarkerThemeContext`：markerThemes/currentThemeId/markerConfigs/systemDefaultConfigs/addTheme/deleteTheme/renameTheme 等
- `MarkerVisibilityContext`：hiddenMarkerIds/setHiddenMarkerIds/toggleMarkerVisibility
- `StatsConfigContext`：statsConfig/setStatsConfig
- 保留 `useSettings()` 作為 aggregate hook，合併所有子 context，**不破壞現有 consumer**

**步驟：**
1. 建立各 sub-context（從 SettingsProvider 抽出對應 state）
2. SettingsProvider 內部 compose 各 sub-provider
3. `useSettings()` 保持存在，內部 merge 各 sub-context
4. 高頻 consumer（Reader marker toggle）可直接用 `useMarkerVisibilityContext()`

**驗證：**
- `npx tsc --noEmit && npx vitest run`
- React Profiler：Reader 切換 marker 可見性 10 次
  - Before：所有 useSettings() consumer 重渲染
  - After：只有 MarkerVisibilityContext consumer 重渲染

---

### Task C — Metadata Context 語意邊界深化【中高優先 · 中難度】

**檔案：**
- `src/components/dashboard/metadata/ScriptMetadataProvider.tsx`（context 物件定義）
- `src/components/dashboard/metadata/ScriptMetadataDialogContext.tsx`（state 邏輯，return 值決定切分邊界）

**功能項目：** Dashboard（metadata dialog）

**問題：**
`ContentContext` 仍偏重（包含 title/synopsis/outline/roleSetting/backgroundInfo/performanceInstruction/openingIntro/chapterSettings + contactFields/customFields + metadataDetailsCommonProps + personas/orgs）。
`ExposureContext` 混入 JSON editor state（jsonMode/jsonText/jsonError/applyJson），與曝光無關。

**建議拆分：**
- `ValidationContext`：requiredErrorMap/recommendedErrorMap/missingRequiredMap/renderRowLabel/getRowLabelClass（目前在 ChecklistContext，但更多 section 用這些做 row-level validation）
- `JsonEditorContext`：jsonMode/setJsonMode/jsonText/setJsonText/jsonError/applyJson（從 ExposureContext 移出）
- `ContentContext` 可再拆 `NarrativeContext`（outline/roleSetting/backgroundInfo/performanceInstruction/openingIntro/chapterSettings）與 `IdentityContext`（personas/orgs/currentUser），但需評估收益

**驗證：**
- `npx vitest run src/components/dashboard/metadata/`
- React Profiler：編輯 jsonText 時，Basic/Exposure sections 不應重渲染

---

### Task D — Gallery 列表渲染優化【中優先 · 低難度】

**檔案：**
- `src/components/gallery/ScriptGalleryCard.tsx`
- `src/components/gallery/HorizontalScrollLane.tsx`
- `src/components/gallery/GalleryScriptsView.tsx`
**功能項目：** 公開畫廊（Public Gallery）

**問題（已確認）：**

**ScriptGalleryCard（無 memo）：**
- line 32：`export function ScriptGalleryCard` — 無 `React.memo`
- 每次 `GalleryScriptsView` 父元件 state 變動（search/filter），所有卡片重渲染
- render 內有 `normalizedTags`、`displayTags`、`licenseTagSet` 等計算，可改 useMemo

**HorizontalScrollLane（無 memo）：**
- line 12：`export function HorizontalScrollLane` — 無 `React.memo`
- line 35：`useEffect([children])` — children 每次都是新陣列，導致 scroll 重新 checkScroll

**GalleryScriptsView（inline callbacks）：**
- line 58：`onClick={() => handleScriptClick(script)}` — 每張卡新 function
- line 72/85/98：`onAction={() => setFeaturedLaneMode("top"/"latest"/"series")}` — 每次重建
- line 101/123：`onClick={() => onNavigateSeries(series.name)}` — 同上

**修法：**
1. `ScriptGalleryCard` 加 `React.memo`（先做這步，讓後續 callback 穩定有意義）
2. 卡片 render 內計算改 `useMemo`（normalizedTags、displayTags、licenseTagSet）
3. `HorizontalScrollLane` 加 `React.memo`
4. `HorizontalScrollLane` 的 `useEffect([children])` → 改用 `ResizeObserver` 或 `useLayoutEffect` + ref，避免 children 參考造成 re-trigger
5. `GalleryScriptsView` inline callbacks 改 `useCallback`（或將 script/name 傳子元件讓子元件呼叫）

**順序：** D1（memo）→ D2（卡片計算 memo）→ D3（callbacks）

**驗證：**
- `npx tsc --noEmit`
- React Profiler：搜尋框輸入時，未篩選到的卡片不應 re-render

---

### Task E — LiveEditor 回調與 effect 收斂【中優先 · 中難度】

**檔案：**
- `src/components/editor/LiveEditor.tsx`
- `src/hooks/editor/useLiveEditorState.ts`
**功能項目：** 編輯器（Live Editor）

**問題（已確認）：**
- `LiveEditor.tsx` 存在多個 inline function props（`onScriptUpdate`、`onToggleRules`、`onTogglePreview` 等）
- `useLiveEditorState.ts` 的 HTML reset effect 依賴 `content/markerConfigs/hiddenMarkerIds`

**處理結果：**
1. `LiveEditor.tsx` inline callbacks 已抽離為穩定 handler
2. `useLiveEditorState.ts` HTML reset effect 已審視，維持現狀（依賴語意正確，不做過度拆分）

**驗證：**
- `npx vitest run src/components/editor/`
- 手動：快速輸入時 preview 不應閃爍

---

### Task F — EditorShell 再模組化【中低優先 · 中難度】

**檔案：** `src/components/editor/EditorShell.tsx`
**功能項目：** 編輯器入口層（Editor Shell）

**問題（已確認）：**
EditorShell 目前承接：
- `useScriptManager`（腳本狀態）
- `useAppNavigation`（路由導航）
- `useReaderScriptActions`（PDF/DOCX/XLSX export）
- theme apply effect（markerTheme 切換）
- page tracking effect
- `handleReturnHome`、`handleCloudTitleUpdate` 需穩定化
- `readerDownloadOptions` array 需避免每次 render 重建
- route 判斷邏輯（isPublicReader/isReaderWorkspaceRoute 等）
- navProps 組裝

**建議拆分：**
- `useEditorShellState` — 腳本 + scriptManager 相關 state
- `useEditorNavigation` — navigation + handleReturnHome + route 判斷 + navProps
- `useReaderExport` — readerDownloadOptions + export handlers（部分已在 `useReaderScriptActions`）

**注意：**
- 本輪已完成效能必要項：`handleReturnHome` 改為 `useCallback`、`readerDownloadOptions` 與 `navProps` 改為 `useMemo`
- hook 拆分（`useEditorShellState` 等）屬於可維護性重構，非本輪效能瓶頸，暫不執行

**驗證：**
- `npx vitest run src/routes/`
- `npx vitest run src/hooks/useAppNavigation.test.ts`
- 手動 smoke：`/`, `/read/:id`, `/dashboard`, `/edit/:id`

---

### Task G — Reader render-path 計算 memo 化【低優先 · 低難度】

**檔案：**
- `src/components/reader/PublicReaderLayout.tsx`
- `src/components/reader/PublicScriptInfoOverlay.tsx`
**功能項目：** 閱讀器（Public Reader）

**問題：**
- `PublicReaderLayout.tsx` line 69：`metaItems.filter(Boolean)` inline
- `PublicReaderLayout.tsx` line 52：`contactLines.map()` inline
- `PublicScriptInfoOverlay.tsx` line 85：`parseMultiTemplate()` JSON parsing 在 render path

**修法：**
- 各計算改 `useMemo([prefaceItems])` / `useMemo([contactData])`

**驗證：**
- `npx vitest run src/components/reader/`

---

## 完成摘要

| Task | 狀態 | 備註 |
|------|------|------|
| A — SettingsContext 函式穩定化 | ✅ | FONT_STEPS module-level, 所有 setter useCallback |
| B — SettingsContext 拆分 | ✅ | AppearanceContext/MarkerThemeContext/MarkerVisibilityContext/StatsConfigContext |
| C — Metadata Context 語意深化 | ✅ | JsonEditorContext 從 ExposureContext 分離；ValidationContext 無 render 隔離效益（與 checklist 同頻），不分 |
| D — Gallery 列表渲染優化 | ✅ | ScriptGalleryCard/HorizontalScrollLane/GalleryScriptsView memo + useCallback; SeriesCard memo; onScriptClick prop |
| E — LiveEditor 回調/effect 收斂 | ✅ | 7 個 inline callback 抽出; HTML reset effect deps 語意正確，無需拆分 |
| F — EditorShell 再模組化 | ✅ | handleReturnHome useCallback; readerDownloadOptions/navProps useMemo; hook 拆分是純架構整理非效能問題，不做 |
| G — Reader render-path memo | ✅ | contactRender/metaItems useMemo; parseMultiTemplate/parseChapterTemplate 提升 module level |

---

## 效率提升估算（本輪大改）

> 以下為基於程式碼路徑與渲染邊界的保守估算；實際數值請以 React Profiler 實測為準。

| 項目 | 主要變更 | 預估改善 |
|------|----------|----------|
| SettingsContext | setter/callback 穩定化 + context 拆分 | `hiddenMarkerIds` 變更時，非 marker 設定 consumer 重渲染可下降約 60%–90% |
| Gallery 列表 | Card/Lane/View 全面 memo + callback 穩定化 | 搜尋/篩選互動時卡片無效重渲染可下降約 40%–75%（資料量越大越明顯） |
| Metadata Dialog | JsonEditorContext 分離 + context 邊界調整 | 編輯 JSON 區塊時，非 JSON sections 重渲染可下降約 30%–60% |
| LiveEditor | inline callback 收斂 | Header/preview 互動造成的次要重渲染可下降約 15%–35% |
| Reader | meta 計算 memo 化 | 連續滾動/切換 UI 時，資訊區計算開銷可下降約 10%–25% |

**整體體感（綜合預估）：**
- 高互動頁（Gallery、Reader、LiveEditor）操作流暢度約提升 **20%–45%**
- 無效重渲染總量約下降 **30%–65%**
- 中大型資料集（多卡片、多 marker）場景收益最高

---

## 驗證指令

```bash
npx tsc --noEmit

npx vitest run src/contexts/
npx vitest run src/components/gallery/
npx vitest run src/components/editor/
npx vitest run src/components/reader/
npx vitest run src/components/dashboard/metadata/

npx vitest run
```

---

## 架構原則補充（v3 新增）

7. inline setter wrapper `(val) => setRaw(transform(val))` → `useCallback([setRaw])`
8. Context 以「改動頻率」分組，不以「功能類別」分組
9. `React.memo` 優先用於列表項元件（先加 memo，再穩定 callbacks）
10. 確認子元件有 memo 後，再穩定化父元件的 callbacks（順序不可反）
11. `eslint-disable react-hooks/exhaustive-deps` 視為技術債標記，修完後移除
