# Public Read Page SEO and UX Architecture

Last updated: 2026-06-18

## Purpose

The Next.js `/read/[id]` route is the canonical public reading surface for a script.

This document defines the long-term SEO and UX direction for the read page. It is intentionally not a visual tweak checklist. The read page must become a coherent product surface with stable metadata, explicit series semantics, high-quality reading ergonomics, and a maintainable component boundary.

The core product constraint is unique to this site: scripts are not generic articles. They are marker-aware screenplay documents, often grouped into series, and the reader experience depends on marker theme rendering, chapter navigation, and reading preferences.

## Non-Negotiable Principles

- The public read page is owned by `apps/public`.
- Script parsing, marker normalization, render blocks, TOC, and marker display remain shared package concerns.
- SEO metadata must be generated from a single model, not duplicated between `generateMetadata()` and page render.
- Series context is first-class content, not decoration.
- Reading controls must support the reading task without competing with the script body.
- Reader preferences are reading-specific and must stay connected to `@write/script-reader-ui` state.
- Public UI packages may provide router-neutral reader primitives, but must not own Next.js metadata, route handlers, or app-specific href builders.
- No production placeholder behavior. Missing data must produce explicit empty/unavailable states.
- Browser QA is required before major read page UI changes are marked done.

## Current State

### Already Strong

- `apps/public/app/read/[id]/page.tsx` owns route-level data loading and `generateMetadata()`.
- The page has canonical URL, Open Graph, Twitter card, JSON-LD, and SSR-visible summary content before the consent gate completes.
- Server-side parsing uses the canonical engine:
  - `resolveMarkerConfigs(script)`
  - `parseScreenplay(content, markerConfigs)`
  - `toRenderBlocks(ast, markerConfigs)`
- `ScriptReaderClient` receives render blocks and delegates rendering to `ScriptContentRenderer`.
- Reader preferences, TOC state, and marker visibility are centralized through `useReaderState`.
- Series chapter navigation now has a single public read-page representation instead of duplicated related-section UI.

### Structural Gaps

- Read-page SEO title is currently single-work oriented: `{script.title}｜Screenplay Reader`.
- Series metadata exists in the script payload but is not fully reflected in page title, description, JSON-LD, or breadcrumb semantics.
- JSON-LD is built separately in `generateMetadata()` and the page component, creating drift risk.
- `PublicScriptInfoOverlay` is complete but heavy; the read page still feels like a feature assembly rather than a refined reading surface.
- Series navigation exists, but placement and hierarchy are not yet optimized for readers entering mid-series.
- Download, share, like, TOC, marker visibility, and preferences are functionally present, but their hierarchy should be clarified.
- Mobile and long-script reading ergonomics need explicit acceptance criteria.

## External Product References

These references are used for product-pattern analysis, not for visual copying.

| Product / Source | Relevant Pattern | What To Learn | What Not To Copy |
|---|---|---|---|
| DLsite Library / Viewer | Purchased-content reading, library organization, zoom, bookmark/resume, single/double page modes | Reading tools should prioritize resume, view control, and low-friction content consumption | Do not copy manga/PDF page-flip mechanics for screenplay text |
| DLsite product ecosystem | Strong work metadata before access/reading | Treat metadata, rating, creator, sample/trial context as part of the purchase/read decision | Do not over-commercialize the public read page |
| AO3 | Work metadata, tags, warnings, chapter context, comments/kudos patterns | Fanwork readers need strong metadata, warnings, series/chapter navigation, and clear engagement affordances | Do not copy dense tag walls or overly utilitarian styling |
| Kakuyomu / web novel readers | Episode navigation, next/previous flow, reading continuity | Long-form serial reading benefits from visible current position and smooth next-episode navigation | Do not make the page feel like a generic novel reader if marker rendering is central |
| Syosetu-style web novels | Minimal prose-first reading surface | The text body should be calm and readable, with controls available but not dominant | Do not hide all metadata before readers can orient |
| Pixiv novels | Creator identity, tags, engagement, series discovery | Author and tag discovery can live close to the work without dominating the reading column | Avoid social noise around the script body |
| Medium / Substack | Clean article header, author context, share, reading-time pattern | Strong hierarchy: title, author, description, content; actions secondary | Do not treat screenplay content as an article paragraph stream |
| Ebook/PDF viewers | Resume, zoom/font settings, TOC/bookmark, full-screen reading | Reading preferences must feel persistent and reliable | Do not introduce page metaphors unless the content model supports them |

