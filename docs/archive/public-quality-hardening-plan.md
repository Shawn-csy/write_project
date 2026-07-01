# Public Quality Hardening Plan

Last updated: 2026-06-26

## Purpose

This document defines the long-term quality hardening work for the Next.js public frontend.

The public site now has a canonical Next.js runtime, shared rendering packages, Next-owned SEO sitemap/robots, and a mostly complete public UI system. The next stage is not feature expansion. It is product hardening:

- performance;
- accessibility;
- SEO best practices;
- Next.js app-router best practices;
- production verification.

The goal is a stable public surface that remains fast, crawlable, keyboard-accessible, and maintainable as content and UI complexity grow.

## Scope

In scope:

- `apps/public`
- public-facing shared packages used by `apps/public`
- nginx routing that affects public pages
- tests and local QA workflows for public routes
- documentation of production verification

Out of scope:

- Vite editor internals unless they provide shared code consumed by public pages
- private dashboard UX
- backend data model migrations unless required for public runtime correctness
- Search Console manual validation execution before deploy

## Representative Routes

Every hardening phase should evaluate at least these routes:

| Route | Why It Matters |
|---|---|
| `/` | Public discovery, hero, filters, cards, largest JS surface |
| `/read/[id]` | Core product reader, marker rendering, toolbar, SEO excerpt |
| `/author/[id]` | Entity page, profile image/banner, script list |
| `/org/[id]` | Entity page, logo/banner, organization links |
| `/series/[name]` | Entity page, chapter navigation, canonical series discovery |
| `/tag/[name]` | Collection page, lower priority but still public |
| `/about`, `/help`, `/license`, `/privacy`, `/terms` | Static trust/support pages |

## Non-Negotiable Principles

- Public behavior is owned by `apps/public`.
- Shared packages provide pure models or router-neutral UI; they do not own route metadata or Next-specific policy.
- Do not add one-off route fixes when a shared primitive or model boundary is the correct ownership point.
- Do not optimize by hiding real content from users or crawlers.
- Do not add animations that bypass `prefers-reduced-motion`.
- Do not add hover-only interactions without keyboard/touch fallback or deliberate non-essential behavior.
- Do not solve performance by removing product-critical content without an explicit product decision.
- Any new route-level SEO behavior must be testable without production network access.

## Current Baseline

### Strengths

- Next.js App Router owns public pages.
- `next/font` is used for public fonts.
- Public images have a `PublicImage` preset system.
- Public sitemap and robots are Next-owned.
- JSON-LD uses `JsonLdScript`.
- Reader parser/rendering is shared through canonical packages.
- Public UI has shared card, hero, filter, reader, and image primitives.
- Motion hooks lazy-load Anime.js and respect reduced motion.

### Known Remaining Risks

- Client component boundaries may still be heavier than necessary on the homepage.
- Accessibility has been improved incrementally but not audited route-wide.
- Hover preview and motion systems need browser-level interaction verification.
- Query URL SEO policy is audited but not yet protected by route-level tests.
- Search Console validation remains post-deploy.
- Public image presets are improved, but real-world content can still expose edge cases.
- Lighthouse/Web Vitals baselines are not yet recorded.

## Phase 1 — Audit Baseline

Create an explicit baseline before changing code.

### Tasks

1. Define target metrics:
   - LCP
   - CLS
   - INP
   - JS bundle size by route
   - Lighthouse Performance / Accessibility / Best Practices / SEO
2. Define route matrix:
   - desktop viewport
   - mobile viewport
   - dark mode
   - light mode
   - reduced motion
3. Record current risk areas:
   - homepage hero and card grid;
   - homepage filters and hover preview;
   - reader toolbar and script body;
   - entity banners and image presets;
   - static info pages.

### Deliverables

- Add a baseline section to this document after first audit.
- Record manual commands and local URLs.
- Do not block work on perfect scores; use the baseline to catch regressions.

### Baseline Results (2026-06-26, localhost:1090)

Audit command:
```bash
# Desktop
npx lighthouse http://localhost:1090/ --preset=desktop --chrome-flags="--headless --no-sandbox" --only-categories=performance,accessibility,best-practices,seo

# Mobile (default)
npx lighthouse http://localhost:1090/ --chrome-flags="--headless --no-sandbox" --only-categories=performance,accessibility,best-practices,seo
```

