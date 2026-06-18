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
  like/share/download actions

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
  share/download/like secondary actions

Work header
  cover / visual identity
  title
  author / org
  series position
  synopsis
  tags / rating / license summary
  start reading anchor

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
  download if available
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
- marker display semantics
- hidden marker behavior

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

  ReadPrimaryActions
    start reading
    TOC trigger/reference
    marker visibility
    reader preferences

  ReadSecondaryActions
    like
    share
    download

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
- Split primary reading controls from secondary engagement actions.
- Kept like/share/download in a secondary actions group.
- Kept marker/TOC/preferences in the shared reader toolbar.
- Added "Start reading" anchor from header to `#script-body`.
- Ensured author/org/tag links remain semantic anchors.
- Preserved all metadata currently available through `PublicScriptInfoOverlay`:
  cover/crop/design, license fields, rating, target audience, preface items,
  demo links, custom fields, views/likes/stats.
- Deleted app-local `PublicReaderHeader` and its test.
- Added `readWorkHeaderModel.test.ts` and `ReadWorkHeader.test.tsx`.
- Kept downloads on the same canonical browser download pipeline as Vite:
  `apps/public/lib/download.ts` and `src/lib/download.ts` both re-export
  `@write/browser-download`.

Definition of Done:

- [x] `ScriptReaderClient` becomes a thin assembly layer.
- [x] `ReadWorkHeader` renders from a stable model object, not raw `PublicScript`.
- [x] The header model is covered by pure tests.
- [x] Header integration tests cover title, author/org/tag links, series position,
  start-reading anchor, secondary actions, and license/rating metadata.
- [x] Header answers the work-orientation questions.
- [x] Script body starts predictably after the header.
- [x] Download/share/like remain available but do not dominate.
- [x] `PublicScriptInfoOverlay` is no longer the canonical read-page header boundary.
  If it still exists, it is either transitional or rebuilt from smaller shared
  primitives.
- [x] `PublicReaderHeader` does not remain as an unused competing header.

### Phase 3 — Canonical Series Navigation

Goal: one series navigation model, multiple visual variants.

Tasks:

- Replace `SeriesChapterNavBar` with `SeriesChapterNavigation`.
- Support `variant="header"` and `variant="footer"`.
- Show header variant near the work header for series scripts.
- Show footer variant after the script body.
- Use the same `SeriesChapterNav` data in both variants.
- Do not reintroduce `RelatedSeriesSection` for read-page chapter navigation.

Definition of Done:

- A series script clearly shows current chapter context before reading.
- Footer still supports next/previous after finishing.
- No duplicate chapter list or redundant related-section behavior.

### Phase 4 — Reading Ergonomics

Goal: improve actual long-reading comfort.

Tasks:

- Audit desktop line width and mobile spacing.
- Validate font-size/line-height preference effects on real script bodies.
- Add mobile-safe toolbar spacing.
- Add optional focused reading mode only if it integrates with existing reader preferences.
- Evaluate script-level resume/progress after series progress stabilizes.

Definition of Done:

- Long scripts remain readable on desktop and mobile.
- Toolbar does not obscure content.
- Reader preferences apply consistently.
- Marker visibility changes do not cause confusing layout jumps.

### Phase 5 — Browser QA and SEO Validation

Goal: verify the page in realistic runtime conditions.

Required QA:

- Desktop light mode.
- Desktop dark mode.
- Mobile viewport.
- Script with no series.
- Script with series and order.
- Script with series order `0`.
- Script with adult/rating tags.
- Script with custom marker theme.
- Long script.
- No cover image.
- Cover image with crop.

SEO validation:

- Inspect `<title>`.
- Inspect canonical URL.
- Inspect OG image/title/description.
- Inspect JSON-LD.
- Validate with Google Rich Results / schema tools when available.
- Confirm SSR summary remains crawler-visible and honest.

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

## Immediate Next Step

Start Phase 2 with `readWorkHeaderModel.ts`.

Reason:

- Phase 1 has already created the SEO model that Phase 2 can reuse for visible title and series labels.
- The next structural risk is not styling; it is header ownership and projection logic living inside `ScriptReaderClient`.
- A pure header model lets the UI move toward a canonical read-page composition without making `PublicScriptInfoOverlay` the long-term boundary.
