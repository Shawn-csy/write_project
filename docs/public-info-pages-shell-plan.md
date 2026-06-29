# Public Info Pages Shell Plan

Last updated: 2026-06-29

## Purpose

The public info pages (`/about`, `/help`, `/license`, `/privacy`, `/terms`) currently feel visually separate from the rest of the public site. They also use a different topbar implementation from the homepage discovery surface.

This document defines the long-term architecture for unifying those pages with the public frontend without applying one-off page-level patches.

The goal is:

- one coherent public shell language;
- one topbar family with clear variants;
- stable SSR/CSR appearance with minimal flicker;
- reusable editorial layout primitives for static info pages;
- no duplicated layout decisions across individual pages.

## Current Problem

### Pages Affected

- `/about`
- `/help`
- `/license`
- `/privacy`
- `/terms`
- `not-found.tsx` also uses the same older topbar path and should be reviewed after the main info pages.

### Observed Symptoms

- Info pages visually differ from homepage/entity pages.
- Topbar appears different from the homepage topbar.
- Page transition feels like a product switch rather than a route switch.
- Some topbar/action area hydration flicker is visible.
- Content layout is manually assembled in each page.
- Lighthouse performance for info pages can remain low even after the topbar is server-rendered.
  The current measured bottleneck is not JavaScript execution (`TBT` is 0ms), but delayed
  first paint / largest paint from the shared CSS + first-viewport document structure.

## Root Cause

### 1. Two Public Topbar Systems

Homepage:

```text
apps/public/app/gallery/GalleryTopBar.tsx
  -> @write/public-ui PublicGalleryTopBar
  -> PublicShellActions trailing slot
```

Info/entity pages:

```text
apps/public/components/PublicTopBar.tsx
  -> app-local static topbar
  -> PublicShellActions trailing slot
```

The two topbars differ in:

- height;
- brand treatment;
- mobile navigation behavior;
- active tab presentation;
- spacing;
- background opacity/backdrop blur;
- hit target sizing;
- visual polish.

This is a structural split, not a styling bug.

### 2. Info Pages Own Their Layout Locally

Each info page currently assembles its own:

- wrapper;
- max width;
- hero/title block;
- content sections;
- cards;
- footer links.

This prevents consistent spacing, typography, and editorial rhythm.

### 3. Client Action Hydration Can Shift The Header

`PublicShellActions` is client-rendered and includes:

- appearance menu;
- info menu;
- studio link;
- motion feedback.

The root theme blocking script prevents the largest dark/light flash, but the topbar right-side action slot can still visually shift when client components hydrate unless the shell reserves stable dimensions.

### 4. Info Page First Viewport Is Too Card-Heavy

After Phase 1-6 shell work, the remaining performance issue is not the topbar.

Measured on `http://localhost:1090` after moving info pages to the server topbar:

