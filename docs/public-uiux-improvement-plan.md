# Public UI/UX Improvement Plan

Last updated: 2026-06-22

## Purpose

This document turns the current public-site UI/UX review into an execution plan.
The goal is not cosmetic patching. Each change should land in the correct layer:

- pure product/display rules in `@write/public-ui` models;
- router/runtime wiring in `apps/public`;
- reusable visual contracts in shared public components;
- browser-only validation in QA notes.

## Scope

Included:

- public homepage gallery information hierarchy;
- public reader header and toolbar ergonomics;
- mobile top bar touch targets;
- hero banner readability;
- public filter density;
- public 404 experience.

Excluded:

- editor/studio workflows;
- Vite public route resurrection;
- SEO metadata rewrites unless the UI change affects visible content or route
  structure.

## Review Verdict

The audit is directionally correct. The highest-impact problems are real:

- the homepage lane model currently shows lanes whenever filters are inactive,
  regardless of content volume;
- the featured-series lane can duplicate series already shown in latest/top lanes;
- the reader overlay currently renders audience/rating summary cards with
  `未設定` when other metadata causes the summary section to exist;
- mobile top bar filter targets are `h-8 w-8`, below the 44px touch target
  expected for comfortable mobile use.

Two findings need more careful framing:

- Reader light-mode background should be treated as a browser QA finding first.
  The code path uses theme variables, so the issue may be caused by reader
  backdrop/paper tokens, not necessarily `ThemeProvider` storage sync.
- Hero banner height/readability depends on live banner content. The component
  still needs a stronger readability contract, but the exact height should be a
  design token rather than an ad hoc page override.

## Architecture Principles

### Homepage Display Rules Belong In `homepageModel`

Do not decide lane visibility inside `GalleryScriptResults`.

The model already owns:

- `showLanes`;
- `lanes`;
- `galleryEntries`;
- `emptyState`;
- `navigationPolicyMap`.

Therefore it should also own:

- minimum content threshold for lane layout;
- lane de-duplication;
- which lanes are visible;
- fallback from lane layout to flat grid.

The UI should render the model, not re-derive product rules.

### Reader Metadata Should Hide Empty Facts

Visible reader metadata should only show facts that carry information.

Do not render:

- `觀眾取向：未設定`;
- `內容分級：未設定`;
- empty license/custom metadata placeholder rows.

If an unknown state is needed for editor validation, keep it in the editor, not
the public reader.

### Touch Targets Are Component Contracts

Mobile and tablet controls should expose at least a 44x44px hit area. The icon
itself can stay visually small, but the button box must be comfortable.

This belongs in shared components such as `PublicGalleryTopBar`, not in
route-local wrappers.

### Browser QA Is Required For Theme And Layout Claims

The following cannot be closed by static code review alone:

- light/dark reader background;
- hero text contrast on real images;
- mobile top bar spacing under actual viewport widths;
- scroll/overflow behavior of dense filters.

Implementation can be covered by unit tests, but acceptance requires browser QA.

## Findings And Decisions

| ID | Finding | Verdict | Correct Layer |
|---|---|---|---|
| UX-1 | Small catalog shows repetitive lanes | Correct | `@write/public-ui/gallery/homepageModel.ts` |
| UX-2 | Featured series duplicates series already in latest/top lanes | Correct | `homepageModel` lane derivation |
| UX-3 | Reader appears dark in light mode | Needs browser verification | `apps/public` theme/runtime or reader shell tokens |
| UX-4 | `未設定` audience/rating rows waste space | Correct | `PublicScriptInfoOverlay` |
| UX-5 | Mobile top bar touch targets too small | Correct | `PublicGalleryTopBar` |
| UX-6 | Hero banner readability/height | Correct direction | `PublicHeroMarquee` component contract |
| UX-7 | Sidebar tags too dense | Correct | shared filter model + filter panel UI |
| UX-8 | Segment and usage filters compete visually | Correct direction | gallery filter IA |
| UX-9 | Card hover treatment differs by card type | Minor | shared card components |
| UX-10 | 404 page is generic English | Correct | `apps/public/app/not-found.tsx` |
| UX-11 | Reader toolbar empty on desktop | Minor, defer | reader toolbar model/shell |

## Execution Plan

### Phase 1 — Homepage Lane Information Architecture ✅

Goal: stop repetitive homepage presentation for small catalogs.

Implementation:

