# Public Series Aggregation Plan

Last updated: 2026-06-16 (Phase 1-5 complete)

## 目的

公開頁需要把同一系列的作品整合成一個可理解的閱讀入口：

- 首頁 gallery 中，同系列作品只顯示成一張「系列卡片」。
- 進入系列頁後，再顯示章節列表，讓讀者選擇章節閱讀。
- 單篇 script 的儲存方式不改變，每篇仍然是獨立作品。
- 更新提示由同系列 scripts 的排序與更新時間推導，不手動維護另一份內容。

這是一個公開展示模型與閱讀導覽的調整，不是儲存層重構。

## 不變的資料邊界

### `Script` 仍是內容最小單位

每一篇 script 繼續獨立存在：

- `id`
- `title`
- `content`
- `coverUrl` / `coverDesign`
- `author`
- `organization`
- `tags`
- `series.name` / `seriesName`
- `seriesOrder`
- `updatedAt` / `lastModified`
- views / likes
- license / consent / age policy

不要把同系列內容寫回同一篇 script。這會破壞單章分享、單章 SEO、單章統計、授權、更新時間與閱讀進度。

### `Series` 是公開展示聚合

Series 不應成為另一份內容副本。它應該由 scripts 推導：

```ts
interface PublicSeriesGroup {
  type: "series";
  key: string;
  name: string;
  scripts: PublicScript[];
  leadScript: PublicScript;
  latestScript: PublicScript;
  updatedAt: number | string | null;
  coverUrl?: string;
  summary?: string;
}
```

可選的 series metadata 可以來自現有 `script.series` 欄位，例如 `summary`、`coverUrl`、`coverCrop`。如果多篇 script 都帶有 series metadata，應用穩定規則選取：

1. 優先使用有 `series.coverUrl` 或 `series.summary` 的 script。
2. 其次使用 `seriesOrder` 最小的 script。
3. 最後使用最新更新的 script。

## 目標公開頁模型

目前 gallery 直接渲染 scripts。目標是先把 scripts 轉成公開入口：

```ts
type PublicGalleryEntry =
  | {
      type: "script";
      script: PublicScript;
    }
  | PublicSeriesGroup;
```

規則：

- 有有效 `series.name` / `seriesName` 的 script 聚合成 `type: "series"`。
- 沒有 series 的 script 保持 `type: "script"`。
- 同一系列在首頁只出現一次。
- 系列卡片連到 `/series/[name]`。
- 單篇卡片連到 `/read/[id]`。

這個模型應該放在 shared pure model 層，而不是 page component 裡臨時計算。

建議位置：

- `packages/public-ui/src/gallery/seriesModel.ts`
- 或併入現有 `packages/public-ui/src/gallery/homepageModel.ts`

如果 Next 和 Vite 都會使用，放在 `@write/public-ui`。如果只有 Next public 先用，仍建議保持 pure function，避免日後搬移成本。

## 首頁行為

### 系列卡片

系列卡片應該表達「這是一組作品」，不是假裝成單篇 script。

必要資訊：

- 系列名稱
- 章節數
- 最新章節標題
- 最新更新時間
- 系列封面或 lead script 封面
- 作者或組織，若同系列一致
- R-18 / consent policy 的聚合提示，若系列中任一章需要提示

建議路由：

```txt
/series/[name]
```

不要讓系列卡片直接進入任一章，除非卡片有明確的 secondary action，例如「最新章節」。

### 單篇卡片

沒有 series 的 script 照現有方式顯示，不需要新增概念。

## 系列頁行為

`/series/[name]` 是章節索引與系列閱讀入口。

必要內容：

- 系列標題
- 系列簡介
- 系列封面
- 章節列表
- 每章標題
- 每章排序
- 每章更新時間
- 最新章節標示
- 點擊章節進 `/read/[id]`

排序規則：

1. 有效 `seriesOrder` 由小到大。
2. 沒有 `seriesOrder` 的章節排在最後。
3. 同 order 或缺 order 時，用 `updatedAt` / `lastModified` 由新到舊。

特殊 order：

- `seriesOrder === 0` 可視為「設定 / 背景 / 前傳資料」。
- UI 文案應該明確，不要顯示「第 0 章」。

## Reader 章節導覽

`/read/[id]` 仍是單章 canonical reader。

