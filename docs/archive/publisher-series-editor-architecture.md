# Publisher Series Editor Architecture

Last updated: 2026-06-17

## 目的

發布工作室的系列編輯必須跟公開頁的系列閱讀模型一致。

公開頁已經把 series 當成一等公民：

- 首頁把同系列作品聚合成一張 series card。
- `/series/[name]` 是章節索引。
- `/read/[id]` 顯示上一章 / 下一章 / 返回系列。
- localStorage progress 會提示「有新章節」。

因此發布工作室不能只提供簡單 metadata form。它必須成為作者管理系列閱讀順序、公開狀態與章節品質的入口。

## Current Implementation Status

| Area | Status | Notes |
|---|---|---|
| Shared series semantics | Done | Publisher uses `@write/public-ui` sorting via `deriveSeriesChapterOrder()` through `deriveChapterRows()`. |
| Editor model | Done | `src/lib/publisher/seriesEditorModel.ts` owns normalized rows, conflict detection, readiness, preview group, update builders, and mutation plans. |
| `PublisherSeriesTab` assembly | Done | Tab is now a layout/wiring component. It delegates list, metadata, chapter management, and preview. |
| `SeriesListPane` | Done | Selection, create-entry, search, readiness indicator, updated time, and unsaved-change protection complete. Guard covers edit-mode dirty, create-mode draft content, and new-series button. |
| `SeriesMetadataForm` | Done | Owns name, summary, cover URL, media picker, crop-aware preview, create/update/delete actions. |
| `SeriesChapterManager` | Done | Inline order edit, attach unassigned script, detach, duplicate-order warning, missing-order notice, up/down move, and drag reorder via @dnd-kit/sortable all complete. |
| `usePublisherSeriesEditor` | Done | Owns series list, selected series, draft, attach/detach/reorder lifecycle, failure-safe local state updates, and `isDirty` (edit-mode diff + create-mode content check). |
| `SeriesPublicPreview` | Mostly done | Uses `SeriesGalleryCard`, shared preview model, public URL, chapter order preview, and readiness summary. |
| Batch reorder frontend contract | Done | `buildSeriesMutationPlan()` and `handleBatchReorderSeriesScripts()` are implemented and tested. Up/down UI calls it. |
| Batch reorder backend endpoint | Done | `PUT /api/series/{series_id}/scripts/reorder` validates series ownership and every requested script before mutating; tests cover partial-failure atomicity. |

## 原始現況診斷

原始 `src/components/dashboard/publisher/PublisherSeriesTab.tsx` 只具備：

- 系列 metadata CRUD：名稱、摘要、封面、封面 crop。
- 顯示已加入作品。
- 將作品移出系列。

原始不足：

- 章節排序由 `src/pages/PublisherDashboard.tsx` 手寫，沒有使用 `@write/public-ui` 的 series model。
- 章節列表只讀，不能 inline edit `seriesOrder`。
- 不能從既有作品 attach 到系列。
- 沒有重複 order、缺 order、未發布章節、缺封面/摘要等 readiness check。
- 沒有公開頁 preview，作者無法確認讀者看到的 series card / chapter list。
- `PublisherSeriesTab` 同時處理列表、表單、章節區、媒體 picker，責任過重。

這不是 styling 問題，而是後台 editor model 尚未系統化。Phase 1-5 已大幅修正這個問題；剩餘工作集中在 list UX、drag/up-down reorder、danger zone、以及把 batch reorder UI 接到已完成的後端 endpoint。

## 已確認前提

### 1. 後台 script 資料格式

`src/types/api.ts` 的 `BaseScriptApi` 已有結構化欄位：

```ts
seriesId?: string | null;
seriesOrder?: number | null;
series?: ScriptSeriesLike;
updatedAt?: number | string;
lastModified?: number;
```

`PublisherSeriesTab` 目前接到的 `SeriesScriptItem.seriesOrder` 是 `string | number`，但來源仍是 `BaseScriptApi.seriesOrder`。後台 editor model 應在邊界處 normalize 成 `number | null`，不要讓 UI component 自己反覆 `Number(...)`。

### 2. 現有 API 能力

現有 client API：

- `createSeries(payload)`
- `updateSeries(seriesId, payload)`
- `deleteSeries(seriesId)`
- `updateScript(scriptId, updates)`

`updateScript()` 已可用於：

- attach：`{ seriesId, seriesOrder }`
- detach：`{ seriesId: null, seriesOrder: null }`
- reorder：`{ seriesOrder }`