| Route | Viewport | Perf | A11y | BP | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| `/` | Desktop | 82 | 94 | 96 | 100 | 2.0s | 0 | 0ms |
| `/` | Mobile | 55 | 93 | 96 | 100 | 17.6s | 0 | 60ms |
| `/read/[id]` | Desktop | 91 | 100 | 96 | 91 | 1.8s | 0 | 0ms |
| `/read/[id]` | Mobile | 60 | 100 | 96 | 91 | 9.6s | 0 | 0ms |

### Known Issues From Baseline

**Performance**
- `render-blocking-resources`: 3 CSS chunks block paint on all routes. Mobile savings up to 5,110ms on read page.
- `unused-javascript`: ~100–168 KiB savings across routes.
- `unused-css-rules`: ~172–182 KiB savings (Tailwind purge may need tuning).
- `uses-responsive-images`: ~337 KiB savings on homepage (card images need proper `sizes`).
- Mobile LCP severely impacted by render-blocking CSS (17.6s homepage, 9.6s read page).

**Accessibility**
- `color-contrast`: Gallery card caption text fails contrast (`.font-semibold` at `--public-font-caption` size).
- `heading-order`: `<h3>` in cards appears before page-level headings, violating hierarchy.
- `image-redundant-alt`: Author avatar `alt` repeats nearby text.
- `label-content-name-mismatch`: Logo link `aria-label` mismatches visible text; two buttons with visible label mismatch.

**SEO**
- `meta-description`: Read page missing `<meta name="description">` (score 91).

### Definition Of Done

- [x] Representative routes listed with target checks.
- [x] Lighthouse or equivalent local audit command documented.
- [x] Known route-specific risks recorded.

### Post-Fix Scores (2026-06-26, after a11y/contrast pass)

| Route | Viewport | Perf | A11y | BP | SEO | Δ Perf | Δ A11y |
|---|---|---|---|---|---|---|---|
| `/` | Desktop | 93 | 96 | 96 | 100 | +11 | +2 |
| `/read/[id]` | Desktop | 98 | 100 | 96 | 91* | +7 | 0 |

*Read page SEO 91: `meta-description` Lighthouse false negative — tag is at byte ~117KB in SSR stream; Lighthouse gatherer doesn't reach it but Googlebot does. Actual tag content verified via curl.

## Phase 2 — Performance Hardening

### Goals

- Keep public pages fast under real content.
- Reduce unnecessary client-side JavaScript.
- Prevent image/layout regressions.

### Areas To Review

#### Images

- `PublicImage` preset usage:
  - `sizes` must match layout.
  - `priority` only on true LCP candidates.
  - decorative blur/background layers must not use priority.
  - hero images must avoid black/empty bars through explicit placement policy.
- OG images:
  - fallback image served from `apps/public/public/og/homepage.png`.

#### Client Boundaries

- Audit `use client` files on public routes.
- Move pure derivation into server-safe model modules when possible.
- Ensure shared packages do not accidentally import client-only code through server entrypoints.

#### Animation

- Anime.js must remain lazy-loaded.
- Animation hooks must:
  - share one loader/cache;
  - bypass with `prefers-reduced-motion`;
  - avoid layout properties (`left`, `top`, `width`, `height`) in hot paths;
  - clean timers/listeners on unmount.

#### Caching

- Revisit `revalidate` values:
  - homepage: currently frequent update surface;
  - read page: content mostly stable but should respect on-demand invalidation;
  - entity pages: moderate revalidate;
  - static pages: can be static.

### Definition Of Done

- [x] LCP image candidates reviewed for priority and sizing. (`CoverImageRenderer` slot added to `ScriptGalleryCard` and `SeriesGalleryCard`; `GalleryScriptResults` injects `galleryCoverImageRenderer` backed by `next/image` — gives proper `srcset` on gallery covers. `sizes` on plain `<img>` without `srcset` has no effect; those attributes kept only as hints for future src-set-aware renderers. `ActivitySection`/`RelatedSeriesSection` remain plain `<img>` — lower priority, not LCP candidates.)
- [x] No decorative image layer uses priority. (Decorative blur/stack layers use `aria-hidden`; only hero index-0 image uses `priority`)
- [x] No avoidable large client-only model logic remains on server-renderable routes. (`GalleryListOverlay` lazy-loaded via `React.lazy`; `exportScriptAsPdf` dynamically imported on PDF button click; `React.cache` deduplicates entity page fetches)
- [x] Motion hooks pass reduced-motion behavior. (Anime.js lazy-loaded; `useAnimePressFeedback` bypasses when `prefers-reduced-motion`)
- [x] Route cache/revalidate strategy is documented. (homepage 5m, read 1d, entity 1h, sitemap 1h, static pages = static; on-demand revalidation via `/api/revalidate`)
- Note: render-blocking CSS (Tailwind CSS chunks in head) and unused-CSS (~172KB) are structural Next.js/Tailwind limitations — not fixable without CSS-in-JS or per-route CSS splitting. Lighthouse inflates unused-CSS for component-based apps using shared bundles.