1. Add model-level constants:
   - `MIN_LANE_SCRIPT_COUNT`, proposed default: `20`;
   - `MIN_DISTINCT_LANE_ENTRY_COUNT`, proposed default: `12`.
2. Change `buildPublicHomepageModel()` so `showLanes` is true only when:
   - no filters are active;
   - view is `scripts`;
   - total public script count or distinct entry count exceeds threshold.
3. Add lane de-duplication:
   - compute visible keys from latest/top lanes;
   - remove duplicate series from featured-series lane;
   - hide featured-series lane if it becomes empty.
4. Keep compact view as flat list.
5. Add tests for:
   - small catalog falls back to grid;
   - large catalog keeps lanes;
   - duplicate featured series removed;
   - empty featured lane hidden.

Definition of Done:

- A catalog with around 10 scripts renders one clear grid, not three repetitive
  lanes.
- Series aggregation still works in grid and lanes.
- No duplicate series card appears in featured-series lane when already visible
  above.

### Phase 2 — Reader Header Metadata Hygiene ✅

Goal: public reader header only shows meaningful metadata.

Implementation:

1. Update `PublicScriptInfoOverlay` so audience/rating cards render
   independently only when each value exists.
2. Do not use `未設定` in public reader display.
3. Keep tags/license/custom fields visible when present.
4. Add tests for:
   - audience hidden when empty;
   - rating hidden when empty;
   - tags/license still render without empty audience/rating cards.

Definition of Done:

- Public read header contains no empty placeholder facts.
- Metadata-rich scripts still show audience/rating correctly.

### Phase 3 — Mobile Top Bar Touch Contract ✅ implementation complete; browser QA pending (360/390/430px overlap check)

Goal: make mobile controls easier to tap without changing layout semantics.

Implementation:

1. Increase top bar icon button hit areas to `h-11 w-11` or equivalent
   min-size.
2. Keep visible icon size around `h-4 w-4`.
3. Ensure left filter, right trailing actions, and centered brand do not overlap
   at 360px width.
4. Add component tests for class/contract where practical; verify with browser
   screenshots.

Definition of Done:

- Primary mobile top bar icon controls expose at least 44px hit area.
- Brand remains centered and readable.
- No overlap at 360px, 390px, and 430px widths.

### Phase 4 — Hero Banner Readability ✅ (needs browser QA with real images)

Goal: make banner text readable across real images.

Implementation:

1. Put hero readability into `PublicHeroMarquee`, not page-local CSS.
2. Add a consistent text scrim/gradient layer.
3. Define responsive height tokens instead of arbitrary one-off heights.
4. Keep placeholder slides dev/test only.

Definition of Done:

- Text remains readable on bright and busy images.
- Desktop hero does not dominate the first viewport when the catalog is small.
- Mobile hero keeps enough context below the fold.

### Phase 5 — Filter Density And Information Architecture ✅ (needs browser QA for mobile sheet overflow)

Goal: reduce visual noise from dense tags and overlapping filter controls.

Implementation:

1. Move usage filter into sidebar/mobile filter panel unless it becomes a
   primary product navigation control.
2. Collapse long tag lists:
   - default show first 6-8;
   - `展開更多` reveals the rest;
   - selected hidden tags remain visible in chips.
3. Consider grouping sensitive/adult tags separately when classification exists
   in the model. Do not hard-code NSFW strings in UI components.
4. Add tests for collapsed tags and selected-tag visibility.

Definition of Done:

- Main content header has fewer competing segmented controls.
- Sidebar remains scannable with large tag sets.
- No selected filter becomes invisible or hard to clear.

### Phase 6 — Public 404 ✅

Goal: replace generic English Next 404 with product-consistent Chinese UI.

Implementation:

1. Add `apps/public/app/not-found.tsx`.
2. Use `PublicTopBar` + `PublicShellActions`.
3. Provide:
   - Chinese title;
   - short explanation;
   - return-home button;
   - optional link to gallery/search.

Definition of Done:

- Unknown public routes show a localized, branded 404.
- The page has a clear recovery action.

### Phase 7 — Minor Polish ✅ (light-mode background needs browser QA)

- ~~normalize card hover intensity between script and series cards~~ — already identical (`hover:-translate-y-0.5 hover:border-primary/60 hover:bg-muted/25 hover:shadow-md`)
- ~~evaluate reader toolbar center title on desktop~~ — added `centerSlot` to `ReaderToolbar`, shows script title on sm+ screens
- verify reader light-mode background after theme QA — pending browser verification

