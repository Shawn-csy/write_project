# Public Homepage Appearance And Layout Architecture

Last updated: 2026-06-23

## Purpose

This document defines the long-term architecture for two homepage UX
requirements:

1. Homepage text size should be adjustable from the public appearance panel.
2. Desktop/wide homepage filter sidebar should be collapsible.

The important boundary is that homepage typography must use a public-site
design-token system. It must not reuse reader-only `readerFontSize`,
`readerLineHeight`, or `readerFontFamily` as direct layout controls.

## Problem Statement

The current `PublicAppearanceMenu` exposes:

- theme;
- reader font family;
- reader font size;
- reader line height.

Only the reader page consumes the reader typography fields:

- `readerFontFamily`;
- `readerFontSize`;
- `readerLineHeight`.

The homepage does not consume those values. This is technically consistent with
the current names, but it is a poor product contract because the control appears
in the public homepage topbar. A user reasonably expects homepage typography to
change when changing the homepage appearance panel.

The correct fix is not to apply reader font size directly to every homepage
Tailwind class. That would be a fragile global override and would distort badges,
buttons, card geometry, hero content, and filter density.

## Architectural Principles

### Separate Site Appearance From Reader Preferences

Public appearance preferences should have two distinct groups:

```ts
interface PublicAppearancePreferences {
  theme: "system" | "light" | "dark";

  // Site-level public UI scale.
  siteTextScale: "compact" | "default" | "comfortable" | "large";

  // Reader-only body typography.
  readerFontFamily: "sans" | "serif" | "mono";
  readerFontSize: number;
  readerLineHeight: number;
}
```

`siteTextScale` controls public-page UI typography through design tokens.
Reader fields control `/read/[id]` screenplay body rendering.

### Use Tokens, Not Direct Tailwind Class Multiplication

Homepage text size should be controlled by CSS variables such as:

```css
:root {
  --public-font-caption: 0.75rem;
  --public-font-meta: 0.8125rem;
  --public-font-body: 0.875rem;
  --public-font-card-title: 0.9375rem;
  --public-line-body: 1.55;
}

[data-public-text-scale="comfortable"] {
  --public-font-caption: 0.8125rem;
  --public-font-meta: 0.875rem;
  --public-font-body: 0.9375rem;
  --public-font-card-title: 1rem;
  --public-line-body: 1.65;
}
```

Components should consume semantic tokens:

- card title;
- card summary;
- card metadata;
- filter labels;
- people/org card body text;
- result count text;
- empty state text.

Components should not blindly scale:

- icon sizes;
- touch target dimensions;
- badge height;
- cover aspect ratio;
- hero layout dimensions;
- toolbar height;
- grid gap and card geometry.

### Keep Sidebar State As Gallery Layout State

The desktop sidebar collapse state is not a filter value. It should not enter
SEO metadata, public URLs, or backend queries.

Correct owner:

- `apps/public/app/gallery/useGalleryController.ts`
- or a dedicated `useGalleryLayoutState` hook.

Persistence:

- optional localStorage key after mount only;
- not required in URL state;
- must never block SSR or hydration.

Recommended key:

```text
public-gallery:layout
```

Shape:

```ts
interface PublicGalleryLayoutPreferences {
  desktopFilterSidebarCollapsed: boolean;
}
```

## Target Architecture

```text
ThemeProvider
  PublicAppearanceProvider
    writes:
      document.documentElement.classList.dark
      document.documentElement.dataset.publicTextScale

PublicAppearanceMenu
  Theme controls
  Site text scale controls
  Reader typography controls only if clearly labelled as reader-specific

GalleryClient
  useGalleryController
    url state: view, tags, segment, usage, mode, q
    layout state: desktopFilterSidebarCollapsed
  layout:
    sidebar expanded -> 15rem column
    sidebar collapsed -> icon rail / reopen button

Gallery components
  consume public typography tokens
  do not read readerFontSize directly
```

## Product Semantics

### Appearance Panel Copy

Avoid ambiguous labels.

Recommended structure:

```text
外觀設定

主題
  跟隨系統 / 亮色 / 暗色

首頁文字
  精簡 / 標準 / 舒適 / 大字

閱讀器文字
  字體
  字級
  行距
```

If the panel is too dense after adding site text scale, split it:

- public topbar: theme + homepage text scale;
- reader toolbar: reader typography only.

Do not label reader typography simply as `字級` inside the public homepage
topbar. Use `閱讀器字級` if it remains there.

### Sidebar Collapse

Desktop sidebar should support:

- expanded state: full filter panel;
- collapsed state: narrow rail or single filter button;
- visible active-filter count when collapsed;
- keyboard-accessible toggle;
- no layout jump that loses scroll position.

Recommended trigger labels:

- expanded state button: `收合篩選欄`;
- collapsed state button: `展開篩選欄`;
- active count: `已套用 N 個篩選`.

Mobile behavior remains unchanged: use the bottom/mobile sheet.

## Implementation Plan

### Phase 1 — Preference Model ✅

- Added `SiteTextScale` type and `VALID_SITE_TEXT_SCALES` set.
- `siteTextScale: "default"` in `PublicAppearancePreferences` and `DEFAULT_APPEARANCE`.
- `parseStored` validates field-by-field; malformed/missing value falls back to
  `DEFAULT_APPEARANCE.siteTextScale` via `{ ...DEFAULT_APPEARANCE, ...stored }`.