目前單筆 `updateScript()` 已支援 attach / detach / inline reorder。前端也已加入 batch reorder client contract，後端 batch endpoint 也已完成。拖曳或上移/下移 UI 接上 batch endpoint 前，必須維持「一次送出 mutation plan、後端先驗證全部再寫入」這個 contract。

### 3. `@write/public-ui` 可被 Vite 主 app import

root `package.json` 已將 `@write/public-ui` 作為 workspace dependency；Vite app 已有多個 adapter 直接引用：

- `src/components/gallery/ScriptGalleryCard.tsx`
- `src/components/ui/CoverRenderer.tsx`
- `src/components/reader/RelatedSeriesSection.tsx`

因此 publisher 可以引用 `@write/public-ui` 的 pure model。這是正確方向，因為排序與 series 聚合語意必須跟公開頁共用。

## 長期資料邊界

### `@write/public-ui` owns public series semantics

公開閱讀模型的排序與聚合語意由 `@write/public-ui` 擁有：

- `deriveSeriesChapterOrder()`
- `groupScriptsIntoGalleryEntries()`
- `findSeriesGroupByName()`
- `toChapterNavModel()`
- `getSeriesTimestamp()`

發布工作室不得另寫一套 chapter sorting。

### Publisher owns authoring state

發布工作室可以有自己的 editor model，但它只能處理 authoring-specific concerns：

- draft state
- dirty state
- editable order values
- order conflicts
- attach/detach candidates
- readiness checks
- save intents

它不應重新定義公開頁排序、series card 選圖、latest chapter 推導。

## 目標架構

```txt
BaseScriptApi[] + SeriesLike[]
        ↓
@write/public-ui series model
  deriveSeriesChapterOrder()
  getSeriesTimestamp()
        ↓
src/lib/publisher/seriesEditorModel.ts   ← Phase 1
  buildSeriesEditorModel()
  deriveChapterRows()
  detectOrderConflicts()
  getSeriesReadiness()
  buildAttachScriptUpdate()
  buildDetachScriptUpdate()
  buildReorderScriptUpdate()
        ↓
usePublisherSeriesEditor()               ← Phase 3
  selected series
  draft
  chapter edits
  attach/detach/reorder lifecycle
  buildSeriesMutationPlan()
        ↓
PublisherSeriesTab
  SeriesListPane
  SeriesMetadataForm
  SeriesChapterManager
  SeriesPublicPreview
  SeriesDangerZone
```

## UIUX 目標

### 左側：Series List

每個系列列表項至少顯示：

- 系列名稱
- 作品數
- 最近更新時間
- readiness indicator：缺摘要、缺封面、章節未排序、重複順序

需要支援：

- 搜尋系列
- 建立新系列
- 切換 selected series 時保護未儲存變更

### 右側：Series Workspace

#### Overview

顯示：

- 封面
- 名稱
- 摘要
- 章節數
- 最新章節
- 公開 URL `/series/[name]`
- 查看公開頁按鈕

#### Metadata

維持現有欄位，但需更嚴謹：

- 名稱必填
- 摘要建議填寫
- 封面建議填寫
- 封面 preview 使用 shared cover/crop helper

#### Chapters

這是核心，不應只是附屬列表。

每列章節顯示：

- 章節標題
- `seriesOrder` inline input
- 狀態：published / ready / needs_work / private
- 最近更新時間
- 公開頁連結
- 移出系列

操作：

- inline edit order
- 上移 / 下移
- attach existing script
- detach script
- 顯示重複 order warning
- 顯示缺 order warning
- `seriesOrder === 0` 顯示為「設定/背景」，不是「第 0 作」

#### Public Preview

預覽應接近公開頁，不要另寫假 UI：

- series card preview 使用 `SeriesGalleryCard`
- chapter order 使用 `deriveSeriesChapterOrder()`
- age gate / latest chapter / chapter count 由 model 推導

#### Danger Zone

集中危險操作：

- 刪除系列
- 解除所有作品

危險操作必須明確說明影響：

- 刪除系列不刪作品。
- 解除系列會清空 script 的 `seriesId` / `seriesOrder`。

## Current UI Details

### Done

- `PublisherSeriesTab` is now an assembly layer.
- `SeriesListPane` owns the left series list and create-entry button.
- `SeriesMetadataForm` owns metadata fields, media picker state, cover crop preview, and create/update/delete action buttons.
- `SeriesChapterManager` owns chapter warnings, inline order editing, attach unassigned script, detach script, and local order input validation.
- `SeriesPublicPreview` shows:
  - readiness checklist
  - public series URL
  - `SeriesGalleryCard` preview
  - chapter order preview
