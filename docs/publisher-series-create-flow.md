# Publisher Series Create Flow

Last updated: 2026-06-17

## 目的

發布工作室的「建立系列」不應只是把 `SeriesMetadataForm` 換成 create mode。

系列在產品中已經是一等內容單位：公開首頁會聚合系列，系列頁是章節索引，reader 有章節導覽。因此作者建立系列時，系統應清楚引導他完成三件事：

- 建立最小可保存的系列 identity。
- 理解建立後才能加入章節、排序、預覽公開頁。
- 看見目前草稿距離「可公開展示」還缺什麼。

這份文件定義 create mode 的長期 UI/UX 與架構方向。它補充 `docs/publisher-series-editor-architecture.md`，不取代該文件。

## 現況評估

目前 create mode 的資料流是合理的：

- `PublisherSeriesTab` 以 `selectedSeriesId === ""` 判斷 create mode。
- `SeriesMetadataForm` 同時服務 create/edit mode，避免重複表單邏輯。
- `usePublisherSeriesEditor` 持有 `seriesDraft`、`isDirty`、`handleCreateSeries()`。
- create mode 的 dirty guard 已保護名稱、摘要、封面 URL、封面 crop。
- 建立成功後會把新系列放進 `seriesList`，並 `setSelectedSeriesId(created.id)` 進入 edit mode。

目前主要不足是 UI 表達：

- create mode 看起來像一般 metadata form，缺少「新系列草稿」狀態感。
- 表單沒有明確說明「建立後才能加入章節」。
- 建立前沒有 draft preview，作者無法快速確認封面、名稱、摘要的公開展示感。
- `SeriesOverviewPanel`、`SeriesChapterManager`、`SeriesPublicPreview` 都只在 selected series 存在後出現，邏輯正確，但 create mode 缺少替代導引。

結論：目前不是錯誤設計，也不是短期補丁；它是可用的第一版。下一步應補 create-specific UX，而不是重寫 series editor 架構。

## 長期原則

### 1. Create and edit share the same data model

建立與編輯都使用同一個 `seriesDraft` shape：

```ts
{
  name: string;
  summary: string;
  coverUrl: string;
  coverCrop: { cx?: number; cy?: number; zoom?: number } | null;
}
```

不要為 create mode 建另一套 draft model。差異應存在於 UI shell 與 action semantics，不應存在於 metadata fields。

### 2. Create mode is an onboarding surface, not a full workspace

create mode 不能顯示章節管理或正式公開預覽，因為 series 尚未有 id，章節 attach/reorder 也沒有穩定 target。

但它應顯示：

- 新系列草稿狀態。
- 建立後可做什麼。
- 草稿封面/名稱/摘要 preview。
- 建立按鈕與必要條件。

### 3. Public preview must not fake a persisted URL

create mode 可以預覽卡片外觀，但不能暗示公開 URL 已存在。若顯示 URL，必須明確標示：

- `建立後網址`
- `儲存後可公開`
- `建立後即可加入作品`

不要讓作者以為 draft name 已經建立 `/series/[name]`。

### 4. Guard unsaved draft consistently

create mode dirty protection 必須和 edit mode 一致：

- 點左側既有系列時，要確認是否捨棄草稿。
- 點「新增系列」重置草稿時，也要確認。
- cover crop 是 draft 的一部分，必須納入 dirty 判斷。

這部分目前已完成，後續 UI 調整不得繞過它。

## 目標架構

```txt
usePublisherSeriesEditor
  seriesDraft
  selectedSeriesId
  isDirty
  handleCreateSeries()
        ↓
PublisherSeriesTab
  if selectedSeriesId:
    SeriesWorkspace
      SeriesOverviewPanel
      SeriesMetadataForm
      SeriesChapterManager
      SeriesPublicPreview
      SeriesDangerZone
  else:
    SeriesCreateWorkspace
      SeriesCreateGuide
      SeriesMetadataForm
      SeriesDraftPreview
```

### Components

#### `SeriesCreateWorkspace`

Create-mode assembly component. It should be thin and only compose create-specific sections.

Props:

```ts
interface SeriesCreateWorkspaceProps {
  seriesDraft: SeriesDraft;
  setSeriesDraft: React.Dispatch<React.SetStateAction<SeriesDraft>>;
  isSaving: boolean;
  onCreateSeries: () => void;
}
```

Responsibilities:

- Render create guide.
- Render metadata form in create mode.
- Render draft preview.
- Avoid chapter manager, public URL actions, danger zone.

#### `SeriesCreateGuide`

