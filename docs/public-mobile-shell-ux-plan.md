# Public Mobile Shell UX Plan

最後更新：2026-07-01（實作更新：2026-07-01）

## 目的

公開頁面的手機版 shell 需要成為一套明確的產品介面，而不是 desktop topbar 的縮小版。這份文件規劃手機版導覽、操作入口、選單 overlay、hero 動畫與驗收方式，目標是讓手機頁面穩定、可操作、不卡版面，且不讓動畫影響首屏效能。

## 已確認問題

| 優先級 | 問題 | 現況 | 影響 |
|---|---|---|---|
| P1 | Mobile nav 展開會改變頁面 flow | `PublicShellTopBar` 直接在 header 下方 render mobile nav drawer | 展開時 hero/content 被往下推，像 layout shift |
| P1 | 手機版進不了工作室 | `PublicShellActions` 的 `StudioLink` 使用 `hidden sm:inline-flex` | 手機使用者找不到 `/dashboard` 入口 |
| P2 | Hero brand 動畫在手機也執行 | `BrandScriptDesk` always mounted；`useHeroBrandAnimation` 只看 reduced motion | 手機首屏成本增加，且動畫資訊價值低 |
| P2 | Topbar overlay 規則不一致 | nav 是 inline drawer，appearance/info 是 popover，filter 是 sheet | 使用者對「展開」行為的預期不穩定 |

## 設計原則

- Mobile overlay 不得改變主文 layout flow。
- 所有手機操作目標至少 44px。
- 工作室入口在任何公開頁手機版都必須可達。
- Hero 的手機版優先資訊閱讀與穩定首屏，不優先裝飾動畫。
- Desktop/tablet 可保留較豐富動效；mobile/coarse pointer 預設靜態。
- Shared `@write/public-ui` primitive 保持 router-neutral；Next app 負責 host-specific actions。

## Phase 1 — Mobile Shell Overlay Contract

### 目標

把 `PublicShellTopBar` 的 mobile nav 從 inline drawer 改為 portal overlay。

### 建議實作

- `PublicShellTopBar` mobile hamburger 開啟 overlay，而不是在 header 下方插入 DOM block。
- 使用 Radix `Dialog` 或同等 focus-managed primitive。
- Overlay 內容：
  - tabs：台本 / 作者 / 組織，或 info page 對應 tabs；
  - close button；
  - optional action slot；
  - 不包含會改變 page flow 的 inline content。
- Overlay 開啟時：
  - focus trap；
  - Esc / click outside 關閉；
  - 背景不可因 nav 展開被推動；
  - body scroll policy 明確。

### 驗收

> 實作完成（2026-07-01）。Browser QA pending。

- [x] mobile nav 開啟後，主內容 top offset 不變。（portal overlay，不推 layout）
- [x] mobile nav 使用 portal/dialog contract，有 `role="dialog"` 或等效可測 contract。
- [x] tab click 後 overlay 關閉。
- [x] desktop tabs 行為不變。
- [ ] Browser QA：375px / 390px / 430px 驗證 nav 展開不推 hero。

## Phase 2 — Mobile Studio Entry

### 目標

手機版公開頁必須能進入工作室，不依賴 desktop-only `StudioLink`。

### 建議方案

採用一個明確入口，避免 topbar 過度擁擠：

- Hamburger overlay 內放 primary action：`進入工作室` → `/dashboard`
- `PublicShellActions` 保留外觀與說明兩顆 icon。
- `StudioLink` desktop 繼續顯示在 topbar 右側。
- info pages 的 `PublicInfoTopBar` 已有 mobile 工作室入口，後續需要和 shell overlay 語意對齊。

### 驗收

> 實作完成（2026-07-01）。Browser QA pending。

- [x] 390px viewport 可進入 `/dashboard`。（gallery: overlay 內 `<a href="/dashboard">`；entity pages: `PublicShellActions` mobile icon link）
- [x] overlay 中的工作室入口是 `<a href="/dashboard">`，不是 JS-only navigation。
- [x] desktop topbar 的 `進入工作室` 保持不變。
- [ ] Browser QA：390px 實機驗證 gallery + author/org/series/tag/not-found 頁面皆可進入工作室。
- [ ] 長期：`PublicTopBar` 與 `PublicShellTopBar` 收斂成單一 shell primitive（目前雙軌並存）。

## Phase 3 — Mobile Hero Motion Policy

### 目標

手機版保留 brand hero 的文字敘事，但隱藏 decorative animation，避免首屏不必要成本。

### 建議實作

- `GalleryBrandHeroSlide` 中的 `BrandScriptDesk` 加手機隱藏策略，例如 `hidden sm:block`。
- `useHeroBrandAnimation` 加 guard：
  - `prefers-reduced-motion: reduce` → 不 import Anime.js；
  - `(pointer: coarse)` → 不 import Anime.js；
  - mobile viewport → 不 import Anime.js。