| Route | Performance | FCP | LCP | TBT | CLS | Render-blocking estimate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/about` | 61 | 6.2s | 7.3s | 0ms | 0 | 5.5s |
| `/help` | 61 | 6.2s | 7.2s | 0ms | 0 | 5.48s |
| `/license` | 86 | 2.5s | 3.7s | 0ms | 0.001 | 1.76s |

The consistent `TBT: 0ms` means the pages are not blocked by client JavaScript execution.
The low `/about` and `/help` scores come from delayed first paint / largest paint and the
shared CSS render path. The topbar split was still architecturally correct, but it is not
the remaining performance lever.

The first viewport of `/about` and `/help` should therefore be treated as an editorial
document surface, not a dashboard/card surface. Avoid putting nested cards, icon blocks,
bordered panels, and dense lists above the fold.

Follow-up measurement after Phase 7 first-viewport editorial rewrite:

| Route | Performance | FCP | LCP | TBT | CLS | Render-blocking estimate |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `/about` | 61 | 6.3s | 7.5s | 0ms | 0 | 5.43s |
| `/help` | 62 | 5.8s | 6.8s | 0ms | 0 | 4.92s |
| `/license` | 61 | 6.2s | 7.3s | 0ms | 0 | 5.47s |

This proved that the first-viewport structure was worth cleaning up for product quality,
but it did not solve the Lighthouse bottleneck. The next performance lever is now CSS route
isolation / shared CSS reduction. Do not keep iterating on topbar or page copy to chase this
score.

### 5. Static Info Pages Still Load The Shared Heavy CSS Path

Current Lighthouse reports consistently point to the same render-blocking assets:

```text
/_next/static/css/a167a7153fa299a2.css   ~69KB transfer
/_next/static/css/a71feca92f128c82.css   ~13KB transfer
```

The pages have `TBT: 0ms`, so the issue is not JavaScript execution. They also have
`CLS: 0`, so layout instability is not the issue. The likely architectural problem is that
static info routes still inherit global CSS that serves gallery, reader, cards, animation,
and shared public UI surfaces.

The next phase should identify what is inside the render-blocking CSS, then split or reduce
the global surface area so static routes pay for base tokens + info-document styles only.

## Non-Negotiable Principles

- Do not patch individual info pages one by one.
- Do not keep two unrelated public topbars long term.
- Do not put gallery-specific behavior into generic info pages.
- Do not hide meaningful content to fix flicker.
- Do not move public route metadata into shared UI packages.
- Shared UI may provide router-neutral shell primitives; `apps/public` owns hrefs, metadata, and route policy.
- Info pages should remain server-rendered content pages.
- Client-only action controls must occupy stable space before hydration.

## Target Architecture

```text
@write/public-ui
  PublicShellTopBar              router-neutral topbar primitive
  PublicShellNavTab              optional typed tab model

apps/public/components
  PublicTopBarAdapter            Next href/action adapter, if needed
  PublicShellActions             client actions with stable dimensions
  PublicInfoPageShell            app-owned static page shell
  PublicInfoTopBar               server-only topbar for static info pages
  PublicInfoDocument             server-only editorial document primitive
  PublicInfoHero                 title/description/header visual
  PublicInfoSection              section primitive
  PublicInfoLinkGrid             related page/footer links

apps/public/styles
  base.css                       reset, tokens, theme variables, minimum Tailwind base
  info.css                       static info document primitives
  gallery.css                    homepage discovery-only styles, if extraction is needed
  reader.css                     reader-only styles, if extraction is needed

