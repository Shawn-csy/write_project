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
  PublicInfoHero                 title/description/header visual
  PublicInfoSection              section primitive
  PublicInfoLinkGrid             related page/footer links

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
- [ ] Current topbar differences documented with screenshots or notes.
- [ ] Flicker source categorized as theme flash, action hydration shift, or layout mismatch.

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

- [ ] Component tests added.
- [ ] Route smoke tests added or updated.
- [ ] Desktop/mobile QA recorded.
- [ ] Flicker issue rechecked after migration.

## What Not To Do

- Do not add CSS overrides inside each info page just to imitate homepage.
- Do not import `GalleryTopBar` directly into info pages if it brings gallery-specific filter/search behavior.
- Do not duplicate topbar markup into every static page.
- Do not remove `PublicShellActions` to hide hydration shift; fix the slot stability instead.
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