- Invalid order input is rejected through `normalizeEditableSeriesOrder()` and does not dispatch mutations.
- Duplicate order and missing order states are visible.
- Attach only allows scripts with no existing `seriesId`; cross-series move is intentionally not part of the first UI flow.

### Done (recent)

- `SeriesDangerZone` extracted; delete series no longer lives in metadata form actions.
- `SeriesListPane` now shows search input, readiness badge (`可公開` / `待補齊` / `空系列`), and last-updated relative time per series.
- `SeriesEditorData.updatedAt` added so list can display recency.
- `SeriesOverviewPanel` added at top of selected series workspace: cover thumbnail, name, summary, chapter count, latest chapter, public URL + open button.
- `SeriesAttachScriptDialog` extracted: replaces inline `<select>` with a searchable dialog; `SeriesChapterManager` renders a trigger button that opens it.

## 執行分期

### Phase 1: Model Alignment and Minimal Authoring Upgrade ✓ Done

高價值、低風險，先消除後台與公開頁語意分叉。

Scope:

1. 建 `src/lib/publisher/seriesEditorModel.ts`。
2. 後台章節列表改用 `@write/public-ui` 的 `deriveSeriesChapterOrder()`。
3. `SeriesScriptItem.seriesOrder` 在 model 邊界 normalize，不在 JSX 裡 `Number(...)`。
4. 顯示重複 order / 缺 order warning。
5. 增加 inline `seriesOrder` edit。
6. 增加 attach existing script 到 selected series。
7. API 層先使用現有 `updateScript()`。

Required pure functions:

```ts
buildSeriesEditorModel(input): SeriesEditorModel
deriveSeriesChapterRows(scripts): SeriesChapterRow[]
detectSeriesOrderConflicts(rows): SeriesOrderConflict[]
getSeriesReadiness(model): SeriesReadiness
buildAttachScriptUpdate(scriptId, seriesId, order)
buildDetachScriptUpdate(scriptId)
buildReorderScriptUpdate(scriptId, order)
```

Completion standard:

- 後台章節順序與公開頁一致。
- 重複 order 可見。
- 缺 order 可見。
- 作者可以直接調整章節順序。
- 作者可以把現有作品加入系列。
- model tests 覆蓋排序、conflict、attach/detach/reorder payload。

Completed:

- `src/lib/publisher/seriesEditorModel.ts`
- `src/lib/publisher/seriesEditorModel.test.ts`
- `deriveChapterRows()` uses `@write/public-ui` chapter ordering semantics.
- `detectOrderConflicts()` and `getSeriesReadiness()` are pure.
- Mutation builders are pure and tested.
- `normalizeEditableSeriesOrder()` validates editable order inputs.
- Inline order edit, attach, detach, missing-order notice, and duplicate-order warning are implemented.

### Phase 2: Component Decomposition ✓ Mostly Done

把 `PublisherSeriesTab` 從大型 component 拆成可維護的 workspace。

Implemented components:

- `SeriesListPane`
- `SeriesMetadataForm`
- `SeriesChapterManager`
- `SeriesPublicPreview`

Not yet implemented as separate components:

- `SeriesOverviewPanel`
- `SeriesAttachScriptDialog`
- `SeriesDangerZone`

Completion standard:

- `PublisherSeriesTab` 只做 layout assembly。
- 沒有 component 直接重做 series sorting。
- chapter manager 可以獨立測試。

Completion status:

- `PublisherSeriesTab` is layout assembly.
- `SeriesChapterManager` is separately testable through `PublisherSeriesTab.test.tsx`.
- No component owns chapter sorting.

Remaining:

- Split direct tests for `SeriesChapterManager` if it gains drag/up-down controls.
- Add list search and readiness metadata to `SeriesListPane`.

### Phase 3: `usePublisherSeriesEditor` ✓ Done

把 selected series、draft、chapter edits、pending operations、save lifecycle 從 dashboard state 中抽出。

Responsibilities:

- selected series id
- draft hydration
- dirty tracking
- attach/detach/reorder commands
- optimistic update and rollback
- toast/error state

Completion standard:

- `usePublisherDashboardState` 不再持有 series editor 細節。
- series action tests 不需要 mount dashboard。
- failed mutation 不會讓 local state 永久漂移。

