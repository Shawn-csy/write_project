# Public Interaction Stability Plan

Last updated: 2026-06-29

## Purpose

The public frontend now has a coherent shell direction, but several interaction
surfaces still need a stability pass:

- the topbar info menu feels too thin for its role;
- some tab/view changes can feel sticky or delayed;
- some routes or panels visibly flash during navigation or hydration;
- first-use motion can cost more than the interaction deserves.

This document defines a long-term plan for fixing those issues as a system,
not through one-off CSS patches.

## Scope

Included:

- `PublicInfoMenu`;
- `PublicShellActions`;
- public shell topbar interaction;
- homepage gallery tab/view/filter switching;
- client refresh behavior on the homepage;
- Anime.js first-interaction cost;
- browser QA for flicker and input latency.

Excluded:

- reader-specific toolbar redesign;
- editor/studio interactions;
- SEO metadata;
- visual redesign of cards, hero, or filters unless it affects interaction
  stability.

## Current Symptoms

### Info Menu

`PublicInfoMenu` is currently a narrow dropdown with five text links:

```text
使用說明
授權說明
關於我們
---
隱私政策
使用條款
```

Problems:

- the trigger reads as a generic help icon, but the menu contains platform,
  licensing, legal, and about links;
- the panel width is too small for the importance of these destinations;
- links have no descriptions, so users must already know what each page means;
- the visual language differs from `PublicAppearanceMenu`, which already uses a
  richer popover panel.

### Flicker / Jank

Observed or suspected sources:

- client-only shell actions hydrating after server HTML;
- Radix portal content mounting and measuring on first open;
- App Router query navigation for gallery state changes;
- homepage client refresh replacing SSR data;
- first Anime.js dynamic import on press/segment feedback;
- image/hero repaint after hydration;
- expensive gallery model recomputation during tab/filter changes.

These must be diagnosed separately. A global "turn off animation" or "add a
delay" fix is not acceptable.

## Architecture Principles

### 1. Interaction State Must Have A Clear Owner

Examples:

- URL-shareable gallery state belongs to `galleryUrlState`;
- transient UI state such as mobile sheet open/closed belongs to the page
  controller;
- menu open state belongs to the menu primitive;
- persistent appearance settings belong to `PublicAppearanceContext`.

Do not duplicate the same state in a component and in the URL unless there is an
explicit synchronization strategy.

### 2. Shell Controls Must Reserve Stable Space

Topbar controls must not resize the shell after hydration.

Rules:

- icon buttons expose 44px hit targets;
- `PublicShellActions` owns stable width, not each call site;
- menus/popovers may render in portals, but their triggers must not change size;
- first render and hydrated render should have the same shell geometry.

### 3. URL State Is For Shareability, Not Every Microinteraction

The homepage should keep meaningful state in the URL, but not at the cost of
making every click feel like a route transition.

Rules:

- discrete navigation can use `router.push`;
- keystroke search should use `router.replace`;
- if URL navigation causes visible jank, split immediate UI state from deferred
  URL synchronization deliberately;
- do not remove URL state just to hide performance issues.

### 4. Motion Is Enhancement, Not Work

Motion must never block the action.

Rules:

- Anime.js remains lazy-loaded;
- Anime.js may be warmed only when it improves a known first-interaction cost;
- motion helpers must honor `prefers-reduced-motion`;
- only `transform` and `opacity` should animate for shell controls;
- no per-card or per-list mass animation during filtering.

### 5. Client Refresh Must Be Diff-Aware

Homepage client refresh should not replace stable SSR data unnecessarily.

Rules:

- if refreshed data is equivalent, do not call `setState`;
- update changed slices only;
- avoid replacing large arrays when only banner/config changed;
- do not let refresh erase user-visible state during interaction.

## Target UX

### Info Menu

The info menu should become a small platform information panel, not a plain
dropdown.

Recommended shape:

```text
說明與平台資訊
  使用說明      閱讀、發布與工作室操作
  授權說明      台本使用、改作與商業使用規則
  關於我們      平台理念與聯絡方式

法務與政策
  隱私政策      資料使用與 Google API 說明
  使用條款      平台使用規範
```

Recommended implementation:

- Radix `Popover`, not `DropdownMenu`;
- width: `w-80` or `w-96`;
- each item is a real navigation link;
- each item has title + short description;
- groups have subtle headings;
- no nested interactive controls;
- no scrollable panel unless content exceeds mobile viewport.

### Tab / View Switching

Expected behavior:

- tab click responds immediately;
- URL updates without blanking the page;
- no visible flash of fallback UI;
- previous content remains stable until next model is ready;
- authors/orgs first load shows intentional loading state, not layout collapse.

## Execution Plan

### Phase 1 — Redesign `PublicInfoMenu`

Tasks:

- Replace dropdown list with a richer popover panel.
- Keep `aria-label="說明與平台資訊"`.
- Use fixed trigger size.
- Add grouped links with descriptions.
- Use `next/link` in app-local implementation.
- Keep the menu purely navigational; no settings controls.

Definition of Done:

- [ ] `PublicInfoMenu` uses Popover-style panel.
- [ ] Five links remain present and valid.
- [ ] Each top-level destination has a short description.
- [ ] Trigger keeps 44px hit target.
- [ ] Tests cover links, labels, grouping, and no nested interactive elements.

### Phase 2 — Interaction Stability Audit

Tasks:

- Record the known interaction surfaces:
  - info menu open/close;
  - appearance menu open/close;
  - homepage `台本 / 作者 / 組織`;
  - homepage `標準 / 密集`;
  - segment filters;
  - tag filters;
  - mobile filter sheet;
  - hero slide controls;
  - studio link press.
- Categorize each issue as:
  - hydration shift;
  - route transition;
  - data refresh;
  - lazy import;
  - image repaint;
  - model recompute;
  - animation.

Definition of Done:

- [ ] Audit table exists in this document or a linked QA note.
- [ ] Each observed flicker has a suspected bucket.
- [ ] No implementation begins before assigning a bucket.

### Phase 3 — Gallery Navigation Profiling

Tasks:

- Inspect `useGalleryUrlState` and route updates.
- Measure whether `setView`, `setMode`, `setSegment`, and tag changes feel like
  route transitions.
- Confirm whether `startTransition` is enough.
- Identify expensive recomputations in:
  - `useGalleryFilterModel`;
  - `buildPublicHomepageModel`;
  - gallery entry grouping;
  - hover preview reset.

Potential long-term fix:

```text
Immediate UI state
  -> updates synchronously for feel

URL state
  -> synchronized in transition
  -> still shareable
  -> never blanks the current UI
```

Definition of Done:

- [ ] Tab switching jank source identified.
- [ ] Mode switching jank source identified.
- [ ] Search/tag update behavior documented.
- [ ] Any proposed state split has a clear ownership model.

### Phase 4 — Client Refresh Diffing

Tasks:

- Review homepage `/api/public-bundle` refresh.
- Avoid calling `setRawScripts` when refreshed scripts are equivalent.
- Avoid calling `setBannerSlides` when parsed banner slides are equivalent.
- Keep SSR data stable during initial interaction.

Suggested model helpers:

```ts
arePublicScriptsEquivalent(a, b)
areHeroSlidesEquivalent(a, b)
```

These helpers should be pure and tested.

Definition of Done:

- [ ] Client refresh does not replace unchanged script arrays.
- [ ] Client refresh does not replace unchanged banner arrays.
- [ ] Tests cover equivalent/no-op refresh behavior.
- [ ] Browser check confirms no homepage flash after initial load.

### Phase 5 — Motion First-Interaction Strategy

Tasks:

- Identify which public controls lazy-load Anime.js on first interaction.
- Decide whether to prewarm Anime.js after idle time.
- If prewarming, use a single centralized strategy, not per-component timers.
- Ensure reduced-motion users do not prewarm motion unnecessarily.

Possible implementation:

```text
requestIdleCallback
  -> getAnimate()
  -> only after first public shell paint
  -> only when prefers-reduced-motion is false
```

Definition of Done:

- [ ] First press on shell controls does not visibly pause.
- [ ] Anime.js still stays out of initial critical path.
- [ ] Reduced-motion path skips animation work.
- [ ] Tests cover prewarm guard behavior if implemented.

### Phase 6 — Browser QA Matrix

Manual checks:

| Surface | Desktop | Mobile | Light/Dark | Notes |
|---|---|---|---|---|
| Info menu open/close | [ ] | [ ] | [ ] | no layout shift |
| Appearance menu open/close | [ ] | [ ] | [ ] | no panel jump |
| Scripts/authors/orgs tabs | [ ] | [ ] | [ ] | no blank frame |
| Standard/compact toggle | [ ] | [ ] | [ ] | button remains clickable |
| Segment filters | [ ] | [ ] | [ ] | no long freeze |
| Tag filters | [ ] | [ ] | [ ] | no layout collapse |
| Mobile filter sheet | N/A | [ ] | [ ] | no overflow |
| Homepage refresh after load | [ ] | [ ] | [ ] | no content flash |

Definition of Done:

- [ ] QA table completed.
- [ ] Any remaining flicker has an issue bucket and follow-up.
- [ ] No unresolved interaction issue is hidden under "browser difference".

## What Not To Do

- Do not remove URL state to hide navigation jank.
- Do not disable all animation globally.
- Do not replace Radix primitives with hand-rolled popovers unless there is a
  measured blocker.
- Do not solve flicker with arbitrary `setTimeout`.
- Do not add page-level CSS overrides for individual info pages.
- Do not keep duplicating shell controls between homepage and info pages.

## Immediate Recommendation

Start with Phase 1.

Reasoning:

- `PublicInfoMenu` is a clearly bounded UX issue.
- It does not require data model changes.
- It will align the help/about/license surface with the newer appearance panel
  architecture.
- It creates a better baseline before measuring flicker and tab jank.

After Phase 1, run Phase 2 as a browser-backed audit before changing gallery
navigation architecture.