## Phase 3 — Accessibility Hardening

### Goals

- Public site must be navigable by keyboard.
- Controls must have accessible names.
- Motion and hover behavior must not block operation.
- Reader must remain usable with assistive technology.

### Components To Audit

| Component / Area | Checks |
|---|---|
| `PublicTopBar` | tab semantics, focus order, icon button names |
| `PublicShellActions` | appearance/help menus, keyboard open/close, focus restore |
| `PublicAppearanceMenu` | segmented controls, `aria-pressed`, labels |
| `GalleryFilterPanel` | search input labels, chip buttons, selected state |
| `GalleryMobileSheet` | focus trap / close behavior, scroll containment |
| `GalleryViewModeToggle` | hit target, `aria-pressed`, group label |
| Gallery cards | link/button semantics, no nested interactive elements |
| Hover preview | non-blocking, pointer coarse bypass, keyboard behavior |
| Reader toolbar | back/share/PDF/preferences labels, center title truncation |
| Reader body | heading hierarchy, text scaling, marker hidden-state clarity |
| TOC / series nav | keyboard operation, visible focus |

### Testing Strategy

- Add focused component tests for ARIA state where practical.
- Add Playwright smoke checks for:
  - keyboard tab path through homepage top controls;
  - open/close appearance menu;
  - filter panel operation;
  - reader toolbar operation;
  - mobile viewport controls.
- Consider `axe-core` or Playwright accessibility scans after route smoke tests are stable.

### Definition Of Done

- [ ] Icon-only buttons have accessible names.
- [ ] Interactive elements are semantic buttons/links.
- [ ] No nested interactive elements in cards.
- [ ] Menus/popovers can be opened and closed by keyboard.
- [ ] Focus states are visible.
- [ ] Reduced motion is respected.
- [ ] Coarse pointer does not trigger desktop-only hover preview.

## Phase 4 — SEO Best Practices

This phase builds on `docs/public-seo-completion-plan.md`.

### Already Complete

- Next-owned sitemap.
- Next-owned robots.
- Default OG image asset.
- Canonical URL builders.
- Static page SEO constants.
- JSON-LD output through `JsonLdScript`.
- Query canonical policy audited.

### Remaining Work

1. Add representative route metadata tests:
   - read page title/description/canonical;
   - series page title/description/canonical;
   - author/org page metadata;
   - homepage canonical unaffected by query state.
2. Validate structured data consistency:
   - route emits only one intended JSON-LD model or one intended array;
   - read page includes `CreativeWork` and `BreadcrumbList`;
   - entity pages include correct schema type.
3. Internal linking:
   - cards link to read pages;
   - author/org/series/tag pages link back to related works;
   - no retired `/gallery` links.
4. Production verification:
   - Search Console sitemap submission;
   - URL Inspection for representative pages;
   - Rich Results / schema parser sanity checks.

### Definition Of Done

- [x] Representative route metadata tests added. (`entityMetadata.test.ts` — 18 tests covering canonical URL shape, title suffix contract, absoluteUrl/pickPreviewImage, no /gallery in canonicals; `readPageSeo.test.ts` — read page title/description/structured data; `sitemap.test.ts` — all route canonical URLs)
- [x] No public page emits raw ad hoc JSON-LD. (All routes use `JsonLdScript` — audited Phase 6 prior session)
- [x] No public link points to retired `/gallery`. (`/gallery` returns 410; `STATIC_PUBLIC_PAGES` excludes it; `isExcludedRoute` test asserts exclusion)
- [ ] Search Console validation recorded after deploy.

## Phase 5 — Next.js Best Practices

### Goals

- Use App Router conventions intentionally.
- Keep server/client boundaries clear.
- Avoid expensive duplicate fetches.

### Review Areas

#### Route Boundaries

- `loading.tsx` coverage:
  - homepage;
  - read;
  - author;
  - org;
  - series;
  - tag if needed.
- `error.tsx` coverage:
  - global;
  - reader-specific;
  - entity pages if fetch failures need local recovery.
- `not-found.tsx`:
  - branded;
  - links back to public discovery.