Reference links used while drafting:

- Google Search Central SEO starter guide: https://developers.google.com/search/docs/fundamentals/seo-starter-guide
- Google structured data intro: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data
- Google Article structured data: https://developers.google.com/search/docs/appearance/structured-data/article
- Nielsen Norman Group, How Users Read on the Web: https://www.nngroup.com/articles/how-users-read-on-the-web/
- Baymard, readability and line length: https://baymard.com/blog/line-length-readability
- Medium story page simplification: https://medium.com/blog/a-simpler-page-for-stories-on-medium-766eb75c6bd0
- DLsite Library app listing: https://play.google.com/store/apps/details?id=jp.co.eisys.dlsitebook.prod
- DLsite Viewer feature summaries found in public software listings: single/double page, zoom, bookmark/resume, simplified UI

## Target Product Shape

The read page should have four deliberate layers.

```text
Route layer
  fetch script
  build read-page SEO model
  resolve marker configs
  parse screenplay
  render SSR summary + consent gate

Reader state layer
  useReaderState
  marker visibility
  TOC state
  reader preferences
  series progress
  like actions

Reader shell layer
  top toolbar
  work header
  optional series context bar
  script body
  footer navigation

Renderer layer
  RenderBlockRenderer / ScriptContentRenderer
  marker styles
  hidden markers
  typography preferences
```

The page should not become a monolithic client component. It should remain route-driven, server-rendered, and model-based.

## SEO Architecture

### Target Files

Introduce:

```text
apps/public/lib/readPageSeo.ts
apps/public/lib/readPageSeo.test.ts
```

This model should be pure and deterministic.

### Owned Functions

```ts
buildReadPageTitle(script: PublicScript): string
buildReadPageDescription(script: PublicScript): string
buildReadPageCanonicalUrl(scriptId: string): string
buildReadPageStructuredData(script: PublicScript, scriptId: string): Record<string, unknown>
buildReadPageBreadcrumbData(script: PublicScript, scriptId: string): Record<string, unknown>
buildReadPageOpenGraph(script: PublicScript, scriptId: string): Metadata["openGraph"]
buildReadPageTwitterCard(script: PublicScript): Metadata["twitter"]
```

### Title Strategy

The title should reflect the reader's likely search intent.

| Script State | Title Format |
|---|---|
| No series, author exists | `{script.title}｜{authorName}｜Screenplay Reader` |
| No series, no author | `{script.title}｜Screenplay Reader` |
| Series with positive order | `{series.name} 第 {seriesOrder} 部：{script.title}｜Screenplay Reader` |
| Series with order `0` | `{series.name} 設定／背景：{script.title}｜Screenplay Reader` |
| Series without order | `{script.title}｜{series.name}｜Screenplay Reader` |

Rules:

- Keep title accurate and human-readable.
- Do not stuff generic keywords.
- Prefer series title before chapter title when chapter order is meaningful.
- Keep site name last.
- Use the same title for metadata, Open Graph, Twitter card, and visible SSR summary unless there is a deliberate accessibility reason not to.

### Description Strategy

Priority:

1. `script.synopsis`
2. generated description from `getScriptDescription(script)`
3. series-aware fallback:
   - `{series.name} 系列第 {N} 部，作者 {authorName} 的公開台本。`
4. generic fallback:
   - `免費線上閱讀公開台本。`