當目前 script 屬於系列時，reader 應顯示系列上下文：

- 返回系列
- 上一章
- 下一章
- 目前章節位置
- 最新章節提示

Reader 不應在初期把所有章節內容一次載入。先做章節導覽，避免影響首次閱讀性能、SEO 輸出與 consent flow。

## 更新提示

更新提示不要手動維護，應由 series group 推導。

### 未登入訪客

可用 `localStorage` 記錄每個系列的最後閱讀狀態：

```ts
interface LocalSeriesProgress {
  seriesKey: string;
  lastReadScriptId: string;
  lastReadAt: string;
  latestSeenScriptId?: string;
  latestSeenUpdatedAt?: string;
}
```

當 `latestScript.id !== latestSeenScriptId`，或 `latestScript.updatedAt > latestSeenUpdatedAt` 時，顯示「有新章節」。

### 登入使用者

後端進度可以延後實作。初期先用 localStorage，不阻塞公開頁聚合。

若之後要同步跨裝置，再新增 backend progress API。不要為了首頁聚合先改資料儲存模型。

## SEO 策略

保留單章 SEO：

- `/read/[id]` canonical 不變。
- 每章仍有自己的 title、description、CreativeWork JSON-LD。
- sitemap 保留單章 URL。

新增或強化系列 SEO：

- `/series/[name]` 作為 series index canonical。
- JSON-LD 使用 `CreativeWorkSeries` 或 `CollectionPage`。
- `hasPart` 列出章節 URL。
- sitemap 加入 series URL。

首頁 gallery 聚合不應犧牲章節可索引性。首頁是 discovery surface，章節頁才是可閱讀內容頁。

## Consent 與 R-18 聚合規則

系列卡片需要顯示保守聚合狀態：

- 只要任一章需要 age gate，系列卡片顯示 R-18 或 age indicator。
- 只要任一章需要 terms consent，進入該章仍由 `/read/[id]` 的 ConsentGate 決定。
- 系列頁可以顯示章節級別提示，但不要在 series page 複製 reader consent 邏輯。

這樣可以保持 policy 的單一執行點：真正閱讀內容時由 reader gate 判斷。

## 實作完成紀錄

### Phase 1: Pure Model ✓ Done

已新增 series aggregation pure functions：

- `groupScriptsIntoGalleryEntries()` groups scripts by normalized series name.
- `deriveSeriesChapterOrder()` produces deterministic chapter ordering.
- `deriveAggregateAgeGate()` conservatively aggregates R-18 indicators.
- `findSeriesGroupByName()` resolves a series group by display name.
- `toChapterNavModel()` derives reader navigation data from a `PublicSeriesGroup`.
- `getSeriesTimestamp()` centralizes timestamp comparison and accepts numeric and ISO string timestamps.

Owner:

- `packages/public-ui/src/gallery/seriesModel.ts`
- `packages/public-ui/src/__tests__/seriesModel.test.ts`

Covered behavior:

- Same-series scripts produce one `type: "series"` entry.
- No-series scripts remain `type: "script"` entries.
- `seriesOrder` sorts chapters ascending; missing order goes last.
- Ties and missing order fall back to updated timestamp descending.
- Lead/latest scripts are derived by model rules, not component logic.
- Any adult chapter makes the aggregate series entry show age-gate state.
- `ChapterNavModel` exposes `latestScriptUpdatedAt`, so reader progress does not reimplement timestamp inference.

### Phase 2: Homepage Rendering ✓ Done

Homepage lanes now consume `PublicGalleryEntry[]` instead of raw per-chapter scripts.

Owner:

- `packages/public-ui/src/gallery/homepageModel.ts`
- `apps/public/app/gallery/GalleryScriptResults.tsx`
- `packages/public-ui/src/ScriptGalleryCard.tsx`
- `packages/public-ui/src/SeriesGalleryCard.tsx`

Completed behavior:

- Latest/top viewed lanes collapse same-series chapters before slicing, so one series counts as one card.
- Series entries render through `SeriesGalleryCard`.
- Script entries continue rendering through `ScriptGalleryCard`.
- Series cards link to `/series/[name]`.
- Search and filters still operate on enriched script data before the grouped display model is built.
- Card DOM remains semantic: `<article>` root, links/buttons as independent interactive elements, no nested anchors.