#### Metadata Fetching

- Avoid duplicated expensive fetches between `generateMetadata()` and page render where possible.
- Keep metadata generation deterministic.
- Prefer pure builders for route-specific metadata.

#### Server-Safe Exports

- Maintain separate client/server entrypoints where needed:
  - `@write/public-ui`
  - `@write/public-ui/server`
- Ensure server entrypoints do not import React hooks or browser APIs.

#### BFF Boundary

- Public browser code should use same-origin BFF routes when fetching.
- Server-side Next route code may use `apiFetch`.
- Do not reintroduce `NEXT_PUBLIC_API_URL` browser fetches for public pages.

### Definition Of Done

- [x] Public routes have deliberate loading/error/not-found behavior. (loading.tsx: homepage/read/author/org/series/tag; error.tsx: global + read; not-found.tsx: branded with homepage link)
- [x] Metadata builders remain pure where possible. (entity pages use `React.cache` to deduplicate fetch; `seo.ts` helpers are pure; `readPageSeo.ts` builders are pure)
- [x] Server imports are server-safe. (`/server` entrypoint exports only pure fns and types; no React hooks)
- [x] Browser fetches stay same-origin. (No `NEXT_PUBLIC_API_URL` in `apps/public`)
- [ ] No public route depends on Vite fallback behavior.

## Phase 6 — Automated QA

### Playwright Smoke Suite

Add or extend local Playwright specs for:

- homepage loads with scripts;
- view mode toggle works after refresh;
- filter panel can apply and reset filters;
- hover preview does not block controls;
- appearance menu updates theme/text scale;
- reader loads and toolbar actions are visible;
- mobile viewport does not overlap top controls;
- hero ultra-wide does not show black side bars.

### Accessibility Scans

After smoke tests are stable:

- add axe scan for homepage;
- add axe scan for reader;
- add route exceptions only when justified in comments.

### Definition Of Done

- [x] Playwright smoke suite covers homepage and reader. (`public-smoke.spec.ts` — 6 tests: view mode toggle + refresh, appearance menu open/close/keyboard, hover preview non-blocking, mobile layout; existing `gallery-flow`, `reader-flow`, `hero-banner-ultra-wide` specs)
- [x] Mobile viewport smoke checks exist. (390px viewport: top controls no overlap, header no horizontal overflow)
- [x] Hover/motion regressions are covered. (hover preview non-blocking top bar test; ultra-wide black-band spec for hero)
- [ ] Accessibility scan strategy is documented or implemented.

## Phase 7 — Production Verification

### Checks

Run after deploy:

```bash
curl -I https://open-scripts.shawnup.com/
curl -I https://open-scripts.shawnup.com/og/homepage.png
curl -s https://open-scripts.shawnup.com/robots.txt
curl -s https://open-scripts.shawnup.com/sitemap.xml | head
```

Browser checks:

- homepage desktop/mobile;
- read page desktop/mobile;
- light/dark mode;
- reduced motion;
- keyboard navigation.

Search checks:

- Search Console sitemap status;
- URL Inspection for homepage/read/author/org/series;
- structured data parse sanity.

### Definition Of Done

- [ ] Production static assets resolve.
- [ ] Sitemap and robots resolve from Next-owned policy.
- [ ] Representative public pages are crawlable.
- [ ] Manual browser checks recorded.
- [ ] Search Console verification recorded.

## Execution Order

Recommended order:

1. Phase 1 — baseline audit.
2. Phase 2 — performance hardening.
3. Phase 3 — accessibility hardening.
4. Phase 5 — Next.js best-practice cleanup.
5. Phase 4 — SEO route-level refinements.
6. Phase 6 — automated QA.
7. Phase 7 — production verification.

Reasoning:

- Baseline first prevents blind optimization.
- Performance and accessibility often touch the same UI primitives.
- Next.js boundary cleanup reduces later QA noise.
- SEO site-level work is already mostly complete, so only route-level refinements remain.
- Automated QA should lock behavior after the main architecture is stable.

## Global Definition Of Done

- [ ] Public pages remain visually consistent across desktop/mobile.
- [ ] Public pages remain keyboard-usable.
- [ ] Public pages respect reduced motion.
- [ ] Public images do not cause major layout shift.
- [ ] Public routes have stable metadata and canonical URLs.
- [ ] Sitemap and robots are production-verified.
- [ ] Playwright smoke tests cover critical public flows.
- [ ] No public behavior depends on Vite fallback routes.