Descriptions should stay within a concise range and should not expose hidden body content beyond what the public API already exposes.

### Structured Data Strategy

Use `CreativeWork` as the base type because the work is a screenplay/script, not always an article.

Recommended fields:

- `@context`
- `@type: "CreativeWork"`
- `name`
- `headline`
- `url`
- `inLanguage: "zh-Hant"`
- `description`
- `isAccessibleForFree`
- `genre`
- `dateModified`
- `author`
- `publisher`
- `image`
- `isPartOf` when series exists:
  - `@type: "CreativeWorkSeries"`
  - `name`
  - `url`
- `position` when `seriesOrder` exists

Add a separate `BreadcrumbList`:

- Home
- Series page when applicable
- Current script

This matters for both SEO and user comprehension.

### Metadata Drift Rule

`generateMetadata()` and rendered `<script type="application/ld+json">` must call the same pure builder. The page component may inject additional crawler-visible summary HTML, but it must not rebuild its own JSON-LD by hand.

## UX Architecture

### Target Layout

```text
Sticky reader toolbar
  Back to discovery
  Short title / series context
  TOC
  marker visibility
  reader preferences

Work header
  cover / visual identity
  title
  author / org
  series position
  synopsis
  tags / rating / license summary

Series context bar
  series link
  current position
  previous / next
  latest chapter
  new chapter indicator

Script body
  marker-aware screenplay rendering
  stable typography width
  preferences applied consistently

Footer
  previous / next compact navigation
  series link
  return to list
```

### Toolbar Hierarchy

Primary controls:

- Back
- TOC
- Marker visibility
- Reader preferences

Secondary actions:

- Like
- Share
- Download

Do not force all controls into one visual weight. Reading controls should be easier to find than engagement controls.

### Work Header Requirements

The header must answer these questions before the reader starts:

- What am I reading?
- Who made it?
- Is it part of a series?
- Which part am I on?
- Is there rating/license/context I should know?
- Can I start reading immediately?

The header should not become a dashboard. Put detailed metadata behind compact sections or a "more info" area if needed.

### Series Navigation Requirements

There should be one canonical series navigation model and one component family.

Recommended component:

```text
SeriesChapterNavigation
  variant="header" | "footer" | "compact"
```

Responsibilities:

- Display series name and link.
- Display current position.
- Link previous and next chapters.
- Link latest chapter.
- Show new-chapter indicator from `useSeriesProgress`.
- Use the same `SeriesChapterNav` model everywhere.

Do not reintroduce separate related-series sections that duplicate chapter navigation.

### Reading Body Requirements

The script body is the primary product surface.

Requirements:

- Preserve marker rendering fidelity.
- Respect user preferences for font, size, line height, and theme.
- Avoid layout shifts when marker visibility changes.
- Keep line length readable on desktop.
- Avoid toolbar overlap on mobile.
- Keep scene/marker navigation accessible through TOC.
- Hidden marker state must be visible in toolbar, not surprising.

### Resume and Progress

DLsite-style viewer patterns are relevant here: readers expect resume and view-control persistence.

Recommended future model:

```text
public-reader:{scriptId}:reader:progress
  lastBlockId
  scrollRatio
  updatedAt

public-reader:{seriesName}:series:progress
  lastReadScriptId
  latestSeenScriptId
  latestSeenScriptUpdatedAt
```

Initial implementation can remain series-progress only, but the architecture should allow script-level resume later.

## Component Boundary Plan

### Keep in `apps/public`

- `page.tsx`
- `ScriptReaderClient`
- `ReadWorkHeader`
- `readWorkHeaderModel.ts`
- `usePublicReaderActions`
- `useSeriesChapterNav`
- `useSeriesProgress`
- route-specific href builders
- Next metadata builders or app-local SEO model

`ScriptReaderClient` should be an assembly layer only. It may wire reader state,
series hooks, action hooks, and render slots, but it should not know how to
project script metadata into a work header.

