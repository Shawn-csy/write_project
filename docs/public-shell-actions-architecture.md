# Public Shell Actions Architecture

Last updated: 2026-06-23

## Purpose

This document defines the long-term architecture for the public site's topbar
actions and the reader toolbar's shared action surface.

The goal is to prevent three recurring problems:

- help/about/license links being mixed with appearance settings;
- public topbars and the reader toolbar growing separate duplicated controls;
- reader appearance preferences being stored in a page-local or component-local
  way that does not match the rest of the public site.

This is not a cosmetic task. The shell actions must become a small, explicit
system shared by public pages and the reader.

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
  PublicAppearanceMenu
  PublicInfoMenu
  StudioLink

ReaderToolbar
  BackToGallery
  MarkerVisibility
  ReaderPreferences
  Share
  PDF
  PublicAppearanceMenu
  PublicInfoMenu
```

Public pages and reader pages should not share the entire topbar. The reader
toolbar is a different shell with reader-specific tools. They should share only
the global actions:

- `PublicAppearanceMenu`
- `PublicInfoMenu`
- preference/storage model
- sizing/accessibility/menu behavior contracts

## What Must Be Unified

Unified across public topbars and reader toolbar:

- info menu link set;
- appearance menu theme control;
- menu item visual treatment;
- Radix dropdown behavior;
- 44px minimum hit target for icon buttons;
- `aria-label`, `aria-pressed`, keyboard behavior;
- storage keys and preference migration.

Not unified:

- reader marker visibility;
- reader PDF export;
- reader share behavior;
- chapter navigation;
- back button semantics;
- studio link placement on reader pages.

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

### Reader Toolbar Integration

The reader toolbar should consume:

```tsx
<PublicAppearanceMenu />
<PublicInfoMenu />
```

Reader-specific controls remain in the reader toolbar:

- marker visibility;
- reader preferences panel until merged;
- share;
- PDF export;
- series/chapter navigation.

## Execution Plan

### Phase 1 — Extract Info Menu

1. Create `PublicInfoMenu`.
2. Move `/help`, `/license`, `/about`, `/privacy`, `/terms` links into it.
3. Replace the raw `?` text button with an icon trigger.
4. Keep the dropdown as a compact link list with one separator before policy
   links.
5. Enforce `h-11 w-11` hit target.
6. Add tests for:
   - trigger `aria-label`;
   - all five links;
   - link order and separator contract;
   - 44px class contract.

Definition of done:

- public topbars still show all existing information links;
- menu meaning is clear without relying on a bare question mark;
- the menu is a compact navigation list, not a mini documentation surface;
- no appearance controls live in the info menu.

### Phase 2 — Extract Appearance Menu

1. Create `PublicAppearanceMenu`.
2. Move current theme selector into it.
3. Keep the existing `ThemeProvider` behavior unchanged.
4. Update `PublicShellActions` into a thin composition layer.
5. Add tests for:
   - trigger `aria-label`;
   - current theme display;
   - selecting system/light/dark;
   - 44px class contract.

Definition of done:

- theme is no longer a separate ad hoc button in `PublicShellActions`;
- info and appearance are two separate concepts in the UI.

### Phase 3 — Reader Toolbar Uses Shared Menus

1. Add `PublicAppearanceMenu` and `PublicInfoMenu` to the reader toolbar action
   area.
2. Keep reader-specific controls in place.
3. Decide whether reader pages should show the studio link. Default: no, unless
   product wants it.
4. Add tests for:
   - reader toolbar renders shared info menu;
   - reader toolbar renders shared appearance menu;
   - marker/share/PDF controls are unaffected.

Definition of done:

- reader toolbar and public topbars share global action menus;
- reader toolbar remains a reader-specific toolbar, not a `PublicTopBar` clone.

### Phase 4 — Shared Appearance Preferences

1. Define `PublicAppearancePreferences`.
2. Build a storage adapter and migration path.
3. Move theme persistence to the new model.
4. Connect reader display preferences to the same model.
5. Keep compatibility wrappers for old keys until migration is stable.
6. Add tests for:
   - old theme key migration;
   - old reader preference migration;
   - invalid stored values;
   - no first-render default overwrite;
   - reader page applying font size / line height / font family.

Definition of done:

- appearance settings are backed by one coherent preference model;
- reader and public shell no longer store overlapping display preferences in
  unrelated places.

### Phase 5 — Add Reader Display Controls To Appearance Menu

1. Add font family control.
2. Add font size control.
3. Add line height control.
4. Remove duplicated reader-only controls if they become redundant, or keep a
   reader-local shortcut that delegates to the same preference model.
5. Browser QA:
   - homepage theme;
   - author/org/series pages theme;
   - reader theme;
   - reader font size;
   - reader line height;
   - mobile toolbar overflow.

Definition of done:

- the appearance menu changes real persisted preferences;
- reader typography updates consistently;
- there is no fake global font setting that only works on one page.

## Non-Goals

- Do not merge `PublicTopBar` and reader toolbar into one component.
- Do not put reader marker visibility into public topbars.
- Do not put PDF export into public topbars.
- Do not add font controls before the shared preference model exists.
- Do not keep a bare `?` button if the menu contains multiple platform concepts.

## Acceptance Criteria

- Public pages expose clear, separate info and appearance actions.
- Reader toolbar exposes the same global info and appearance actions.
- All action triggers have at least a 44px hit target.
- Info links are defined in one place.
- Theme and reader display preferences have one long-term storage model.
- Tests cover component contracts and migration behavior.