apps/public/app/*
  about/page.tsx                 metadata + content model only
  help/page.tsx                  metadata + content model only
  license/page.tsx               metadata + content model only
  privacy/page.tsx               metadata + content model only
  terms/page.tsx                 metadata + content model only
```

## Topbar Direction

### New Shared Primitive: `PublicShellTopBar`

`PublicGalleryTopBar` currently behaves like a high-quality public shell, but its name and API are gallery-specific.

The long-term structure should be:

```text
PublicShellTopBar
  brand
  optional nav tabs
  optional mobile nav
  optional leading slot
  optional trailing slot
  stable shell dimensions

GalleryTopBar
  wraps PublicShellTopBar
  adds scripts/authors/orgs tab behavior
  adds mobile filter/search controls

InfoTopBar / PublicTopBarAdapter
  wraps PublicShellTopBar
  uses no discovery tabs or uses info-nav tabs only by product decision
  keeps brand + home/back + trailing actions
```

### Retire Or Re-scope `PublicTopBar`

The current `apps/public/components/PublicTopBar.tsx` should not remain a second visual system.

Allowed end states:

1. Delete it after migration.
2. Keep it only as a thin compatibility wrapper around `PublicShellTopBar`.

It should not own its own visual language.

## Info Page Shell Direction

Create:

```text
apps/public/components/info/PublicInfoPageShell.tsx
apps/public/components/info/PublicInfoTopBar.tsx
apps/public/components/info/PublicInfoDocument.tsx
apps/public/components/info/PublicInfoHero.tsx
apps/public/components/info/PublicInfoSection.tsx
apps/public/components/info/PublicInfoLinkGrid.tsx
```

### `PublicInfoPageShell`

Owns:

- topbar composition;
- page background;
- content max width;
- vertical rhythm;
- footer/related links;
- stable shell spacing.

Does not own:

- route metadata;
- route-specific copy;
- legal/content policy.

Suggested props:

```ts
interface PublicInfoPageShellProps {
  eyebrow?: string;
  title: string;
  description?: string;
  activeKey?: "about" | "help" | "license" | "privacy" | "terms";
  children: React.ReactNode;
  relatedLinks?: Array<{ href: string; label: string }>;
}
```

### `PublicInfoSection`

Owns:

- section heading hierarchy;
- section spacing;
- border/background treatment;
- optional icon/label slot.

Suggested props:

```ts
interface PublicInfoSectionProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}
```

### `PublicInfoDocument`

Owns the low-cost first-viewport document rhythm for static info pages.

Responsibilities:

- plain editorial lead section;
- first-viewport typography and spacing;
- optional below-the-fold sections;
- no client hooks;
- no animation;
- no nested card pattern in the lead area.

Suggested structure:

```tsx
<PublicInfoDocument>
  <PublicInfoHero title="" description="" />
  <section className="info-lead">
    <p>...</p>
    <ul>...</ul>
  </section>
  <PublicInfoSection title="">...</PublicInfoSection>
</PublicInfoDocument>
```

The first viewport should contain text and links, not dashboard-like cards.

## Flicker / Hydration Strategy

### Theme Flash

Already mostly handled by:

- root blocking script in `apps/public/app/layout.tsx`;
- `ThemeProvider`;
- `PublicAppearanceContext`.

Do not duplicate theme writers on info pages.

### Topbar Action Shift

Potential fixes:

- Give `PublicShellActions` a stable min width.
- Make icon buttons fixed 44×44 hit targets.
- Render a server-stable wrapper around trailing actions.
- Avoid conditionally rendering different action count between SSR and hydration.

Recommended implementation:

```tsx
<div className="flex min-w-[theme-specific-width] items-center justify-end">
  <PublicShellActions />
</div>
```

The exact width should be measured from current desktop/mobile action set.

### Content Flicker

Info page content should remain server-rendered and not depend on client hooks for layout.

Appearance preferences should apply through CSS variables and root attributes only.

## CSS Performance Strategy

The info pages should not pay for gallery/reader/card CSS in their render-blocking path.
The target is not to remove Tailwind or hand-author every rule. The target is to establish
a CSS budget and route-aware ownership:

- base/global CSS:
  - CSS variables;
  - typography defaults;
  - theme colors;
  - accessibility utility basics;
  - minimal shared layout primitives.
- info CSS:
  - `.info-document`;
  - `.info-hero`;
  - `.info-lead`;
  - `.info-section`;
  - `.info-footer`;
  - no gallery cards, hover previews, reader shells, or animation-specific selectors.
- gallery CSS:
  - card lanes;
  - hero carousel;
  - filters;
  - card hover preview;
  - homepage-specific animation.
- reader CSS:
  - screenplay renderer;
  - toolbar;
  - marker colors;
  - reader preferences.

Route-level CSS isolation should be introduced only after measuring what is actually inside
the current CSS chunks. Do not split files blindly.

## Execution Plan

### Phase 1 — Document And Audit

Tasks:

- Confirm topbar split:
  - homepage uses `PublicGalleryTopBar`;
  - info/entity pages use `PublicTopBar`.
- Record visible differences:
  - height;
  - mobile nav;
  - trailing action layout;
  - brand treatment.
- Identify which pages should use the new info shell first.

Definition of Done:

- [x] This document exists.
- [x] Current topbar differences documented with screenshots or notes.
  - `PublicGalleryTopBar`: h-[3.5rem], ink-stamp logo mark, mobile hamburger drawer, desktop underline indicator, bg-background/97 backdrop-blur-xl
  - `PublicTopBar` (old): h-14, font-serif text brand only, mobile horizontal scroll tab row, bg-background/95 backdrop-blur
  - Differences: brand visual (logo mark vs text), mobile nav (drawer vs tab row), active tab style (underline vs bg-primary pill)
- [x] Flicker source categorized as theme flash, action hydration shift, or layout mismatch.
  - Theme flash: handled by root blocking script + ThemeProvider (pre-existing)
  - Action hydration shift: `PublicShellActions` had no stable container width → fixed in Phase 3 (`min-w-24 sm:min-w-[12rem]`)
  - Layout mismatch: each info page assembled its own layout → fixed in Phase 4 (`PublicInfoPageShell`)

### Phase 2 — Extract Generic `PublicShellTopBar`

Tasks:

- Move generic topbar behavior out of `PublicGalleryTopBar`.
- Keep router-neutral implementation in `@write/public-ui`.
- Support:
  - brand;
  - subtitle;
  - optional tabs;
  - trailing slot;
  - mobile nav;
  - optional leading slot.
- Preserve current homepage behavior through `GalleryTopBar`.

Definition of Done:

- [x] Homepage topbar visual behavior unchanged. (GalleryTopBar tests: 4/4 pass)
- [x] `PublicShellTopBar` has focused tests. (9 tests: href tab, button tab, aria-current, mobile nav open/close, no-tabs no-hamburger, trailing slot, no Next import)
- [x] `PublicGalleryTopBar` wraps `PublicShellTopBar`; gallery-specific filter buttons added back as `trailing` slot content.
- [x] No Next-specific imports in `@write/public-ui`.
- [x] `PublicInfoPageShell` now uses `PublicShellTopBar` from `@write/public-ui` (not app-local `PublicTopBar`).

### Phase 3 — Stable `PublicShellActions`

Tasks:

- Give actions slot stable dimensions.
- Ensure 44×44 minimum hit targets for icon buttons.
- Ensure appearance/info/studio controls do not change layout after hydration.
- Keep reader toolbar separate; reader should not inherit info menu actions.

Definition of Done:

- [x] No visible action-slot width jump on `/about`, `/help`, `/license`. (`PublicShellActions` now owns `min-w-24 sm:min-w-[12rem]`)
- [x] Icon buttons have accessible names. (`aria-label` on AppearanceMenu + InfoMenu triggers)
- [x] Mobile topbar has no horizontal overflow. (StudioLink `hidden sm:inline-flex`; mobile container `min-w-24` = 96px)
- [x] Existing `PublicShellActions` tests updated or added. (5 tests: renders, min-w classes, accessible names, studio href)

### Phase 4 — Build `PublicInfoPageShell`

Tasks:

- Create app-owned info page shell components.
- Use shared topbar primitive.
- Define editorial page background and content rhythm.
- Keep pages server-rendered.
- Avoid nested cards unless sections are genuinely card-like.

Definition of Done:

- [x] `PublicInfoPageShell` exists. (`apps/public/components/info/PublicInfoPageShell.tsx`)
- [ ] `PublicInfoHero` exists. (deferred — hero is inlined in shell header; extract if visual complexity grows)
- [x] `PublicInfoSection` exists. (`apps/public/components/info/PublicInfoSection.tsx`)
- [x] Layout is token-based and consistent with homepage/entity pages.
- [x] No route-specific hardcoded shell layout remains in migrated pages.

### Phase 5 — Migrate Main Info Pages

Migration order:

1. `/about`
2. `/help`
3. `/license`
4. `/privacy`
5. `/terms`

Reasoning:

- `/about`, `/help`, `/license` are product-facing and should match the public site first.
- `/privacy` and `/terms` can remain more document-like but should still share shell/topbar.

Definition of Done:

- [x] `/about` uses `PublicInfoPageShell`.
- [x] `/help` uses `PublicInfoPageShell`.
- [x] `/license` uses `PublicInfoPageShell`.
- [x] `/privacy` uses `PublicInfoPageShell`.
- [x] `/terms` uses `PublicInfoPageShell`.
- [x] Metadata remains unchanged.
- [x] Internal links remain valid.

### Phase 6 — Tests And QA

Tests:

- shell renders title/description/related links;
- topbar brand/home link works;
- actions slot is present and stable;
- mobile layout has no horizontal overflow;
- no retired `/gallery` links;
- static pages keep canonical metadata.

Browser QA:

- `/about`, `/help`, `/license` desktop light/dark;
- `/about`, `/help`, `/license` mobile;
- toggle appearance on info page, confirm no large layout shift;
- navigate homepage -> info page -> homepage, confirm topbar continuity.

Definition of Done:

- [x] Component tests added. (`PublicInfoPageShell`: 9 tests; `PublicInfoSection`: 8 tests)
- [x] Route smoke tests added or updated. (4 tests each for `/about`, `/help`, `/license`, `/privacy`, `/terms` — canonical href, title, OG url, no /gallery links)
- [ ] Desktop/mobile QA recorded. (manual — requires browser)
- [ ] Flicker issue rechecked after migration. (manual — requires browser)

### Phase 7 — Info Page First-Viewport Performance

Tasks:

- Build server-only editorial primitives for info pages:
  - `PublicInfoDocument`;
  - `PublicInfoHero` or equivalent shell-level hero primitive;
  - lead section styles.
- Rewrite `/about` first viewport:
  - H1 + description;
  - one lead paragraph;
  - 3-4 plain key points;
  - move "recent updates" and contact cards below the fold.
- Rewrite `/help` first viewport:
  - H1 + description;
  - three-step "find / read / create" summary;
  - move detailed help cards/FAQ below the fold.
- Keep `/license` mostly intact, but migrate it to the same document primitives to prevent drift.
- Avoid first-viewport nested cards:
  - no `rounded-xl border bg-muted/10 p-6` in the first content section;
  - no icon card grid above the fold;
  - no multi-card update list above the fold.

Definition of Done:

- [x] `PublicInfoDocument` or equivalent info document primitive exists. (`PublicInfoDocument` / `PublicInfoLead` / `PublicInfoBelowFold`)
- [x] `/about` first viewport is editorial/plain text, not card-first. (lead: plain text + 4-point list; cards in `PublicInfoBelowFold`)
- [x] `/help` first viewport is editorial/plain text, not card-first. (lead: 3-step ordered list; detail sections in `PublicInfoBelowFold`)
- [x] `/license` uses the shared document primitive without a content rewrite. (legal text unchanged; structure migrated to `PublicInfoDocument`)
- [x] Component/source tests assert `/about` and `/help` first sections are not card blocks. (`PublicInfoDocument.test.tsx` 9 tests)
- [ ] Lighthouse after deploy:
  - `/about` Performance >= 85;
  - `/help` Performance >= 85;
  - `/license` Performance >= 90;
  - Accessibility remains 100;
  - SEO remains 100;
  - CLS remains 0.

- [x] Lighthouse rerun after deploy recorded.
  - `/about`: 61, FCP 6.3s, LCP 7.5s, TBT 0ms, CLS 0
  - `/help`: 62, FCP 5.8s, LCP 6.8s, TBT 0ms, CLS 0
  - `/license`: 61, FCP 6.2s, LCP 7.3s, TBT 0ms, CLS 0

Phase 7 did not meet the performance target. Treat the page structure cleanup as a product
quality improvement, not the final performance fix. Continue to Phase 8.

### Phase 8 — CSS Route Isolation / Shared CSS Budget

Tasks:

- Audit the current render-blocking CSS chunks:
  - list top selectors / utility families in `a167...css`;
  - identify font-face declarations still loaded by info pages;
  - identify gallery/reader/card/animation utilities used only outside info pages.
- Build a CSS ownership map:
  - base tokens;
  - info document;
  - gallery discovery;
  - reader shell;
  - shared components.
- Decide the implementation path:
  1. reduce global class usage in info pages so Tailwind emits fewer route-relevant classes;
  2. move heavy route-only CSS imports out of root `globals.css` into route/component-local CSS;
  3. if needed, create route-group layouts so info pages import a lighter CSS entry.
- Add a CSS budget check:
  - info page render-blocking transfer target: <= 35KB;
  - total unused CSS estimate target: <= 30KiB;
  - no gallery/reader-only CSS in info route first-load bundle where practical.
- Re-run Lighthouse for `/about`, `/help`, `/license`.

Definition of Done:

- [x] CSS chunk audit is documented with concrete selector/category findings.
  - `a167...css` (199KB): 211 `@font-face` from Noto Sans TC — entire file was font declarations
  - `a71f...css` (59KB): `--marker-color-*` tokens (reader-only) + Tailwind reset + brand animation keyframes
  - Root cause: `next/font/google` Noto Sans TC ignores `subsets: ["latin"]` for CJK fonts; emits full 211-block unicode-range CSS regardless
- [x] Global CSS ownership map exists.
  - Web font: removed — system CJK stack (`PingFang TC → Noto Sans TC → Microsoft JhengHei → system-ui`) via `--font-sans` in `globals.css`
  - `@write/script-theme/marker-colors.css`: moved from `globals.css` to `app/read/[id]/ScriptContentRenderer.tsx` (reader-only scope)
  - `fonts.ts`: deleted; `layout.tsx` uses fixed `className="h-full antialiased"`
  - `globals.css`: Tailwind base/components/utilities + theme tokens + editorial primitives + brand animation keyframes (gallery-only, not yet extracted)
- [x] Info routes no longer import avoidable gallery/reader-only CSS.
  - `--marker-color-*` (reader) moved out
  - Web font CSS (211 `@font-face`) eliminated entirely
- [x] Info page render-blocking CSS transfer is <= 35KB.
  - After changes: 12KB (Tailwind + brand tokens) — within budget
  - Remaining 12KB contains brand animation keyframes (`brand-script-*`, `hero-reveal`) that only gallery homepage uses; not yet extracted to route-local CSS
- [x] Lighthouse after local build and deploy:
  - `/about` Performance: **98** (target >= 85) ✓
  - `/help` Performance: **99** (target >= 85) ✓
  - `/license` Performance: **99** (target >= 90) ✓
  - Accessibility: **100** ✓
  - SEO: **100** ✓
  - CLS: **0** ✓
  - FCP: 0.8s (was 6.2s)
  - LCP: 2.0–2.2s (was 7.3s)

## What Not To Do

- Do not add CSS overrides inside each info page just to imitate homepage.
- Do not import `GalleryTopBar` directly into info pages if it brings gallery-specific filter/search behavior.
- Do not duplicate topbar markup into every static page.
- Do not put `PublicShellActions` back into info pages to chase visual parity; info pages use a server-only topbar.
- Do not keep optimizing topbar hydration after Phase 6; measured `TBT: 0ms` shows it is not the remaining bottleneck.
- Do not make first-viewport content look like dashboard cards.
- Do not continue rewriting `/about` or `/help` copy to fix Lighthouse after Phase 7; measured bottleneck is CSS render-blocking.
- Do not split CSS before auditing what is actually in the current chunks.
- Do not convert legal pages into marketing pages; preserve document readability.

## Open Questions

- Should info pages show discovery tabs (`台本 / 作者 / 組織`) or only brand + actions?
- Should `/help` and `/license` be represented in the info menu only, or also as topbar tabs on info pages?
- Should `/privacy` and `/terms` use the same editorial hero as `/about`, or a simpler document mode?
- Should `PublicShellTopBar` live in `@write/public-ui` immediately, or first be app-local until API stabilizes?

## Recommended First Implementation

1. Extract `PublicShellTopBar` from `PublicGalleryTopBar`.
2. Rebuild `GalleryTopBar` as a wrapper.
3. Build `PublicInfoPageShell` app-local.
4. Migrate `/about` only.
5. Verify flicker/topbar continuity.
6. Migrate `/help` and `/license`.
7. Migrate `/privacy` and `/terms`.

This keeps risk controlled while moving toward the correct long-term architecture.

## Recommended Next Implementation

Phase 8 targets achieved. All info pages score 98–99 Performance, 100 A11y/SEO, CLS 0.

Remaining optional cleanup (not blocking):

1. Extract `brand-script-*` / `hero-reveal` keyframes from `globals.css` into gallery-local CSS — reduces 12KB shared CSS further for info routes.
2. Add a CSS budget CI check (e.g. assert info page CSS transfer <= 20KB after extraction).
3. Desktop/mobile browser QA for info pages (Phase 6 manual items still open).
