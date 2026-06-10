# Public Reader Replacement Plan

Last updated: 2026-06-10 (Phase 4 reading preferences + download/export + consent complete)

## Purpose

The Next.js public reader should become the canonical public reading experience. The Vite reader may continue to exist for editor/workspace use, but public pages should not depend on Vite-only reader code, duplicated parsing logic, or duplicated marker rendering behavior.

The product core is the marker system: marker themes parse the script and determine how content is displayed. Any divergence between editor preview, public reader, export preview, and SEO-rendered content is a product defect.

This document defines the long-term architecture and execution plan for replacing the Vite public reader with the Next.js public reader.

## Non-Negotiable Principles

- Parser, marker theme normalization, render model, and render transforms have one canonical implementation.
- Public reader UI controls are shared React components, not one-off Next page widgets.
- App layers may own routing, data loading, SEO, and API calls, but not reader semantics.
- Tests follow package boundaries. Shared packages test behavior; apps test wiring.
- No short-term duplicate implementation should become the long-term surface.

## Current Package Boundaries

### `@write/script-engine`

Pure TypeScript engine. No React, DOM, browser storage, Vite, or Next.js dependency.

Owns:

- marker config normalization
- marker theme resolution helpers
- screenplay parsing
- inline parsing
- AST and `ScriptDocument`
- TOC extraction
- render model generation
- render transforms

Does not own:

- React rendering
- toolbar state
- public API calls
- routing
- SEO page composition

### `@write/script-reader-renderer`

React renderer for render blocks. It should remain focused on visual output.

Owns:

- `RenderBlockRenderer`
- marker DOM attributes
- marker style application
- hidden marker rendering behavior
- renderer fixture tests

Does not own:

- parser behavior
- toolbar/menu controls
- public action logic
- Next/Vite routing

### `@write/script-reader-ui`

Shared React reader controls and reader state hooks.

Owns:

- marker visibility state (`useReaderMarkerVisibility`)
- `MarkerVisibilityMenu`
- TOC state (`useTocState`)
- `TocMenu`
- `ReaderToolbar` (shared toolbar with `startSlot`/`endSlot`/`contentClassName` slots)
- future reading preference controls
- UI interaction tests

Does not own:

- public API fetch calls
- script metadata loading
- SEO
- server rendering

### `apps/public`

Next.js public frontend.

Owns:

- route data loading
- SSR/ISR
- structured data / SEO
- public API actions such as view, like, share
- page composition
- small integration smoke tests

Does not own:

- marker rendering semantics
- marker visibility menu internals
- parser behavior
- duplicated reader renderer logic

## Target Reader Shape

The final public reader client should be a thin composition layer.

```tsx
const actions = usePublicReaderActions(scriptId, initialScript);
const readerState = useReaderState({
  markerConfigs,
  toc,
  storage,
});

return (
  <PublicReaderPage
    script={initialScript}
    actions={actions}
    toolbar={
      <ReaderToolbar
        markerConfigs={markerConfigs}
        toc={toc}
        readerState={readerState}
      />
    }
  >
    <ScriptContentRenderer
      blocks={renderBlocks}
      markerConfigs={markerConfigs}
      hiddenMarkerIds={readerState.hiddenMarkerIds}
    />
  </PublicReaderPage>
);
```

## Parity Contract

The public reader is considered replacement-ready only when the following categories are explicitly handled.

| Category | Required Capability | Owner | Status |
|---|---|---|---|
| Parse/render | `parseScreenplay` and `toRenderBlocks` used by public page | `@write/script-engine` | Done |
| Marker theme | Vite-format marker configs normalized correctly | `@write/script-engine` | Done |
| Marker display | Render blocks styled by marker configs | `@write/script-reader-renderer` | Done |
| Marker visibility | User can hide/show marker content | `@write/script-reader-ui` + renderer | Done |
| TOC | Reader can open TOC and jump to sections | `@write/script-reader-ui` | Done (disclosure panel; no Radix keyboard/focus yet) |
| Public actions | view, like, share | `apps/public` | Partial |
| Reading preferences | font, font size, line height, theme | `@write/script-reader-ui` | Done |
| Legal consent | terms/consent flow where required | `apps/public` | Done |
| Discovery | series, author, org, tags navigation | `apps/public` | Done |
| Export/download | reader-facing download/export actions | `apps/public` + `@write/browser-download` | Done (plain text .txt; no auth required; rich export endpoints are auth-gated and intentionally excluded from public reader scope) |
| SEO | metadata and structured data | `apps/public` | Partial |

## Execution Plan

### Phase 1: Reader Parity Contract

Goal: make the replacement scope explicit before adding more features.

- Keep this document updated as the contract.
- For each Vite public reader capability, classify it as required, delayed, or intentionally removed.
- Record the package owner and test owner for every required capability.
- Do not add public reader features without updating this contract.

Completion standard:

- Every public reader feature has an owner.
- Every required feature has a test location.
- Unknowns are tracked explicitly instead of hidden in implementation details.

### Phase 2: Package Boundary Cleanup ✓ Complete

Goal: move reader controls out of `apps/public` and into shared reader UI where they belong.

Done:

1. `useTocState` + `TocMenu` added to `@write/script-reader-ui` (12 `TocMenu` tests, 5 `useTocState` tests).
2. Shared `ReaderToolbar` introduced with `startSlot`/`endSlot`/`contentClassName` slots (6 tests).
3. `apps/public/app/read/[id]/ReaderToolbar.tsx` is now a thin adapter: owns `useTocState`, passes back link via `startSlot`, passes `contentClassName="max-w-4xl mx-auto"` to match body layout width.
4. Public API actions remain in `apps/public`.
5. `exportMetadata.test.ts` pre-existing failure also fixed (license rows format regression).