### Phase 8 — Card Summary And Hover Outline ✅

Goal: make homepage/gallery cards carry enough context without bloating the
default grid.

Product rule:

- Card short summary comes from the script info synopsis (`PublicScript.synopsis`).
- Hover detail comes from the advanced preface outline (`PublicScript.outline` /
  public metadata `outline` / `大綱`).
- Synopsis and outline are different product fields and must not be merged.

Architecture rule:

1. Add gallery display fields at the model boundary:
   - `GalleryScriptInput.synopsis`
   - `GalleryScriptInput.outline`
   - enriched `_cardSummary`
   - enriched `_hoverOutline`
2. `apps/public/lib/galleryProjection.ts` maps `PublicScript.synopsis` and
   `PublicScript.outline` into `GalleryScriptInput`.
3. `ScriptGalleryCard` and `SeriesGalleryCard` only consume the enriched display
   fields. They must not parse `customMetadata` themselves.
4. Series cards use series summary first. If series summary is absent, they may
   fall back to the lead script synopsis for the short summary. Hover outline may
   use the lead script outline until a series-level outline exists.

UI contract:

- Standard cards show a short summary under title/author/series metadata.
- Compact cards may show a shorter one-line summary only if it does not harm
  scan density.
- Short summaries are normalized to single-line whitespace and truncated by a
  shared helper, not ad hoc `slice()` calls inside JSX.
- Desktop hover may show an outline preview panel.
- Mobile must not rely on hover as the only way to access synopsis. The synopsis
  remains visible in the card body when present.
- If synopsis is empty, no blank summary row is rendered.
- If outline is empty, no hover panel is rendered.
- Hover preview must not introduce nested interactive elements and should not
  intercept card clicks.

Implementation plan:

1. Add pure text helpers near the gallery model or card component:
   - normalize display text;
   - truncate short summary with an ellipsis;
   - preserve readable outline whitespace where useful.
2. Extend `GalleryScriptInput` / `EnrichedGalleryScript`.
3. Update Next gallery projection.
4. Render short summary + hover outline in `ScriptGalleryCard`.
5. Render series summary/fallback + hover outline in `SeriesGalleryCard`.
6. Update tests.

Required tests:

- `filterModel`:
  - `synopsis` becomes `_cardSummary`;
  - `outline` becomes `_hoverOutline`;
  - custom metadata fallback only if explicitly supported by the model.
- `galleryProjection`:
  - `PublicScript.synopsis` and `PublicScript.outline` are forwarded.
- `ScriptGalleryCard`:
  - short summary renders;
  - long summary truncates;
  - outline hover preview renders when present;
  - no hover preview when outline is absent;
  - no nested interactive elements.
- `SeriesGalleryCard`:
  - series summary wins over lead synopsis;
  - lead synopsis fallback works;
  - lead outline hover preview renders.

Definition of Done:

- Homepage script cards expose short context from script synopsis.
- Hover outline uses advanced outline data, not synopsis, tags, or generated copy.
- The data path is model/projection driven and shared by all gallery surfaces.
- Card layout remains scannable in both standard and compact modes.

## QA Matrix

| Area | Required Checks |
|---|---|
| Homepage small catalog | 10 scripts, no filters: flat grid, no repetitive lanes |
| Homepage large catalog | 20+ scripts or 12+ entries: lanes visible and deduped |
| Reader metadata | no `未設定` placeholders; populated values still visible |
| Mobile top bar | 360/390/430px screenshots; no overlap; 44px targets |
| Hero | bright image, dark image, mobile and desktop readability |
| Filter panel | long tag list, selected hidden tag, reset filters |
| 404 | unknown route in light/dark mode |
| Card summaries | synopsis visible, long text truncated, hover outline shown on desktop |

## Non-Goals And Anti-Patterns

Do not:

- hide lanes with route-local conditionals in `GalleryScriptResults`;
- duplicate homepage display rules in tests only;
- hard-code adult tag strings in visual components;
- add empty placeholder facts to public reader metadata;
- fix mobile tap targets only in `apps/public` wrappers while leaving shared
  components small;
- parse `customMetadata` inside card components;
- use synopsis as hover outline or outline as the short summary unless the
  model explicitly defines that fallback;
- make hover-only content the only source of card context on mobile;
- treat browser QA findings as complete without viewport/theme evidence.