- CSS idle keyframes 在 mobile 關閉或不 mount。
- Hero 文字 reveal 在 mobile 可縮短或改為靜態，避免首屏閃動。

### 驗收

> 實作完成（2026-07-01）。Browser QA pending。

- [x] mobile/coarse pointer 不載入 Anime.js hero animation。（`useShouldSkipAnimation` 同時 guard coarse + max-width:639px）
- [x] mobile hero 無 decorative script desk。（`GalleryBrandHeroSlide` 條件 mount，非 CSS 隱藏）
- [x] desktop hero animation 保留。
- [x] reduced-motion 使用者看到完整靜態內容。
- [ ] Browser QA：手機模擬器確認 Anime.js chunk 不出現在 network waterfall。

## Phase 4 — Overlay System Rules

### 目標

建立公開頁 overlay 規則，避免每個選單各自長出不同 layout 行為。

### 規則

| 用途 | Mobile pattern | Desktop pattern |
|---|---|---|
| Shell nav | Dialog / full-width overlay | Inline tabs |
| Filter | Bottom sheet | Sidebar / inline controls |
| Appearance | Popover or sheet；不得推 layout | Popover |
| Info menu | Popover or sheet；不得推 layout | Popover |
| Card hover preview | Disabled on coarse pointer | Pointer-follow layer |

### 驗收

> 實作完成（2026-07-01）。Browser QA pending。

- [x] Shell nav overlay 不改變主內容 flow。（portal，不推 layout）
- [x] Filter sheet (`GalleryMobileSheet`) — `role="dialog" aria-modal`、Esc 關閉、focus trap (含 select/textarea/disabled 排除)、body scroll lock + cleanup。
- [x] Appearance overlay — Radix Popover Portal，不推 layout，Radix 管理 focus/Esc。
- [x] Info overlay — Radix Popover Portal，不推 layout，Radix 管理 focus/Esc。
- [x] Shell nav trigger 有 accessible name。
- [x] 所有 overlay 可鍵盤關閉。
- [x] mobile 觸擊目標不小於 44px。（所有 icon button h-11 w-11）
- [x] Card hover preview on coarse pointer — `GalleryHoverPreviewProvider` line 83 已有 coarse guard，mobile 不啟用。
- [ ] Browser QA：所有 overlay 手機實機驗收。

## Phase 5 — Tests And Browser QA

### Unit / Component Tests

> 實作完成（2026-07-01）。

- [x] `PublicShellTopBar.test.tsx` — overlay contract, `/dashboard` link, tab closes overlay, desktop inline, Esc close
- [x] `PublicShellActions.test.tsx` — desktop StudioLink, mobile icon link (h-11 w-11), both `/dashboard`
- [x] `GalleryBrandHeroSlide.test.tsx` — mobile: BrandScriptDesk not mounted; desktop: mounted + aria-hidden
- [x] `useHeroBrandAnimation.test.ts` — reduced-motion / coarse pointer / mobile viewport guard blocks `getAnimate()`
- [x] `GalleryMobileSheet.test.tsx` — role=dialog, Esc close, backdrop click, close button, body scroll lock + restore, Tab/Shift+Tab wrap

### Browser QA

> 待執行（pending）。

- [ ] 375px / 390px / 430px：
  - nav 展開不推動 hero；
  - 可進入工作室（gallery overlay + entity pages icon link）；
  - filter sheet 和 shell nav 不互相遮擋；
  - hero 文案完整可讀；
  - no horizontal overflow。
- [ ] Desktop：
  - tabs inline；
  - StudioLink visible；
  - hero animation present；
  - resize mobile→desktop 自動關閉 overlay（已實作，待驗）。

## 建議執行順序

1. 改 `PublicShellTopBar` mobile nav 為 overlay。
2. 在 mobile overlay 內加入工作室入口。
3. 關閉 mobile hero decorative animation。
4. 補 overlay/motion tests。
5. 做手機 viewport browser QA。

## 不做的事

- 不把工作室入口藏在說明選單深層。
- 不用 inline drawer 推動頁面。
- 不用單純增加 z-index 修 layout shift。
- 不在 mobile 強制載入 decorative Anime.js。
- 不把 mobile 導覽邏輯寫死在單一頁面；要落在 shell primitive 或 host action slot。

## 完成定義

- [x] Mobile topbar 展開行為不造成 layout shift。
- [x] Mobile 使用者可從公開頁進入工作室。
- [x] Mobile hero 沒有 decorative animation 成本。
- [x] Shell overlay 行為有測試鎖住。
- [ ] Browser QA 記錄完成。