`readWorkHeaderModel.ts` owns the app-local public script projection for the read
header:

- author/org identity
- semantic href targets
- tag display and hrefs
- series label and position text
- synopsis and cover inputs
- reading stats
- rating/license summary
- preface/demo/custom metadata grouping
- action availability

### Candidate for `@write/public-ui`

Only if needed across more public routes:

- router-neutral `ReadWorkHeader` primitives
- router-neutral `SeriesChapterNavigation`
- work metadata display primitives

`@write/public-ui` may own visual primitives such as:

- `WorkCover`
- `WorkIdentity`
- `WorkMetadataBadges`
- `WorkLicenseSummary`
- `WorkPrefaceDetails`
- `WorkDemoLinks`

It should not own the Next read route model, app-specific hrefs, or SEO data.

### `PublicScriptInfoOverlay` Status

`PublicScriptInfoOverlay` is feature-complete but not the ideal long-term read
header architecture. It mixes cover rendering, title/synopsis, creator identity,
engagement metrics, license badges, tags, preface data, demo links, custom fields,
and layout styling in one component.

Long-term rule:

- Do not make `PublicScriptInfoOverlay` the canonical read-page header.
- Do not replace it with the app-local `PublicReaderHeader`, which is too small
  and drops important public metadata.
- Treat `PublicScriptInfoOverlay` as a transitional source of behavior and visual
  material while extracting smaller primitives.
- Once `ReadWorkHeader` owns the canonical composition, either delete
  `PublicReaderHeader` or convert it into a test-only fixture if still needed.
- `PublicScriptInfoOverlay` may remain as a compatibility composition only if it
  is rebuilt from the same smaller primitives used by `ReadWorkHeader`.

### Keep in `@write/script-reader-ui`

- reader preferences
- marker visibility menu
- TOC state and TOC menu
- reader toolbar primitives
- theme class hook

### Keep in `@write/script-reader-renderer`

- render block renderer
- presentation renderer (`ScriptPresentationRenderer`)
- presentation layout model, track routing, row grouping, and table export adapter
- marker display semantics
- hidden marker behavior

The old Vite `src/components/renderer/v2/*` and `src/lib/v2/*` paths are
compatibility facades only. New read-page work should use the `Presentation*`
API from `@write/script-reader-renderer`; `V2*` names are legacy aliases, not
the canonical architecture.

## Execution Plan

### Phase 1 — SEO Model Consolidation ✓ DONE (2026-06-18)

Goal: make read-page SEO accurate, series-aware, and non-duplicated.

Completed:

- Added `apps/public/lib/readPageSeo.ts` with pure functions:
  `buildReadPageTitle`, `buildReadPageDescription`, `buildReadPageCanonicalUrl`,
  `buildReadPageStructuredData`, `buildReadPageBreadcrumbData`,
  `buildReadPageOpenGraph`, `buildReadPageTwitterCard`
- `buildReadPageTitle` is series-aware (order, order=0, no-order, no-series variants).
- `buildReadPageDescription` has series-aware fallback chain matching doc spec.
- `buildReadPageStructuredData` emits `isPartOf` (CreativeWorkSeries) and `position` when applicable.
- `buildReadPageBreadcrumbData` emits 2-item (no series) or 3-item (with series) BreadcrumbList.
- `page.tsx` `generateMetadata()` calls the model for title/description/OG/Twitter. JSON-LD is NOT in `generateMetadata()` — it is injected only as a real `<script type="application/ld+json">` in the page component.
- Both `generateMetadata()` and page render share the same model; no duplicated construction.
- 16 tests pass (`apps/public/lib/readPageSeo.test.ts`).
- `npx tsc --noEmit` clean for all changed files.

Caveats / not done:

- `generateMetadata().other["application/ld+json"]` approach was intentionally skipped: Next.js `other` produces a `<meta>` tag, not a `<script>` block. JSON-LD is crawler-relevant only via real `<script>` injection in the page component.

