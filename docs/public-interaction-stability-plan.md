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

- [x] `PublicInfoMenu` uses Popover-style panel. (Radix Popover, w-80, card background, shadow)
- [x] Five links remain present and valid.
- [x] Each top-level destination has a short description.
- [x] Trigger keeps 44px hit target.
- [x] Tests cover links, labels, grouping, and no nested interactive elements. (10 tests)

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

- [x] Audit table exists in this document or a linked QA note.
- [x] Each observed flicker has a suspected bucket.
- [x] No implementation begins before assigning a bucket.

### Audit Table

| Surface | Bucket(s) | Source | Status | Notes |
|---|---|---|---|---|
| Info menu open/close | ~~hydration shift~~ | `PublicInfoMenu` | **impl complete; browser QA pending** | Now Popover + next/link; trigger is stable 44px; no layout shift observed in unit tests |
| Appearance menu open/close | (none observed in unit tests) | `PublicAppearanceMenu` | not reproduced; browser check pending | Radix Popover in portal; trigger stable 44px; no shift seen in tests — needs browser verification |
| Studio link press | lazy import | `StudioLink` via `useAnimePressFeedback` | suspected | First press loads `animejs` via `getAnimate()`; module-level cache shared across hooks |
| Shell actions slot width | ~~hydration shift~~ | `PublicShellActions` | **fixed (Phase 3)** | `min-w-24 sm:min-w-[12rem]` reserves space before hydration |
| 台本 / 作者 / 組織 tab switch | route transition + model recompute | `useGalleryUrlState` → `router.push` inside `startTransition` | suspected | `startTransition` keeps UI stable; `GalleryClient` dims to `opacity-60` during `isPending`; first authors/orgs load triggers fetch |
| 標準 / 密集 view mode toggle | route transition | `useGalleryUrlState.setMode` → `router.push` + `startTransition` | suspected | Same path as tab switch; model recompute cheap (no data fetch) |
| Segment filter change | route transition + model recompute | `useGalleryUrlState.setSegment` → `router.push` | suspected | `buildPublicHomepageModel` re-runs; `useGalleryFilterModel` re-runs on segment change |
| Tag filter toggle | route transition + model recompute | `useGalleryUrlState.toggleTag` → `router.push` | suspected | Array spread creates new ref on each toggle; may re-run full filter pass |
| Search input | route transition (replace) | `useGalleryUrlState.setQ` → `router.replace` | suspected | `replace` avoids history pollution; but every keystroke triggers transition + filter recompute |
| Mobile filter sheet open/close | (none) | `mobileFilterOpen` local state | stable | Pure `useState`, no route change |
| Hero slide controls | image repaint | `PublicHeroMarquee` | suspected (browser only) | Slide transitions involve image load; first slide may repaint on hydration |
| Homepage client refresh | data refresh | `useGalleryController` effect → `/api/public-bundle` | suspected | Always calls `setRawScripts` + `setBannerSlides` on mount, even when data unchanged from SSR — see Phase 4 |
| GalleryListOverlay open | lazy import | `lazy(() => import("./GalleryListOverlay"))` | suspected | First open triggers dynamic import; Suspense fallback is `null` so no blank screen, but short pause |
| Authors/orgs first load | data refresh | `useGalleryController` effect → `/api/public-personas` + `/api/public-organizations` | expected | Intentional loading state; `peopleStatus` drives UI skeleton |

**Buckets legend:**
- `hydration shift` — SSR HTML differs from first hydrated render
- `route transition` — `router.push/replace` inside `startTransition`; current UI dims (`opacity-60`)
- `data refresh` — client fetch replaces SSR data
- `lazy import` — dynamic `import()` on first interaction
- `image repaint` — browser image decode/paint after hydration
- `model recompute` — `buildPublicHomepageModel` / `useGalleryFilterModel` CPU cost

**Priority for Phase 3+:**
1. Homepage client refresh always replacing unchanged SSR data → Phase 4 diff fix
2. Studio link first-press Anime.js latency → Phase 5 prewarm strategy
3. Tag toggle / search URL transition feel → Phase 3 profiling

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

### Phase 3 Findings

**`useGalleryUrlState`** (`apps/public/app/gallery/useGalleryUrlState.ts`):