Accessibility note: `TocMenu` and `ReaderPreferencesPanel` use Radix Popover primitives for trigger state, Esc, outside-click dismissal, portal rendering, and focus handling.

Theme note: reader theme class management lives in `useReaderThemeClass(theme)` inside `@write/script-reader-ui`; host apps should not hand-roll `<html>` class transitions.

### Phase 3: Reader State Model ✓ Complete

Goal: centralize reader state without coupling it to Next.js or localStorage.

Done:

- `useReaderState` is the canonical reader state hook. All new code should use it.
- `ReaderStorageAdapter` interface decouples persistence from `localStorage`.
- `createLocalStorageReaderStorage(prefix)` — browser `localStorage` adapter in `readerStorage.ts`.
- `useReaderState` accepts `storage` (per-script marker visibility) + `preferencesStorage` (global user preferences); both optional, `null` disables.
- Storage unavailable (throws) silently ignored — no crash.
- Stale `hiddenMarkerIds` pruned when `markerConfigs` changes.
- Restores `hiddenMarkerIds` from storage on mount; filters ids not in current configs.
- TOC is a real document-derived state model: `{ entries, isOpen, activeId, open, close, toggle, setActiveId }`.
- `ReaderState` exposes `{ markerConfigs, markerVisibility, toc, preferences }`.
- `ReaderToolbar` accepts a single `readerState` prop — self-contained, no separate config/visibility/toc props.
- `useReaderMarkerVisibility` is a compat wrapper over `useReaderState`; contains no own state logic.
- `ScriptReaderClient` uses `useReaderState` with per-script `storage` + global `preferencesStorage` (`createLocalStorageReaderStorage("public-reader")`).
- App `ReaderToolbar` adapter passes `readerState` through; no owned state.
- 36 tests in `useReaderState.test.ts`: markerVisibility, toc model, stale pruning, storage persist/restore/unavailable/null/undefined, preferences (setters/reset/persist/restore/invalid values/separate storage/delta-only write).

State groups currently in `useReaderState`:

- marker visibility (hidden ids, counts, toggle/show/hide)
- TOC (entries, open/close, activeId)
- reading preferences (theme, fontSize, lineHeight, fontFamily) — stored in storage, restored after mount

Not yet in `useReaderState`:

- transient UI: copied state

### Phase 4: Public Reader Feature Completion

Goal: complete user-facing reader capability after the shared boundaries are stable.

Priority order:

1. ~~TOC as shared UI.~~ Done in Phase 2.
2. ~~Reading preferences.~~ Done: `ReaderPreferencesPanel`, `resolveReaderFontFamily`, and `useReaderThemeClass` in `@write/script-reader-ui`; wired to `ScriptContentRenderer` (fontSize/lineHeight/readingFontFamily). Covered by 14 `ReaderPreferencesPanel` tests and 5 `useReaderThemeClass` tests.
3. ~~Download/export actions.~~ Done: `@write/browser-download` shared package (`sanitizeBaseFilename`, `buildFilename`, `downloadBlob`, `downloadText`); `src/lib/download.ts` and `apps/public/lib/download.ts` are thin re-exports. `handleDownloadTxt` in `usePublicReaderActions`; button gated on `canDownload` (content non-empty); 14 unit tests in `@write/browser-download`, 3 integration tests in `ScriptReaderClient.test.tsx`.
4. ~~Terms/consent flow.~~ Done: `ConsentGate` in `apps/public`; fetches `/api/public-terms-config`, gates reader until all `requiredChecks` ticked, POSTs to `/api/public-terms-acceptances`, stores accepted version in localStorage so same version not re-prompted. Fails open if config unavailable. 7 tests in `ConsentGate.test.tsx`.
5. ~~Series related scripts and navigation.~~ Done: series page existed; `ScriptCard` now links series name → `/series/:name`.
6. ~~Author/org/tag navigation consistency.~~ Done: `ScriptCard` restructured from wrapping `<a>` to `<article>` with individual links (title→read, author→/author/:id, series→/series/:name, org→/org/:id, tags→/tag/:name); `/app/tag/[name]/` page created (SSR, ISR 1h, bundle-filtered); tags made clickable in `PublicReaderHeader`, `AuthorPageClient`, `OrgPageClient`, `GalleryClient`.
7. Optional speech/reading features.

Implementation rule:

- If a feature affects reader semantics or controls, start in `@write/script-reader-ui`.
- If a feature affects render output, start in `@write/script-reader-renderer` or `@write/script-engine`.
- If a feature affects public API, SEO, or routing, keep it in `apps/public`.

### Phase 5: Replacement Readiness

Goal: cut over to the Next.js public reader as the canonical public surface.

Required fixture scenarios:

- default script with no custom markers
- custom marker theme
- hidden marker content
- range/layer marker
- TOC entries
- long script
- script in a series
- script with author/org/tags
- script requiring consent
- script with no markers

Required verification:

- Next build passes.
- Docker production build passes.
- full Vitest has no new reader failures.
- known unrelated failures are either fixed or explicitly tracked.
- mobile and desktop reader screenshots are reviewed.
- dark mode and dense marker scripts are reviewed.

## Immediate Next Step

Phase 4 priorities 5+6 complete. Next: Phase 4 priority 7 (optional speech/reading features) or Phase 5 replacement readiness.

## Known Issues

None. `exportMetadata.test.ts` failure was fixed in Phase 2.