Small static guide explaining the flow.

Content should be short:

- `先建立系列`
- `建立後即可加入作品並排序章節`
- `摘要與封面可稍後補齊`

Do not turn this into a marketing card. It is an operational helper inside a dashboard.

#### `SeriesDraftPreview`

Lightweight visual preview of draft metadata.

It may show:

- Cover thumbnail or placeholder.
- Draft name.
- Draft summary.
- Readiness badge: `草稿`.

It must not show:

- Real public page button.
- Real chapter count beyond `0`.
- `SeriesPublicPreview`, because that component represents persisted series state.

## UIUX Shape

### Create Mode Layout

Recommended order:

1. `SeriesCreateGuide`
2. `SeriesMetadataForm`
3. `SeriesDraftPreview`

This keeps the main action near the metadata fields while still giving the author context before and feedback after.

### Copy

Suggested text:

- Header title: `建立系列`
- Header description: `先建立系列基本資料，建立後可加入作品、排序章節並預覽公開頁。`
- Guide title: `新系列草稿`
- Guide body: `建立後會進入系列工作區，可加入既有作品並調整章節順序。摘要與封面可稍後補齊。`
- Preview label: `草稿預覽`
- URL helper: `建立後會產生系列公開頁。`

### Buttons

Primary action remains:

- `建立系列`

Button disabled state remains:

- disabled when `isSaving`
- disabled when `!seriesDraft.name.trim()`

Do not require summary or cover to create. Those are readiness concerns, not creation blockers.

## 不建議做法

- 不要為 create mode 複製一套 metadata form。
- 不要在 create mode 顯示正式 `SeriesPublicPreview`。
- 不要在 create mode 顯示「查看公開頁」按鈕。
- 不要把 attach/reorder 能力放到尚未建立的 series draft。
- 不要用 modal wizard 取代目前 workspace，除非整個 publisher dashboard navigation 重新設計。
- 不要把 create mode dirty guard 寫進 `SeriesListPane` 以外的新入口；應沿用既有 `isDirty` 與 pending action flow。

## 分期執行

### Phase 1: Create Mode Guide

Scope:

- 新增 `SeriesCreateGuide.tsx`。
- 在 `PublisherSeriesTab` create mode 下顯示 guide。
- 更新 header description，使它明確說明「建立後可加入作品」。

Completion standard:

- 作者能理解目前是在建立草稿。
- 作者知道章節管理會在建立後出現。
- 無資料模型變更。

### Phase 2: Draft Preview

Scope:

- 新增 `SeriesDraftPreview.tsx`。
- 使用 `getMediaCropStyle()` 和 `CoverPlaceholder`。
- 顯示 name、summary、cover preview、`草稿` badge。

Completion standard:

- preview 不依賴 persisted series id。
- preview 不顯示正式公開頁 link。
- cover crop 和 metadata form 一致。

### Phase 3: Create Workspace Split

Scope:

- 新增 `SeriesCreateWorkspace.tsx`。
- `PublisherSeriesTab` 中將 selected/create branches 拆清楚。
- `SeriesMetadataForm` 保持共享。

Completion standard:

- `PublisherSeriesTab` 不直接塞 create-specific UI。
- create/edit layout 邊界清楚。
- tests 覆蓋 create mode guide、draft preview、create button disabled/enabled。

### Phase 4: Documentation and QA

Scope:

- 更新 `publisher-series-editor-architecture.md` 的 Current UI Details。
- Browser QA create flow:
  - empty create mode
  - fill name/summary/cover
  - dirty guard when switching
  - create success enters edit workspace

Completion standard:

- create mode 文件與實作一致。
- 沒有假公開 URL。
- 建立成功後章節管理與公開預覽出現。

## Definition of Done

- [x] Create mode 有明確 guide，說明建立後才能加入章節。
- [x] Create mode 有 draft preview，但不假裝已存在公開頁。
- [x] `SeriesMetadataForm` 仍被 create/edit 共用。
- [x] `PublisherSeriesTab` 的 create/edit branch 清楚。
- [x] create mode dirty guard 覆蓋 metadata 與 cover crop。
- [x] 建立成功後進入 edit workspace。
- [x] tests 覆蓋 create guide、draft preview、dirty guard、create success transition。
  - create guide / draft preview / button states：`SeriesCreateWorkspace.test.tsx`
  - dirty guard：`SeriesListPane.test.tsx`
  - create success → selectedSeriesId 更新：`usePublisherSeriesEditor.test.ts`（hook 層覆蓋）