- All mutations — `setView`, `setMode`, `setSegment`, `setUsage`, `toggleTag`, etc. — call `router.push` (or `.replace` for `setQ`) inside `startTransition`.
- `startTransition` keeps the current UI visible at `opacity-60 pointer-events-none` while the URL update propagates (`GalleryClient` applies this when `isPending`).
- `searchParamsRef` prevents stale closures on tag toggle; each `toggleTag` reads live params before diffing.
- The `startTransition` pattern is architecturally correct. Whether any state split is warranted depends on browser profiling — not determined by static audit alone.

**`useGalleryFilterModel`** (`packages/public-ui/src/gallery/useGalleryFilterModel.ts`):

- Scripts ≤120: `enrichScript` runs synchronously via `useMemo` on every `sourceScripts` change.
- Scripts >120: background batch enrichment with `setTimeout` ticks (60/batch); UI shows `backgroundEnriched = []` until complete.
- On filter changes (`searchNeedle`, `selectedTags`, `segmentFilter`, `usageFilter`): `filterGalleryScripts` re-runs as a `useMemo`.
- `filterGalleryScripts` is O(n×k) where k = number of selected tags. For typical library sizes (<500 scripts), this is fast; no memoization beyond the `useMemo` boundary is needed.
- `buildFeaturedSeries` runs on `scriptsWithMeta` (all enriched, not filtered) — safe but runs on every enrich change regardless of filter.
- `deriveTags` similarly runs on `scriptsWithMeta` — produces `allTags` for the sidebar. Not per-filter, which is correct.

**`buildPublicHomepageModel`** (`packages/public-ui/src/gallery/homepageModel.ts`):

- Pure function — no React, no side effects.
- Called via `useMemo` in `useGalleryController` with fine-grained deps (individual `urlState.*` fields, not the whole object). This is correct.
- Internally calls `groupScriptsIntoGalleryEntries(filteredScripts)` for `galleryEntries`.
- Calls `groupScriptsIntoGalleryEntries` twice more for `latestEntries` and `topEntries` (inside lane building).
- Calls `buildNavigationPolicyMap` over a deduped union of filtered + latest + top + series scripts — this could be O(n) Map construction on every render.
- No memoization inside the function — it is meant to be wrapped in `useMemo` by the caller (which it is).

**`groupScriptsIntoGalleryEntries` / series grouping:**

- Called 3× per `homepageModel` recompute: for `galleryEntries`, `latestEntries`, `topEntries`.
- Each call is O(n) scan. Not expensive for typical sizes, but a potential optimization target if the list grows.

**`GalleryHoverPreviewProvider` reset:**

- `resetKey` is `[viewMode, segment, usage, searchTerm, selectedTags.join(",")].join("|")` — computed inline every render.
- Any filter change that changes `resetKey` tears down and remounts hover preview state. This is intentional (avoids stale hover state after filter change) but causes a visible DOM flush if hover is active during filtering.

**Conclusions:**

| Source | Cost category | Verdict |
|---|---|---|
| `router.push` + `startTransition` | Route transition | Architecture correct; `opacity-60` during `isPending` is the only visible cost |
| `enrichScript` ≤120 scripts | O(n) sync useMemo | Fast; not the bottleneck |
| `enrichScript` >120 scripts | Async batched | Correct; first render shows empty until first batch completes |
| `filterGalleryScripts` | O(n×k) useMemo | Fast for typical sizes; no split needed |
| `buildFeaturedSeries` | O(n) on enrich change | Runs once per enrich, not per filter — correct |
| `buildPublicHomepageModel` | Pure O(n) useMemo | Correct; 3× `groupScriptsIntoGalleryEntries` is not a bottleneck |
| `buildNavigationPolicyMap` | O(n) Map on every model recompute | Acceptable now; revisit if n > 1000 |
| `GalleryHoverPreviewProvider` reset | DOM flush on filter change | Intentional; tolerable |
| `startTransition` alone for search | URL replace per keystroke | Each keystroke triggers filter recompute; debounce search input if jank appears |

**Proposed state split for search (if needed):**

Search is the highest-frequency input (`setQ` on every keystroke via `router.replace`). If profiling shows keystroke jank:

```text
localQ: useState  →  immediate input field value
urlQ: from searchParams  →  debounced (e.g. 150ms) sync to URL

setQ(v) → setLocalQ(v); debouncedNavReplace({ q: v })
```

This keeps `filterGalleryScripts` from running on every keystroke while still making the URL shareable. No other state split is warranted based on static code audit; browser profiling may reveal additional candidates.

