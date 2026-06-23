# Public Shell Actions Architecture

Last updated: 2026-06-23

## Purpose

This document defines the long-term architecture for the public site's topbar
actions and the reader toolbar's action surface.

The goal is to prevent three recurring problems:

- help/about/license links being mixed with appearance settings;
- reader appearance preferences being stored in a page-local or component-local
  way that does not match the rest of the public site;
- global theme writers conflicting with each other on the same page.

This is not a cosmetic task. The shell actions must become a small, explicit
system with a single source of truth for appearance preferences.

**Revised principle (supersedes earlier drafts):**

> Share the *preference model*, not the *controls*.
>
> `PublicAppearanceMenu` and `PublicInfoMenu` belong to `PublicShellActions`
> (public topbars). The reader toolbar owns its own reading task controls and
> must not duplicate platform navigation or global appearance controls.
> `ThemeProvider` / `PublicAppearanceContext` is the sole writer to
> `document.documentElement`; reader components must not call
> `useReaderThemeClass` or write the dark class independently.

## Current State

### Public Pages

Homepage and public entity pages use public topbar variants:

- homepage: `GalleryTopBar` / `PublicGalleryTopBar`
- entity/info pages: `PublicTopBar`
- trailing actions: `PublicShellActions`

`PublicShellActions` currently owns:

- theme menu;
- info dropdown (`/help`, `/license`, `/about`, `/privacy`, `/terms`);
- studio link.

### Reader Page

The reader page uses a reader-specific toolbar:

- back to gallery/list;
- marker visibility;
- reader preferences;
- share;
- PDF export;
- series navigation around the content.

This is correct as a reader domain, but it currently means the public shell and
reader shell can diverge on global controls such as appearance and help links.

## Product Semantics

Topbar actions should be split into two different meanings.

### Info Menu

The info menu is navigation.

It should contain:

- `使用說明` -> `/help`
- `授權說明` -> `/license`
- `關於我們` -> `/about`
- `隱私政策` -> `/privacy`
- `使用條款` -> `/terms`

It should not mutate user preferences.

Recommended label:

- visual icon: `CircleHelp` or `Info`
- `aria-label`: `說明與平台資訊`

Recommended menu shape:

```text
使用說明
授權說明
關於我們
---
隱私政策
使用條款
```

The dropdown should stay a lightweight navigation menu. Do not add
descriptions, explanatory paragraphs, cards, nested sections, or mini help
content. Long-form explanation belongs on the destination pages, not inside the
topbar menu.

### Appearance Menu

The appearance menu mutates user preferences.

It should contain global public appearance controls first:

- theme: system / light / dark

Reader-specific controls may be added only after the shared preference model is
ready:

- reading font family;
- reading font size;
- reading line height.

Recommended label:

- visual icon: `Settings` or `SlidersHorizontal`
- `aria-label`: `外觀設定`

Important rule:

Do not add font size or reader text controls to the public topbar until they are
backed by the same reader preference model used by `/read/[id]`.

## Target Architecture

The shared action system should be componentized by responsibility.

```text
PublicShellActions
  PublicAppearanceMenu   ← global appearance panel (theme + reader display)
  PublicInfoMenu         ← platform navigation links
  StudioLink

ReaderToolbar
  BackToGallery
  MarkerVisibility
  ReaderPreferences      ← reader-local shortcut; writes to shared preference model
  Share
  PDF
```

Public pages and reader pages do not share toolbar components. They share:

- the `PublicAppearancePreferences` storage model and storage key;
- the `PublicAppearanceContext` which is the single source of truth for all
  appearance state at runtime;
- the `writeAppearancePreferences` + `APPEARANCE_CHANGE_EVENT` sync protocol
  so any writer (including `ReaderPreferencesPanel`) automatically updates the
  context without knowing about React.

## What Is Shared

Shared between public topbars and reader:

- `PublicAppearancePreferences` model and `public-reader:appearance` key;
- `PublicAppearanceContext` runtime state;
- `writeAppearancePreferences` + `APPEARANCE_CHANGE_EVENT` event protocol;
- migration path from old keys;
- 44px minimum hit target contract for all icon buttons.

Not shared (reader toolbar owns these independently):

- reader marker visibility;
- reader preferences panel (`ReaderPreferencesPanel`);
- reader PDF export;
- reader share behavior;
- chapter navigation;
- back-to-gallery link;
- platform info/nav links;
- studio link.

## Preference Model

The long-term model should separate global public appearance from reader display
preferences while allowing a single appearance menu to edit them.

Recommended shape:

```ts
interface PublicAppearancePreferences {
  theme: "system" | "light" | "dark";
  readerFontFamily: "sans" | "serif" | "mono";
  readerFontSize: number;
  readerLineHeight: number;
}
```

Recommended storage key:

```text
public-reader:appearance
```

Compatibility sources that may need migration:

- `screenplay-reader-theme`
- `public-reader:reader:preferences`

Migration rules:

- read old keys after mount only;
- write the new key only after a user-triggered or post-migration state
  resolution;
- do not overwrite stored preferences with defaults during first render;
- invalid stored values must be ignored field-by-field.

## Component Boundaries

### `PublicInfoMenu`

Owns:

- info link definitions;
- lightweight dropdown rendering;
- icon trigger;
- accessibility labels;
- hit target contract.

Does not own:

- theme;
- reader preferences;
- studio navigation.

### `PublicAppearanceMenu`

Owns:

- theme selector;
- later, reader display controls once the shared preference model exists;
- accessibility labels;
- hit target contract.

Does not own:

- help/about/license links;
- PDF export;
- marker visibility.

### `PublicShellActions`

Owns composition only:

```tsx
<PublicAppearanceMenu />
<PublicInfoMenu />
<StudioLink />
```

It should not contain dropdown internals once the menus are extracted.

### Reader Toolbar

The reader toolbar owns reading task controls only:

- back to gallery;
- marker visibility;
- reader preferences panel (`ReaderPreferencesPanel`);
- share;
- PDF export;
- series/chapter navigation.

It must **not** include `PublicAppearanceMenu` or `PublicInfoMenu`. Platform
navigation and global appearance belong to the public shell, not the reader.

`ReaderPreferencesPanel` writes to the shared `PublicAppearancePreferences`
model via `createAppearanceReaderStorage`. Changes are broadcast via
`APPEARANCE_CHANGE_EVENT` and picked up by `PublicAppearanceContext`, which
updates `ScriptReaderClient` reactively without any direct coupling.

`useReaderThemeClass` must not be called in `apps/public`. `ThemeProvider` is
the sole `document.documentElement` theme writer.

## Execution Plan

### Phase 1 — Extract Info Menu ✅

- Created `PublicInfoMenu` with `CircleHelp` trigger (`h-11 w-11`, `aria-label="說明與平台資訊"`).
- Compact dropdown: 使用說明 / 授權說明 / 關於我們 / separator / 隱私政策 / 使用條款.
- `PublicShellActions` updated to thin composition layer.
- Tests: trigger label, all five hrefs, separator `data-testid`, link order.

### Phase 2 — Extract Appearance Menu ✅

- Created `PublicAppearanceMenu` as a Radix **Popover** panel (`w-72`), not a dropdown menu.
- Four segmented-control sections: 主題 / 字體 / 字級 / 行距.
- All controls are `button[aria-pressed]` — no `DropdownMenu.RadioItem`.
- Tests: trigger label, 44px target, all section buttons, `aria-pressed` state,
  no nav links in panel.

### Phase 3 — Reader Toolbar Boundary Cleanup ✅

- Removed `PublicAppearanceMenu` and `PublicInfoMenu` from `ReaderToolbar`.
- Reader toolbar now contains: back link, marker visibility, reader preferences,
  share, PDF only.
- `contentClassName` changed from `max-w-4xl mx-auto` (reading-content width)
  to `w-full px-2 sm:px-4` (full toolbar width).
- Share and PDF buttons bumped to `min-h-[44px]`.
- Tests updated to assert menus are absent and back link / title / share / PDF
  are present.

### Phase 4 — Shared Appearance Preferences ✅

- Defined `PublicAppearancePreferences` model in `apps/public/lib/publicAppearancePreferences.ts`.
- Storage key `public-reader:appearance`; migration from `screenplay-reader-theme`
  and `public-reader:reader:preferences`.
- `PublicAppearanceContext` + `PublicAppearanceProvider` own runtime state.
- `ThemeProvider` wraps provider; proxies `useTheme()` to context.
- Blocking inline script in `layout.tsx` reads new key with field-by-field
  validation, falls back to old theme key.
- Tests: migration, invalid values, no first-render overwrite (13 tests).

### Phase 5 — Reader Display Controls + Sync ✅

- `createAppearanceReaderStorage` bridges `useReaderState`'s `preferencesStorage`
  protocol to the shared preference model.
- `ScriptReaderClient` reads `fontSize / lineHeight / fontFamily` from
  `usePublicAppearance().prefs` — reactive without page reload.
- `useReaderThemeClass` removed from `apps/public`; `ThemeProvider` is the sole
  `document.documentElement` writer.
- Sync protocol: `writeAppearancePreferences` dispatches `APPEARANCE_CHANGE_EVENT`
  (`CustomEvent`) on `window`; `PublicAppearanceProvider` listens in its mount
  effect and calls `setPrefs` + `onThemeChange` — covers `ReaderPreferencesPanel`
  writes without coupling to React context.
- Tests: storage bridge mapping (13 tests), event dispatch (1 test).

Browser QA checklist:

- [ ] Homepage theme toggle (亮色 / 暗色 / 跟隨系統)
- [ ] Author / org / series pages theme
- [ ] Reader theme follows public appearance panel
- [ ] Reader font size updates without reload when changed via reader preferences panel
- [ ] Reader line height updates without reload
- [ ] Reader font family updates without reload
- [ ] Mobile toolbar — no overflow

## Non-Goals

- Do not merge `PublicTopBar` and reader toolbar into one component.
- Do not put reader marker visibility into public topbars.
- Do not put PDF export into public topbars.
- Do not put `PublicInfoMenu` or `PublicAppearanceMenu` inside `ReaderToolbar`.
- Do not call `useReaderThemeClass` in `apps/public`.
- Do not keep a bare `?` button if the menu contains multiple platform concepts.

## Acceptance Criteria

- Public pages expose clear, separate info and appearance actions.
- Reader toolbar contains reading task controls only; no platform nav or global
  appearance controls.
- All action triggers have at least a 44px hit target.
- Info links are defined in one place (`PublicInfoMenu`).
- Theme and reader display preferences have one long-term storage model
  (`PublicAppearancePreferences` / `public-reader:appearance`).
- Any writer to the shared preference model (public appearance menu, reader
  preferences panel) immediately updates `PublicAppearanceContext` via
  `APPEARANCE_CHANGE_EVENT` — no page reload required.
- `ThemeProvider` is the sole writer to `document.documentElement.classList`.
- Tests cover component contracts, migration behavior, and event sync protocol.