Completed:

- `src/hooks/publisher/usePublisherSeriesEditor.ts`
- `src/hooks/publisher/usePublisherSeriesEditor.test.ts`
- Hook owns series editor state and mutation lifecycle.
- API failures do not mutate local script state.
- `selectedSeriesScripts` and `attachableScripts` are derived by the hook.

### Phase 4: Public Preview and Readiness ✓ Mostly Done

讓作者在發布前看到公開頁效果。

Scope:

- series card preview
- chapter list preview
- readiness summary
- public URL
- missing metadata warnings

Completion standard:

- preview 使用 shared public-ui components/model。
- readiness is model-derived, not scattered strings.
- 作者能明確知道系列是否已適合公開展示。

Completed:

- `SeriesPublicPreview` renders readiness summary, public URL, public-ui series card preview, and chapter order preview.
- `buildPreviewSeriesGroup()` returns `PublicSeriesGroup | null`, so empty chapter state does not fake an invalid group.
- Readiness is derived through `getSeriesReadiness()`.

Remaining:

- Dedicated `SeriesOverviewPanel`.
- More explicit missing metadata affordances in list/overview.
- Browser QA after drag/up-down reorder UI is added.

### Phase 5: Batch Reorder API ✓ Frontend and Backend Done, UI Pending

如果 series chapter 數量上升，新增後端 batch endpoint。

Desired API:

```txt
PUT /series/:seriesId/scripts/reorder
```

Payload:

```ts
{
  items: Array<{
    scriptId: string;
    seriesOrder: number | null;
  }>;
}
```

Frontend completed:

- `SeriesReorderItem` type.
- `reorderSeriesScripts(seriesId, items)` API client.
- `buildSeriesMutationPlan()` emits only changed rows.
- `handleBatchReorderSeriesScripts()` calls the batch endpoint and updates local state only for items actually sent to backend.

Backend completed:

- `PUT /api/series/{series_id}/scripts/reorder`
- Validates series ownership.
- Validates every requested script belongs to the same owner and series before mutating any row.
- Only after validation, updates all `seriesOrder` values and commits.
- Tests cover success, `seriesOrder: null`, series not found, script not in series, cross-user rejection, and partial-failure atomicity.

UI completed:

- Up/down move buttons in `SeriesChapterManager` swap adjacent chapter `seriesOrder` values and call `handleBatchReorderSeriesScripts()`.
- Buttons disabled for first/last chapter, missing-order chapters, and when handler is absent.
- UI tests cover swap payload, first/last disabled, missing-order neighbour disabled.

UI remaining:

- Drag reorder UI (up/down already done).

## 不建議做法

- 不要只在 `PublisherSeriesTab.tsx` 裡加 input 和更多 `Number(...)`。
- 不要讓後台使用自己的排序規則。
- 不要把 public series model 複製進 `src/`。
- 不要在 UI component 裡直接推導 readiness。
- 不要為了 attach/reorder 先改 script 儲存模型。
- 不要把 batch reorder 當 Phase 1 前置需求。

## Definition of Done

Series editor 可視為完成時，必須滿足：

- [x] 後台章節順序與公開頁、series page、reader chapter nav 完全一致。
- [x] 作者可以在 series tab 完成 attach、detach、inline reorder。
- [x] 重複 order、缺 order 有明確提示。
- [x] Series editor model 有 pure unit tests。
- [x] `PublisherSeriesTab` 是組裝層，不是全部邏輯所在地。
- [x] public preview 使用 shared public-ui model/components。
- [x] 沒有新增與 public series aggregation 分叉的邏輯。
- [x] Series list 顯示 search、readiness indicator、last updated。
- [x] `SeriesOverviewPanel` 獨立化，顯示封面、名稱、摘要、章節數、最新章節、公開 URL。
- [x] 切換 selected series 時保護未儲存變更（含 create mode 草稿與新增系列按鈕）。
- [x] `SeriesDangerZone` 獨立化。
- [x] 上移/下移 UI 完成，接上 batch reorder endpoint。
- [x] Drag reorder UI（上移/下移已完成，drag-and-drop via @dnd-kit/sortable 完成）。
- [x] Batch reorder backend endpoint 完成先驗證後更新，並有 partial-failure atomicity test。
- [x] Batch reorder UI 接上 batch reorder endpoint（上移/下移）。
- [x] `SeriesAttachScriptDialog` 獨立化，支援搜尋過濾，取代 inline select。
