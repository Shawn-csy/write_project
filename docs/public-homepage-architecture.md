# Public Homepage Architecture Plan

Last updated: 2026-06-11

## Purpose

The Next.js public homepage should become the canonical public discovery surface for scripts, authors, organizations, tags, and editorial banners.

The Vite public gallery is a reference for existing product behavior, not the long-term owner. Public discovery must move toward a stable Next.js architecture with explicit data contracts, URL-addressable state, shared UI boundaries, and browser-verifiable parity.

This document defines the long-term architecture and execution plan for the public homepage. It is intentionally stricter than a feature checklist: every change should strengthen the system boundary instead of copying Vite behavior into another app-local implementation.

## Non-Negotiable Principles

- Next.js public pages are the canonical public runtime. Vite can remain useful for editor/workspace flows, but it must not be the source of truth for public discovery.
- Public homepage state that affects shareability, navigation, or SEO-relevant discovery must be URL-addressable.
- Filtering, segment classification, license derivation, banner parsing, and lane building are product semantics. They belong in shared model packages, not page components.
- App layers may own routing, server data loading, BFF route handlers, SEO metadata, and host-specific href builders.
- Shared packages may own pure models and reusable UI components, but must not import Next.js, Vite, app routers, auth contexts, or environment variables.
- Browser parity is required before declaring a phase done. Unit tests alone are insufficient for homepage work.
- Placeholder data is not acceptable as a long-term fallback. Empty, loading, and unavailable states must be explicit product states.

## Current State

### Already in the right direction

- `@write/public-ui` owns shared public UI primitives and gallery model code:
  - `ScriptGalleryCard`
  - `HorizontalScrollLane`
  - `PublicHeroMarquee`
  - `gallery/filterModel.ts`
  - `gallery/useGalleryFilterModel.ts`
  - `gallery/bannerModel.ts`
  - `server.ts` for server-safe exports
- `apps/public` owns Next.js routing, SSR page composition, BFF routes, and metadata.
- `apps/public/app/GalleryClient.tsx` has already been split into smaller app-local composition pieces:
  - `GalleryTopBar`
  - `GalleryFilterPanel`
  - `GalleryMobileSheet`
  - `GalleryPeopleGrid`
  - `GalleryScriptResults`
  - `useGalleryController`
- `apps/public/lib/galleryProjection.ts` centralizes public API projection into gallery model inputs.
- `/api/public-bundle`, `/api/public-personas`, and `/api/public-organizations` proxy backend calls through same-origin BFF routes.

### Remaining structural gaps

- Homepage URL state is incomplete. `useGalleryController` still owns important discovery state in local React state.
- `featuredLaneMode` is currently hard-coded to `"latest"` in the Next controller.
- Script tags are modeled, but author/org tag filters are not wired into the Next controller.
- `PublicHeroMarquee` can still render default placeholder slides when banner data is absent.
- Topbar/product navigation is not yet a canonical public shell. Next currently has a simpler topbar than the Vite reference.
- Help, license, about, and other public informational views are route pages, but not yet part of a unified homepage navigation model.
- Consent/age gates for script navigation from discovery are not yet represented as homepage navigation policy.
- Browser parity is not yet captured as repeatable acceptance criteria.

## Package Boundaries

### `@write/public-ui`

Shared public discovery and presentation package.

Owns:

- pure gallery filtering and enrichment model
- banner parsing model
- reusable public cards and lanes
- reusable public shell primitives that are router-neutral
- browser-independent UI behavior tests

Does not own:

- Next.js route handlers
- React Router navigation
- environment variables
- backend fetch calls
- SEO metadata
- auth/session state
- persisted user identity

### `@write/public-ui/server`

Server-safe entrypoint for pure functions only.

Owns:

- banner parsing exports
- filter/enrichment model exports
- homepage model builders once introduced

Must not export:

- React hooks
- React components
- browser-only code
- router-dependent code

### `apps/public`

Next.js public frontend.

Owns:

- route files and page composition
- `generateMetadata` and structured data
- BFF route handlers
- public API data loading
- URL state integration with `next/navigation`
- host-specific href builders
- integration smoke tests

Does not own:

- duplicated filter semantics
- duplicated banner parsing
- duplicated gallery card behavior
- license/segment derivation logic
- public discovery lane algorithms

### Vite app

Reference and compatibility surface during migration.

Owns:

- editor/workspace runtime concerns
- compatibility wrappers if needed

Does not own:

- canonical public homepage behavior
- future public discovery semantics
- Next public UI contracts

## Target Homepage Shape

The final public homepage should have a thin Next.js client layer.

```tsx
const urlState = usePublicHomepageUrlState();
const data = usePublicHomepageData(initialData);
const model = buildPublicHomepageModel({
  scripts: data.scripts,
  authors: data.authors,
  orgs: data.orgs,
  banner: data.banner,
  state: urlState.value,
});

return (
  <PublicHomepageShell
    model={model}
    state={urlState.value}
    actions={urlState.actions}
    hrefs={hrefs}
  />
);
```