### Phase 2 — Read Work Header Model and Canonical Composition ✓ DONE (2026-06-18)

Goal: turn the read page from "assembled feature blocks" into a deliberate,
model-driven reader page header.

This phase must not simply wrap `PublicScriptInfoOverlay`. A wrapper would reduce
local complexity in `ScriptReaderClient`, but it would preserve the wrong
long-term boundary: one large overlay component owning too many unrelated
responsibilities.

The desired architecture is:

```tsx
const headerModel = buildReadWorkHeaderModel({
  script: initialScript,
  seriesNav,
  actions,
});

return (
  <PublicReaderShell
    toolbar={<ReaderToolbar readerState={readerState} />}
    header={<ReadWorkHeader model={headerModel} actions={actions} />}
    footer={<ReadFooterNavigation ... />}
  >
    <section id="script-body">
      <ScriptContentRenderer ... />
    </section>
  </PublicReaderShell>
);
```

Target composition:

```text
ReadWorkHeader
  ReadHeroIdentity
    cover
    title
    author/org
    series position
    synopsis

  ReadMetadataSummary
    tags
    rating
    audience
    license summary

  ReadExpandableDetails
    preface items
    role settings
    chapter settings
    demo links
    custom fields
```

Completed:

- Added `apps/public/lib/readWorkHeaderModel.ts`.
- Moved author/org/tags projection from `ScriptReaderClient` into the model.
- Moved duration/dialogue estimate into the model.
- Moved `buildScriptOverlayProps(initialScript)` consumption into the model via a
  focused helper called by the model.
- Added `ReadWorkHeader` as the canonical read-page header composition.
- Removed the route-local "Start reading" / share / `.txt` download action bar.
  It duplicated the page's natural scroll behavior and made the header feel like
  a patched-on control strip.
- Kept likes in the work header via `PublicScriptInfoOverlay`.
- Kept marker/TOC/preferences in the shared reader toolbar.
- Deferred public reader download until it can use the same PDF/export option
  architecture as the Vite reader. The Next read page must not expose a
  route-local `.txt` download.
- Ensured author/org/tag links remain semantic anchors.
- Preserved all metadata currently available through `PublicScriptInfoOverlay`:
  cover/crop/design, license fields, rating, target audience, preface items,
  demo links, custom fields, views/likes/stats.
- Deleted app-local `PublicReaderHeader` and its test.
- Added `readWorkHeaderModel.test.ts` and `ReadWorkHeader.test.tsx`.

Definition of Done:

- [x] `ScriptReaderClient` becomes a thin assembly layer.
- [x] `ReadWorkHeader` renders from a stable model object, not raw `PublicScript`.
- [x] The header model is covered by pure tests.
- [x] Header integration tests cover title, author/org/tag links, series position,
  like action, absence of route-local CTA/download controls, and license/rating
  metadata.
- [x] Header answers the work-orientation questions.
- [x] Script body starts predictably after the header.
- [x] Likes remain available but do not dominate.
- [x] Route-local "Start reading", share, and `.txt` download controls are not
  rendered by the work header.
- [x] `PublicScriptInfoOverlay` is no longer the canonical read-page header boundary.
  If it still exists, it is either transitional or rebuilt from smaller shared
  primitives.
- [x] `PublicReaderHeader` does not remain as an unused competing header.

### Phase 3 — Canonical Series Navigation ✓ DONE (2026-06-18)

Goal: one series navigation model, multiple visual variants.

Completed:

- Replaced `SeriesChapterNavBar` with `SeriesChapterNavigation` (deleted old file).
- `variant="header"` — compact bar: series link, current position, prev/next, new-chapter badge.
- `variant="footer"` — full variant: series link, position, latest chapter hint, isLatest message, prev/next.
- `ScriptReaderClient` renders header variant above `ReadWorkHeader` for series scripts.
- `ScriptReaderClient` renders footer variant in footer for series scripts.
- Same `SeriesChapterNav` data model used by both variants.
- `RelatedSeriesSection` not reintroduced.
- 13 contract tests in `SeriesChapterNavigation.test.tsx` (header: series link, position, order=0, prev/next hrefs, disabled states, badge; footer: series link, latest chapter, isLatest, badge).
- `npx tsc --noEmit` clean.

### Phase 4 — Reading Ergonomics ✓ DONE (2026-06-18)

Goal: improve actual long-reading comfort.

Code audit completed:

- Desktop reading width is constrained by `PublicReaderShell` (`max-w-4xl`) and
  responsive horizontal padding (`px-4 sm:px-6`).
- Mobile scroll safety is supported by the reader shell content padding
  (`pb-32`) and the toolbar being rendered as a shell slot instead of a floating
  overlay inside script content.
- Reader preferences flow through the canonical reader state pipeline:
  `useReaderState` → `ScriptReaderClient` → `ScriptContentRenderer` →
  `RenderBlockRenderer`.
- Font family, font size, and line height are applied at the renderer article
  boundary, so preferences affect the whole script body consistently.
- Marker visibility remains a renderer concern (`hiddenMarkerIds`), not a
  read-page display filter.
- Focused reading mode is intentionally deferred. It should only be added if it
  becomes part of the existing reader preferences/state model; it must not be a
  route-local toggle.
- Script-level resume is intentionally deferred until series progress and
  per-script reader state have a single product definition.

Browser QA results (2026-06-18, dev :3000 + prod :1090):

- Desktop long-script (6335 chars): content at 848px wide, ~47 chars/line at
  18px — comfortable for screenplay dialogue format. ✓
- `#script-body` scroll lands correctly below the 49px sticky toolbar with no
  overlap, because `scrollIntoView` targets the nearest scrollable ancestor
  (the custom overflow-y-auto container), which excludes the fixed toolbar. ✓
- Mobile (390×844): series header nav wraps cleanly, content readable. ✓
- Toolbar (49px sticky) confirmed non-overlapping on both desktop and mobile. ✓
- Font-size/line-height/theme preferences persist via localStorage and apply
  on reload — confirmed dark→light theme round-trip. ✓
- Marker visibility: no marker-themed scripts in test data; pipeline confirmed
  correct at code level (`hiddenMarkerIds` passed to renderer). Deferred
  live test until marker-themed public scripts are available.

Definition of Done:

- [x] Code-level reading-width and spacing audit complete.
- [x] Reader preferences are wired through the canonical reader state and
  renderer pipeline.
- [x] Marker visibility is handled by the renderer layer.
- [x] Long scripts remain readable on desktop and mobile in browser QA.
- [x] Toolbar does not obscure content in browser QA.
- [x] Font-size/line-height changes feel stable in browser QA.
- [ ] Marker visibility live QA deferred — no marker-themed public scripts in
  test data; code path confirmed correct.

### Phase 5 — Browser QA and SEO Validation ✓ DONE (2026-06-18)

Goal: verify the page in realistic runtime conditions.

QA results (dev :3000 + prod :1090, Chrome DevTools MCP):

| Case | Result | Notes |
|---|---|---|
| Desktop light mode | ✓ | All elements contrast correctly |
| Desktop dark mode | ✓ | Default; matches design |
| Mobile 390×844 | ✓ | Series nav wraps, content readable |
| No series, no cover | ✓ | "NO COVER" placeholder, 2-item breadcrumb |
| No series, has cover | ✓ | OG image from cover URL |
| Series with order (女朋友 第2部) | ✓ | Header+footer nav, position label |
| Series order `0` | N/A | No test data with order=0; code path tested via unit tests |
| Adult/rating tags | N/A | No rated scripts in test data |
| Custom marker theme | N/A | No marker-themed public scripts in test data |
| Long script (6335 chars) | ✓ | Readable desktop+mobile |
| No cover image | ✓ | OG falls back to `/og/homepage.png` |
| Cover image | ✓ | OG uses real cover URL |

