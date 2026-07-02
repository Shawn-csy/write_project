# Public Homepage SSR Data Architecture

## Problem

The public homepage must be useful to both users and crawlers from the initial
HTML. The current risk is that the interactive gallery can become client-only
or receive empty build-time data, leaving Googlebot with metadata but no
discoverable `/read/[id]` links.

Observed production state before this workstream:

- `/api/public-bundle` returned live public scripts.
- `/` returned `x-nextjs-cache: HIT` and `x-nextjs-prerender: 1`.
- The homepage React payload contained `initialScripts: []`.
- The initial HTML had no `/read/` links.

The root causes were:

- Build-time or ISR prerender could run while the backend was unavailable.
- `fetchBundle()` swallowed all errors and returned an empty homepage.
- `GalleryClient` used `useSearchParams()`, causing
  `BAILOUT_TO_CLIENT_SIDE_RENDERING` for the gallery subtree.
- Temporary SSR fallback sections duplicated the real gallery UI.

## Goals

- The homepage initial HTML contains real `/read/[id]` links.
- Users and crawlers see the same primary content. No hidden crawler-only links.
- The main gallery is server-rendered first and enhanced by client controls.
- Banner parse failures cannot erase the script list.
- Homepage rendering policy is explicit and cannot cache build-time empty data.
- Read pages remain fully SSR-rendered and remain the primary SEO surface.

## Non-Goals

- Do not rewrite the public gallery data model.
- Do not SSR authors/orgs tabs in this workstream; those can continue to fetch
  on demand.
- Do not change read page SEO architecture.
- Do not use `sr-only`, `aria-hidden`, `display:none`, or hydrate-after-hide as
  the long-term SEO strategy.

## Current Implementation Status

### Done

- `/` now uses an explicit dynamic rendering policy:

```ts
export const dynamic = "force-dynamic";
```

This prevents Docker build-time backend failures from becoming a cached empty
homepage.

- `fetchBundle()` was split so banner parsing failure no longer erases scripts.
- `useGalleryUrlState()` no longer imports `useSearchParams()`.
- `page.tsx` parses `searchParams` on the server and passes `initialUrlState`
  into `GalleryClient`.

### Transitional, Not Final

`GalleryServerContent` currently renders a static server card grid and passes it
as `children` to `GalleryClient`; `GalleryClient` hides it after hydration.

This is an improvement over a separate "最新公開台本" footer fallback, but it is
not the final architecture. It still has two render paths:

1. static SSR grid for initial HTML
2. client gallery after hydration

The final architecture must remove this replacement pattern and make the
server-rendered gallery the same primary content that users keep seeing.

## Target Architecture

Split the homepage into a server-owned shell and client-owned controls.

### Server Shell

The server layer owns initial visible content:

- top bar shell
- hero / brand slide
- initial script lanes or grid
- `/read/[id]` links
- stable empty/loading/error states for the initial script view

This layer is rendered from the same public bundle data that powers client
hydration. It is not hidden after hydration.

### Client Controls

The client layer owns interaction:

- search
- segment filters
- tag filters
- usage filter
- lane/view mode switches
- mobile filter sheet
- hover preview
- client-side refresh from `/api/public-bundle`

Client controls should enhance and update the server-rendered content, not
replace it with a parallel UI.

### URL State

URL state is parsed on the server for the initial render:

```ts
const initialUrlState = parseGalleryUrlState(searchParams);
```

After hydration, client interactions update the URL using
`history.pushState()` / `history.replaceState()` and update React state
synchronously. `useSearchParams()` should not be reintroduced into the homepage
gallery path.

## Execution Plan

### Phase 1 — Stabilize Data Boundary

Status: complete.

Acceptance criteria:

- [x] `fetchBundle()` request failure is isolated and observable.
- [x] banner parse failure does not erase `initialScripts`.
- [x] missing `homepageConfig` defaults to `showBrandHero = true`.
- [x] homepage uses `dynamic = "force-dynamic"` while SSR contract is being
      stabilized.

### Phase 2 — Remove CSR Bailout

Status: complete.

Acceptance criteria:

- [x] `useGalleryUrlState()` does not import `useSearchParams()`.
- [x] `page.tsx` parses URL state from server `searchParams`.
- [x] `GalleryClient` receives `initialUrlState`.
- [x] URL writes still use native history and remain synchronous.

### Phase 3 — Transitional SSR Discovery Grid

Status: partial / transitional.

Acceptance criteria:

- [x] The old "最新公開台本" footer fallback section is removed.
- [x] Initial HTML can include `/read/[id]` links through
      `GalleryServerContent`.
- [ ] The SSR grid is not hidden after hydration.
- [ ] There is one primary gallery render path, not a static grid replaced by a
      client gallery.

### Phase 4 — Final Server Gallery Shell

Replace the transitional `GalleryServerContent` slot with a server-rendered
gallery shell that remains visible after hydration.

Implementation direction:

- Extract a server-safe renderer for the initial script view.
- Reuse shared card primitives or a shared card model so server and client do
  not drift.
- Keep client controls separate from initial content.
- Hydration should attach controls and update state, not hide server content.

Acceptance criteria:

- [ ] Initial HTML has script cards with `/read/[id]` links.
- [ ] The same cards remain visible after hydration.
- [ ] No homepage content is hidden solely because the client mounted.
- [ ] No duplicate script card UI appears.
- [ ] `curl -sA "Googlebot" https://open-scripts.shawnup.com/ | grep -c '/read/'`
      returns at least the intended SSR card count.

### Phase 5 — Production Verification

After deployment, run:

```bash
curl -sI https://open-scripts.shawnup.com/ \
  | grep -i 'x-nextjs-cache\|x-nextjs-prerender\|cache-control'

curl -sA "Googlebot" https://open-scripts.shawnup.com/ \
  | grep -c '/read/'

curl -sA "Googlebot" https://open-scripts.shawnup.com/ \
  | grep -i 'bailout\\|最新公開台本'

curl -sA "Googlebot" https://open-scripts.shawnup.com/read/cc3cf201-9676-4f6e-8267-64390d42ffe5 \
  | grep -E '<title>|<meta name="description"|<link rel="canonical"|<h1|application/ld\\+json'
```

Expected:

- `/favicon.ico`, `/favicon.svg`, and `/apple-touch-icon.png` return 200.
- `/sitemap.xml` returns 200.
- Homepage initial HTML includes `/read/` links.
- Homepage response does not include `BAILOUT_TO_CLIENT_SIDE_RENDERING`.
- The removed fallback heading `最新公開台本` does not reappear unless it is a
  deliberate visible product section.
- Read pages remain SSR healthy.

### Phase 6 — Revisit Caching Strategy

Once the final server gallery shell is stable, decide whether `/` should remain
dynamic or use controlled ISR.

If ISR is reintroduced:

- deploy scripts must revalidate `/` and `/sitemap.xml` after backend and public
  containers are healthy
- `fetchBundle()` must never silently cache empty data
- production monitoring should alert when homepage `/read/` link count drops to
  zero

## Definition of Done

- [x] Homepage loader fails partially, not globally.
- [x] Banner parse failure cannot erase script links.
- [x] Homepage rendering policy is explicit: dynamic now, controlled ISR later.
- [x] URL state no longer depends on `useSearchParams()`.
- [ ] Initial homepage HTML contains `/read/` links from the primary gallery.
- [ ] Server-rendered gallery content remains visible after hydration.
- [ ] No duplicate homepage script card UI.
- [ ] SEO checklist verifies homepage discovery links before Search Console
      submission.
- [ ] Production verification confirms read pages remain SSR healthy.