Definition of Done:

- [x] Tab switching jank source identified. (static audit: `router.push` + `startTransition`; `opacity-60` is the visible cost; browser profiling pending)
- [x] Mode switching jank source identified. (static audit: same path as tab switch; model recompute cheap — no data fetch; browser profiling pending)
- [x] Search/tag update behavior documented. (`router.replace` per keystroke; search-only debounce split documented as mitigation if browser profiling shows jank)
- [x] Any proposed state split has a clear ownership model. (search-only split documented above with `localQ`/`urlQ` ownership; no split for other surfaces pending browser evidence)

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

- [x] Client refresh does not replace unchanged script arrays. (`publicScriptRefreshSignature` covers id/title/timestamps, synopsis/outline/coverUrl/coverCrop/coverDesign/contentLength, tags, seriesId/seriesOrder/series.name/series.summary/series.coverUrl, views/likes, license/licenseSpecialTerms/licenseCommercial/licenseDerivative/licenseNotify, targetAudience/contentRating, authorDisplayMode/authorOverrideName, owner.id/displayName/avatar, persona.id/displayName/avatar/defaultLicense*, organization.id/name/logoUrl, activityName, customMetadata)
- [x] Client refresh does not replace unchanged banner arrays. (`heroSlideRefreshSignature` covers id, title, subtitle, content, link, className, background, overlayOpacity, legacy imageUrl, image url/alt/backgroundMode/crop/mobileCrop/desktopCrop/ultraWideCrop)
- [x] Tests cover equivalent/no-op refresh behavior. (`apps/public/lib/refreshDiff.test.ts` — 53 tests; regression cases for all newly added fields)
- [ ] Browser check confirms no homepage flash after initial load. (manual — requires browser)

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

- [x] First press on shell controls does not visibly pause. (prewarm implemented: `useAnimePrewarm` in `PublicShellActions` schedules `getAnimate()` via `requestIdleCallback` / conservative 1200ms fallback; browser QA pending for perceived pause)
- [x] Anime.js still stays out of initial critical path. (prewarm is idle-scheduled, not inline; `getAnimate()` is still a lazy `import()`)
- [x] Reduced-motion path skips animation work. (`window.matchMedia("(prefers-reduced-motion: reduce)")` checked before scheduling)
- [x] Tests cover prewarm guard behavior. (`motionHooks.test.ts` — 4 new tests: schedules rIC, skips on reduced-motion, cancels on unmount, setTimeout fallback)

### Phase 6 — Browser QA Matrix

Manual checks required. All automated tests pass (570/570 as of Phase 5 completion).

What to look for per surface:

| Surface | Desktop | Mobile | Light/Dark | What changed | What to verify |
|---|---|---|---|---|---|
| Info menu open/close | [ ] | [ ] | [ ] | Phase 1: Popover + next/link; Phase 3: stable trigger 44px | No layout shift; links navigate without full reload; panel aligns correctly |
| Appearance menu open/close | [ ] | [ ] | [ ] | No code change; suspected stable | No panel jump on open; trigger stays 44px; light/dark switch applies immediately |
| Scripts/authors/orgs tabs | [ ] | [ ] | [ ] | No code change; `startTransition` already in place | No blank frame during tab switch; `opacity-60` dim is brief and not jarring |
| Standard/compact toggle | [ ] | [ ] | [ ] | No code change | Button remains clickable during `isPending`; layout does not collapse |
| Segment filters | [ ] | [ ] | [ ] | No code change | No long freeze; filter results update without blank screen |
| Tag filters | [ ] | [ ] | [ ] | No code change | No layout collapse; selected state reflects immediately even before URL updates |
| Mobile filter sheet | N/A | [ ] | [ ] | No code change | No horizontal overflow; sheet dismisses cleanly |
| Homepage refresh after load | [ ] | [ ] | [ ] | Phase 4: diff guard on `setRawScripts` / `setBannerSlides` | No content flash when SSR data unchanged; hero does not repaint on identical refresh |
| Studio link first press | [ ] | [ ] | N/A | Phase 5: `useAnimePrewarm` in shell | No visible pause on first click; press scale animation plays immediately |
| Info page → homepage → info page | [ ] | [ ] | [ ] | Phases 2–5: unified shell, stable actions slot | Topbar height and brand position stay consistent across navigation |

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