SEO validation (both :3000 and :1090):

- `<title>`: series-aware format confirmed (`女朋友 第 2 部：01-開關…｜Screenplay Reader`). ✓
- `description`: real content first line, not generic placeholder. ✓
- Canonical URL: correct absolute URL for both envs. ✓
- OG title/description: matches title/description. ✓
- OG image: cover URL when present, `/og/homepage.png` fallback. ✓
- JSON-LD `CreativeWork`: correct with `isPartOf`+`position` for series. ✓
- JSON-LD `BreadcrumbList`: 3-item for series, 2-item for standalone. ✓
- JSON-LD injected via `<script type="application/ld+json">` (not meta tag). ✓
- Prod build (:1090) SEO output identical to dev build (:3000). ✓

### Phase 6 — Marker-Based Presentation Renderer Canonicalization ✓ DONE (2026-06-22)

Goal: restore marker-driven multi-column reader behavior and prevent Next/Vite
renderer drift.

Completed:

- Added `@write/script-reader-renderer/src/presentation` as the canonical
  presentation stack.
- `ScriptPresentationRenderer` owns columns/timeline/linear mode selection.
- `ColumnsPresentationRenderer` restores marker/track-based multi-column layout.
- Presentation model helpers own layout config, marker semantic routing,
  orchestration, row grouping, and table export.
- Next read page now passes parsed AST into `ScriptPresentationRenderer` instead
  of precomputing `RenderBlock[]` for the linear block renderer.
- `src/components/renderer/v2/*` and `src/lib/v2/*` are compatibility facades
  around `@write/script-reader-renderer`; they no longer contain independent
  presentation implementation.
- Canonical DOM contract is `data-presentation-mode`; `data-v2-presentation`
  remains supported only as backward compatibility in export/print parsing.
- `PublicReaderShell` exposes semantic `contentWidth="presentation"` so
  multi-column desktop layout can widen without hurting mobile reading width.

Verification:

- Shared presentation package tests cover columns, timeline, linear mobile
  fallback, marker routing, synchronized rows, and table export.
- Next `ScriptReaderClient` integration test requires
  `data-presentation-mode="columns"` on desktop.
- Full test suite passed after the extraction.

## Anti-Patterns

Do not:

- Add SEO strings directly inside JSX.
- Change only the visible title while leaving metadata stale.
- Duplicate series navigation in separate components.
- Hide important controls behind hover-only affordances.
- Put all controls in the same visual priority.
- Treat marker visibility as a generic display filter.
- Add fake content for SEO.
- Use placeholder slides, placeholder metadata, or generic fallback prose as production behavior.
- Copy DLsite manga/PDF viewer mechanics into screenplay text reading.

## Status

All read-page SEO/UX phases complete as of 2026-06-22. PDF browser
print-preview QA remains tracked in `docs/architecture/read-page-download-architecture.md`.

| Phase | Status |
|---|---|
| Phase 1 — SEO Model Consolidation | ✓ DONE |
| Phase 2 — Read Work Header Model | ✓ DONE |
| Phase 3 — Canonical Series Navigation | ✓ DONE |
| Phase 4 — Reading Ergonomics | ✓ DONE |
| Phase 5 — Browser QA and SEO Validation | ✓ DONE |
| Phase 6 — Marker-Based Presentation Renderer Canonicalization | ✓ DONE |

Deferred items (not blockers):

- Marker visibility live QA — requires marker-themed public scripts.
- Series order `0` live QA — requires test data with `seriesOrder: 0`.
- Adult/rating tags live QA — requires rated public scripts.
- Public reader PDF print-preview QA — PDF toolbar action and shared export
  pipeline are implemented; final browser print-preview validation is tracked
  in `docs/architecture/read-page-download-architecture.md`.