- Compatibility policy: **no backwards compatibility**.
  - Only `public-reader:appearance` is a valid appearance preference source.
  - `screenplay-reader-theme` is ignored.
  - `public-reader:reader:preferences` is ignored.
  - There is no migration path and no legacy fallback.
  - Existing users with only old keys fall back to `DEFAULT_APPEARANCE`.
- Tests: valid read, invalid ignored, validator set, default value.

### Phase 2 — Root Attribute And Tokens ✅

- `PublicAppearanceProvider` writes `document.documentElement.dataset.publicTextScale`
  on mount, on external `APPEARANCE_CHANGE_EVENT`, and on `setSiteTextScale`.
- CSS variables defined in `apps/public/app/globals.css` under `:root` and
  `[data-public-text-scale=compact|comfortable|large]` selectors.
- Tokens: `--public-font-caption`, `--public-font-meta`, `--public-font-body`,
  `--public-font-card-title`, `--public-line-body`.
- `:root` has default values so the attribute being absent is safe.
- Blocking layout script: **deferred**. Text scale does not cause dark/light flash so
  first-paint mismatch is low-priority. Add to blocking script in `layout.tsx` only
  after Phase 4 token adoption makes the difference visible at first paint.
- Tests: dataset set on mount from stored prefs; dataset updates from external event.

### Phase 3 — Appearance Panel UI ✅

- `首頁文字` segmented control (精簡/標準/舒適/大字) added to `PublicAppearanceMenu`
  between theme and reader section.
- Reader section now labeled `閱讀器文字` with sub-labels 字體/字級/行距.
- Reader group aria-labels prefixed `閱讀器字體/字級/行距` to avoid name collision with
  `首頁文字` `標準` option.
- All controls use `button[aria-pressed]`.
- Tests: within-group queries for site text scale; `setSiteTextScale` call; `aria-pressed`
  state; reader labels distinct.

### Phase 4 — Token Adoption In Homepage Components

Start with components where text size matters most:

1. `ScriptGalleryCard`
   - title;
   - summary;
   - metadata row;
   - hover preview text.
2. `SeriesGalleryCard`
   - series title;
   - chapter count;
   - summary;
   - metadata.
3. `GalleryFilterPanel`
   - section labels;
   - tag chips;
   - usage controls.
4. `GalleryPeopleGrid`
   - author/org names;
   - descriptions;
   - tag text.
5. `GalleryClient` result count and empty states.

Do not change layout geometry during this phase unless a text-scale mode causes
overflow. If overflow occurs, fix with component constraints, not ad hoc
per-page overrides.

### Phase 5 — Desktop Sidebar Collapse Model

1. Add layout state:

   ```ts
   desktopFilterSidebarCollapsed: boolean
   setDesktopFilterSidebarCollapsed(next: boolean): void
   ```

2. Keep this state out of `galleryUrlState`.
3. Optional storage adapter:
   - key: `public-gallery:layout`;
   - read after mount;
   - write after user action;
   - ignore malformed values.
4. Add UI:
   - expanded sidebar includes a top-right collapse button;
   - collapsed rail shows a filter icon, active count, and expand button;
   - main content expands to fill reclaimed width.
5. Tests:
   - expanded sidebar renders filters;
   - collapse hides filter panel and shows rail;
   - expand restores filter panel;
   - active filter count visible in collapsed state;
   - no URL query changes when toggling.

### Phase 6 — Browser QA

Required viewport checks:

- desktop 1440px:
  - sidebar expanded;
  - sidebar collapsed;
  - text scale compact/default/comfortable/large.
- wide desktop 1920px:
  - collapsed sidebar does not create awkward empty space;
  - card grid uses width productively.
- mobile 390px:
  - no desktop sidebar;
  - mobile filter sheet unchanged;
  - site text scale does not break topbar buttons.

QA acceptance:

- public homepage text visibly changes with `首頁文字`;
- reader body still changes with reader preferences;
- homepage does not consume `readerFontSize` directly;
- sidebar collapse does not mutate filters or URL;
- no card/title/tag overflow in large text mode.

## Non-Goals

- Do not use `readerFontSize` as homepage font size.
- Do not scale the whole document with `zoom` or root `font-size`.
- Do not read, migrate, or preserve legacy preference keys.
- Do not put sidebar collapse state into the URL.
- Do not make mobile use the desktop collapsed sidebar rail.
- Do not resize cover images or badges as part of text scale.

## Acceptance Criteria

- `PublicAppearancePreferences` contains explicit site-level text scale.
- `public-reader:appearance` is the only supported preference source.
- Legacy preference keys are ignored, not migrated.
- Root DOM exposes a stable `data-public-text-scale` or equivalent token hook.
- Homepage components consume public typography tokens.
- Reader typography remains reader-specific.
- Public appearance panel labels distinguish homepage text from reader text.
- Desktop sidebar can collapse and expand without changing filters, URL state, or
  search results.
- Tests cover preference parsing, provider sync, appearance control, token
  contract, and sidebar collapse behavior.