Tests:

- `packages/public-ui/src/__tests__/homepageModel.test.ts`
- `packages/public-ui/src/__tests__/SeriesGalleryCard.test.tsx`

### Phase 3: Series Page ✓ Done

`/series/[name]` now uses the shared series model instead of hand-rolled filter/sort logic.

Owner:

- `apps/public/app/series/[name]/page.tsx`
- `apps/public/app/series/[name]/SeriesPageClient.tsx`
- `packages/public-ui/src/gallery/seriesModel.ts`

Completed behavior:

- Series metadata is derived from `PublicSeriesGroup`.
- Chapter list order comes from `deriveSeriesChapterOrder()`.
- Latest chapter information comes from `latestScript` / `updatedAt`.
- Series page no longer owns a duplicate storage or sorting model.

### Phase 4: Reader Chapter Navigation ✓ Done

`/read/[id]` now shows series context when the current script belongs to a series.

Owner:

- `apps/public/app/read/[id]/useSeriesChapterNav.ts`
- `apps/public/app/read/[id]/SeriesChapterNavBar.tsx`
- `apps/public/app/read/[id]/ScriptReaderClient.tsx`
- `packages/public-ui/src/gallery/seriesModel.ts`

Completed behavior:

- Fetches public bundle through the same-origin BFF route (`/api/public-bundle`), not `NEXT_PUBLIC_API_URL`.
- Uses `enrichScript()`, `groupScriptsIntoGalleryEntries()`, `findSeriesGroupByName()`, and `toChapterNavModel()` as the single derivation path.
- Provides previous / next chapter links.
- Provides back-to-series link.
- Clears stale navigation state while loading a different script.
- Does not load all chapter content into the reader; only navigation metadata is used.

### Phase 5: Reading Progress ✓ Done

Local reading progress is implemented for anonymous public readers.

Owner:

- `packages/public-ui/src/gallery/seriesProgress.ts`
- `packages/public-ui/src/__tests__/seriesProgress.test.ts`
- `apps/public/app/read/[id]/useSeriesProgress.ts`
- `apps/public/app/read/[id]/useSeriesProgress.test.ts`
- `apps/public/app/read/[id]/SeriesChapterNavBar.tsx`

Completed behavior:

- `deriveNewChapterHint()` is a pure model function.
- `buildProgressUpdate()` constructs the local progress record.
- `useSeriesProgress()` handles localStorage read/write lifecycle in the app boundary.
- Stored progress is minimally shape-validated before use.
- New chapter hint is based on latest script id and latest script updated time.
- `markSeen()` writes progress but does not clear the badge during the same visit; the badge clears on the next visit after stored progress catches up.
- `SeriesChapterNavBar` shows `有新章節` when the model reports a new chapter.

後端同步進度仍是後續功能，不是本次公開頁聚合的前置需求。

## 不建議做法

- 不要把多章內容合併存成一篇 script。
- 不要讓首頁同時顯示系列卡片和同系列所有章節，除非是搜尋結果明確展開。
- 不要在 series page 複製 reader consent gate。
- 不要用 UI 層硬判斷系列規則，應該由 pure model 輸出。
- 不要為了更新提示先改後端資料模型。

## 完成標準

這項調整完成時應滿足：

- [x] 首頁同系列只顯示一張系列卡片。
- [x] 單篇無系列作品仍正常顯示。
- [x] 系列頁可選章節。
- [x] 單章 reader URL 與 SEO 不變。
- [x] 最新章節可由資料推導提示。
- [x] 所有系列聚合邏輯有 pure model tests。
- [x] 不需要改變 script 儲存方式。

## 後續非阻塞項

這些項目不阻塞公開頁系列聚合完成，但如果產品需求升級，應以同樣的邊界處理：

- 登入使用者跨裝置 progress sync：新增 backend progress API，不改變目前 `Script` 作為內容最小單位的模型。
- Series SEO 強化：在 `/series/[name]` 補 `CreativeWorkSeries` / `CollectionPage` JSON-LD 與 `hasPart`。
- Sitemap series URL：若 sitemap 目前只列單章，補 series canonical URL。
- Reader 章節導覽 browser QA：桌面 / 手機 / light / dark 都應補正式驗收紀錄。