The important constraint is that `apps/public` composes the page, but does not independently derive product semantics.

## URL State Contract

The following state should be representable in the URL because it affects what the user is viewing and should survive refresh, sharing, back/forward navigation, and analytics.

| Query Param | Values | Owner | Status |
|---|---|---|---|
| `view` | `scripts`, `authors`, `orgs`, `help`, `license`, `about` | `apps/public` URL adapter + shared type | Not done |
| `tag` | repeated or encoded script tag values | shared URL model | Partial |
| `authorTag` | repeated or encoded author tag values | shared URL model | Not done |
| `orgTag` | repeated or encoded org tag values | shared URL model | Not done |
| `usage` | `all`, `commercial` | shared URL model | Local state only |
| `segment` | `all`, `all-ages`, `adult`, `male`, `female` | shared URL model | Local state only |
| `mode` | `standard`, `compact` | shared URL model | Local state only |
| `lane` | `featured`, `top`, `latest`, `series` | shared URL model | Hard-coded |

Implementation requirements:

- Unknown query values must normalize to safe defaults.
- Empty/default values should be omitted from the URL.
- URL serialization must be deterministic.
- Repeated tag params should preserve stable ordering after normalization.
- Local state may remain only for transient UI state such as mobile sheet open/closed and filter text input that is not meant to be shareable.

## Data Contract

### Public bundle

`/api/public-bundle` should provide the first meaningful homepage paint.

Required data:

- scripts
- banner payload

Allowed future data:

- precomputed featured lanes
- top tags
- editorial modules

Rules:

- The route must remain dynamic unless backend cache semantics become explicit.
- Projection from backend shape to public UI shape belongs in `apps/public/lib/galleryProjection.ts` or a shared package if both hosts need it.
- Missing banner data should produce a deliberate no-banner state, not placeholder slides.

### People data

`/api/public-personas` and `/api/public-organizations` may remain lazy-loaded, but their state must be explicit.

Required states:

- not requested
- loading
- loaded
- failed

The UI should not silently collapse failure into empty results.

## Homepage Model Contract

Introduce a pure `buildPublicHomepageModel()` after URL state is stable.

It should own:

- selected view
- selected tags
- selected author/org tags
- segment and usage filters
- view mode
- featured lane mode
- result counts
- empty-state classification
- scripts lanes:
  - featured
  - latest
  - top viewed
  - series
- author and org filtered collections
- visible filter chips
- mobile/desktop invariant labels and counts

It should not own:

- React state
- click handlers
- route mutation
- fetch calls
- localStorage
- i18n context

## Parity Contract

The public homepage is considered replacement-ready only when these categories are explicitly handled.

| Category | Required Capability | Owner | Status |
|---|---|---|---|
| Server data | SSR receives scripts and banner payload | `apps/public` | Partial |
| Banner | Backend banner parsed through one pure model | `@write/public-ui/server` | Partial |
| Banner fallback | No placeholder slides in production fallback | `@write/public-ui` + `apps/public` | Not done |
| Script filtering | Search, segment, usage, license tags | `@write/public-ui` | Mostly done |
| Author/org filtering | Author and org tag filters | `@write/public-ui` + `apps/public` | Not done |
| URL state | Shareable view/filter/mode/lane state | shared model + `apps/public` | Not done |
| Featured lanes | Featured/latest/top/series modes | shared homepage model | Partial |
| Cards | Valid semantic card DOM and href/callback support | `@write/public-ui` | Done |
| Topbar | Canonical public navigation shell | `@write/public-ui` + `apps/public` | Partial |
| Info views | Help/license/about reachable from public shell | `apps/public` | Partial |
| Navigation policy | Terms/R18 gates from discovery to reader | `apps/public` | Not done |
| SEO | Homepage metadata and no-script fallback | `apps/public` | Partial |
| Browser QA | Desktop/mobile/light/dark checked | manual + future visual tests | Not done |

## Execution Plan

### Phase 1: Contract Document ✓ Current

Goal: establish the long-term public homepage contract before adding more UI.

Completion standard:

- Architecture boundaries are explicit.
- URL state contract is defined.
- Data contract is defined.
- Parity categories have owners.
- No open item is described only as "match Vite"; each item has a product/system reason.

### Phase 2: URL State Model ✓ Done

Goal: make public discovery state shareable, deterministic, and testable.

Work completed:

1. `packages/public-ui/src/gallery/galleryUrlState.ts` — pure parse/serialize/merge model, no React.
2. `PublicHomepageUrlState` defines `view | tags | authorTags | orgTags | usage | segment | mode | q`.
3. `parseGalleryUrlState`, `serializeGalleryUrlState`, `mergeGalleryUrlState`, `isDefaultGalleryUrlState` implemented.
4. 37 unit tests covering defaults, invalid values, whitespace tag normalization, deduplication, sort ordering, and round trips.
5. `apps/public/app/gallery/useGalleryUrlState.ts` — Next.js adapter; push for discrete actions, replace for search input.
6. `useGalleryController` reads all shareable state from URL; only `mobileFilterOpen` and `tagSearch` remain local.
7. `page.tsx` wraps `GalleryClient` in `<Suspense>` as required by `useSearchParams`.

Exported from `@write/public-ui` and `@write/public-ui/server`.

Known caveats deferred to later phases:

- `lane` (featured/top/latest/series): type `GalleryLaneMode` exported but not yet in `PublicHomepageUrlState`. Will be added in Phase 4 when `buildPublicHomepageModel` drives lane selection in the UI.
- `view` currently `"scripts" | "authors" | "orgs"`. Will expand to include `"help" | "license" | "about"` in Phase 5 when public shell navigation is unified.

Completion standard met:

- Refresh preserves selected view, filters, mode, and search term.
- Browser back/forward works for view/filter/tag/segment changes.
- Search input uses replace — back/forward does not step through individual keystrokes.
- Default homepage URL remains clean (no query params).
- Tests cover parse/serialize round trips, whitespace normalization, deduplication, and invalid value handling.

### Phase 3: Banner Contract Cleanup

Goal: remove placeholder-driven behavior and make banner data a real product contract.

Work:

1. Make `parseBannerSlides` return only backend-provided slides.
2. Remove production use of default placeholder slides.
3. Represent missing banner as no-banner state.
4. Decide whether development/demo placeholder slides belong in Storybook/test fixtures only.
5. Add tests for absent, malformed, and valid banner payloads.

Completion standard:

- Production homepage never shows "Marquee Placeholder" content.
- Missing banner data does not create layout breakage.
- Server and client refresh paths use the same parser.

### Phase 4: Public Homepage Model

Goal: move view derivation out of page components.

Work:

1. Add `buildPublicHomepageModel()` in `@write/public-ui`.
2. Move lane selection and result counts into the model.
3. Add explicit empty/loading/failure model states.
4. Wire `GalleryClient` to consume the model instead of deriving display semantics locally.
5. Add model fixture tests for representative datasets.

Completion standard:

- `GalleryClient` becomes a composition layer.
- Filtering and lane behavior can be tested without React.
- Author/org/script results share one model vocabulary.

### Phase 5: Public Shell Convergence

Goal: make the public homepage shell coherent across desktop and mobile.

Work:

1. Define a router-neutral public topbar component or shell primitive in `@write/public-ui`.
2. Support scripts/authors/orgs/help/license/about navigation.
3. Expose slots for host-specific login/studio/actions.
4. Move reusable filter panel and mobile sheet primitives to shared UI if their behavior is stable.
5. Keep Next-specific href and route mutation in `apps/public`.

Completion standard:

- Topbar behavior is not duplicated across apps.
- Help/license/about are part of the same navigation model.
- Mobile and desktop expose equivalent public discovery actions.

### Phase 6: Navigation Policy

Goal: make script entry from discovery respect public reader policy.

Work:

1. Define when terms consent or age gate applies before navigating to `/read/:id`.
2. Keep policy data in script projection or public bundle response.
3. Implement router-neutral UI where possible and Next-specific navigation in `apps/public`.
4. Add integration tests for gated and ungated script navigation.

Completion standard:

- Discovery-to-reader behavior matches reader policy.
- Gated navigation is explicit and testable.
- Direct reader route remains independently protected.

### Phase 7: Browser Acceptance

Goal: make visual/product parity concrete.

Required manual checks for every homepage phase:

- desktop `1280x800`
- mobile `390x844`
- light theme
- dark theme
- scripts view
- authors view
- orgs view
- filtered URL reload
- browser back/forward after filter changes
- banner absent and banner present
- tag/author/org navigation
- script navigation into reader

Completion standard:

- Screenshots or notes are attached to the phase review.
- Any visual drift is categorized as accepted, blocked, or requiring a follow-up.

## Immediate Next Step

Implement Phase 3: Banner contract cleanup — remove placeholder slides from production fallback, make missing banner an explicit no-banner state.

Do not start with topbar or visual polish. Phase 3 is prerequisite to Phase 4 (homepage model), which is prerequisite to URL-controlled lane selection.

## Known Risks

- Blindly copying Vite will preserve old coupling and create a second legacy implementation.
- Leaving filter state in React local state makes public discovery hard to share, test, and debug.
- Keeping placeholder banner slides hides backend/data contract failures.
- Moving too much into `@write/public-ui` too early can create a generic package with app-specific concerns. Promote code only when the boundary is clear.
- Treating browser parity as optional will miss layout, density, and mobile interaction regressions that unit tests cannot detect.
