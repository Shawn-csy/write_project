# Public Hero Motion Redesign

Last updated: 2026-06-29

## Purpose

The homepage brand hero should feel richer than a static marketing block, but it must preserve the current public-site performance baseline. This document defines the long-term motion contract for the brand slide: premium, script-related, static-first, and safe when JavaScript or Anime.js is unavailable.

## Current Context

The public homepage now has a strong performance baseline after the font/CSS cleanup:

- homepage Lighthouse Performance target: `>= 90`;
- Accessibility target: `100`;
- SEO target: `100`;
- CLS target: `0`;
- decorative motion must not enter the critical render path.

Current brand slide implementation:

```text
apps/public/app/gallery/GalleryBrandHeroSlide.tsx
  -> BrandScriptDesk
  -> static brand copy
  -> CSS backdrop / grain / reveal classes
```

## Chosen Direction: Cinematic Script Desk

The selected direction is a **Cinematic Script Desk** composition.

Concept:

```text
Hero frame
├─ script page stack
├─ typewriter-style script lines
├─ subtle editorial ruled lines
├─ one soft light sweep
└─ stable brand copy
```

Visual language:

- a stack of script pages on a quiet editorial desk;
- typewriter-like line strips on the front page;
- a soft light sweep that suggests a reading desk or stage light;
- brand copy remains stable, readable, and server-rendered;
- animation supports the subject, it does not become the subject.

Why this direction:

- It is directly tied to scripts and reading.
- It can look premium without many DOM nodes.
- It can be built with transform/opacity only.
- It does not require canvas or a large particle system.
- It degrades to a static illustration under `prefers-reduced-motion` or failed JS.

## Anime.js Boundary

Anime.js is allowed only as orchestration for small, finite motion.

Allowed uses:

- first-mount entrance timeline;
- subtle stagger for a small number of decorative wrappers;
- one-off reset when the brand slide becomes active.

Disallowed uses:

- continuous large JS loops;
- animating large lists of script cards;
- animating every dialogue character as separate DOM;
- scroll-linked spectacle;
- layout-property animation;
- blocking navigation or delaying user actions;
- importing Anime.js directly in shared packages.

Allowed import locations:

```text
apps/public/lib/motion/animeLoader.ts
apps/public/lib/motion/useHeroBrandAnimation.ts
apps/public/app/gallery/BrandScriptDesk.tsx
```

Disallowed import locations:

```text
packages/public-ui/*
packages/script-reader-ui/*
apps/public/app/gallery/GalleryClient.tsx
apps/public/app/gallery/GalleryScriptResults.tsx
```

Anime.js must remain lazy-loaded through the shared public motion loader.

## Performance Rules

Animate only compositor-friendly properties:

```text
opacity
transform
translateX / translateY
rotate
scale
```

Do not animate:

```text
top / left / right / bottom
width / height
margin / padding
box-shadow
large blur filters
background-position
clip-path on large surfaces
```

Element budget:

| Item | Budget |
| --- | ---: |
| Animated decorative DOM nodes | `<= 12` |
| Anime.js timelines on mount | `1` |
| Infinite JS timelines | `0` |
| Idle CSS loops | `<= 3` small compositor-only loops |
| Large blurred layers | `<= 1`, static or near-static |
| Canvas | `0` |

Runtime budget:

| Metric | Target |
| --- | ---: |
| Homepage Lighthouse Performance | `>= 90` |
| Total Blocking Time regression | `<= +50ms` |
| CLS | `0` |
| LCP regression | `<= +200ms` |
| Anime.js in initial sync bundle | `0` |

## Accessibility Rules

- Decorative animation must be `aria-hidden`.
- Decorative animation must be `pointer-events-none`.
- Brand text must remain real text, not an image.
- `prefers-reduced-motion: reduce` must render a static high-quality composition.
- The hero must stay readable in light and dark themes.
- Animation must not hide primary navigation or carousel controls.

## Target Architecture

```text
apps/public/app/gallery/
  GalleryBrandHeroSlide.tsx        brand slide shell + copy
  BrandScriptDesk.tsx              decorative script desk scene

apps/public/lib/motion/
  useHeroBrandAnimation.ts         lazy Anime.js entrance orchestration
  animeLoader.ts                   shared dynamic import cache
  motionTokens.ts                  timing/easing budgets, if needed

apps/public/app/globals.css
  static CSS variables and fallback styles
  brand-desk-* decorative classes
```

Responsibilities:

### `GalleryBrandHeroSlide`

Owns:

- brand copy;
- layout inside carousel frame;
- reduced-motion fallback container;
- rendering the decorative `BrandScriptDesk`.

Does not own:

- Anime.js import;
- detailed paper stack DOM;
- timing constants.

### `BrandScriptDesk`

Owns:

- decorative paper stack;
- typewriter line DOM;
- light sweep layer;
- static fallback styling.

Does not own:

- route data;
- carousel state;
- text content that needs SEO indexing.

### `useHeroBrandAnimation`

Owns:

- reduced-motion guard;
- lazy Anime.js loading;
- one mount timeline;
- cleanup on unmount;
- static-first failure behavior.

Does not own:

- business state;
- carousel slide data;
- layout measurement loops.

## Implemented DOM Model

```tsx
<div data-brand-script-desk aria-hidden>
  <div data-script-page-enter>
    <div className="brand-desk-page brand-desk-page-back" />
  </div>
  <div data-script-page-enter>
    <div className="brand-desk-page brand-desk-page-middle" />
  </div>
  <div data-script-page-enter>
    <div className="brand-desk-page brand-desk-page-front">
      <span className="brand-desk-script-line brand-desk-script-line-type" />
      <span className="brand-desk-script-line brand-desk-script-line-type" />
      <span className="brand-desk-script-line brand-desk-script-line-type" />
    </div>
  </div>
  <div data-light-sweep />
</div>
```

Recommended element count:

- 3 page entrance wrappers;
- 3 page layers;
- 4-5 script line strips;
- 1 light sweep;
- 1 texture or rule layer.

Anime.js animated elements: 3 page wrappers + 1 light sweep. CSS line reveal uses transform/opacity only.

## Motion Model

### Static-First Fallback

Wrappers are visible by default. The hook only sets `data-hero-motion="entering"` after Anime.js has loaded and the animation is about to run.

This means:

- JavaScript absent: scene is visible;
- Anime.js import failed: scene is visible;
- hydration blocked: scene is visible;
- reduced motion: scene is visible and Anime.js is bypassed.

### Initial Entrance

Triggered once after mount:

1. page wrappers enter from `translateY(12px) opacity 0`;
2. inner page nodes keep their static rotate/translate stack transforms;
3. light sweep fades once;
4. brand copy remains readable and may use existing CSS reveal.

Duration target:

```text
500ms - 900ms total
```

### Idle State

CSS-only and subtle:

- script line reveal uses `scaleX` + opacity;
- decorative rules remain static;
- no infinite Anime.js loop.

Idle motion must stop under reduced motion.

### Hover / Focus

No hover interaction is currently implemented. If added later:

- desktop pointer devices only;
- no coarse pointer activation;
- no pointer-event overlay;
- carousel controls must remain clickable.

## Implementation Plan

### Phase 1 — Document And Baseline

Definition of Done:

- [x] Design direction selected: Cinematic Script Desk.
- [x] Anime.js boundaries documented.
- [x] Current homepage Lighthouse baseline recorded: Perf 98, A11y 100, SEO 100, CLS 0, FCP 0.8s (post font-cleanup).

### Phase 2 — Static Scene

Tasks:

- Create `BrandScriptDesk.tsx`.
- Render static script page stack and typewriter line strips.
- Replace `BrandScriptSea` usage in `GalleryBrandHeroSlide` with `BrandScriptDesk`.
- No Anime.js dependency in shared packages.

Definition of Done:

- [x] Static scene renders correctly in light/dark themes.
- [x] DOM element count stays within budget.
- [x] Homepage Lighthouse remains `>= 90`.
- [x] No layout shift introduced.

### Phase 3 — CSS Line Motion

Tasks:

- Add compositor-only CSS keyframes for script line reveal.
- Add `prefers-reduced-motion` static fallback.
- Keep decorative loops small or finite.

Definition of Done:

- [x] All animated CSS properties are transform/opacity only.
- [x] Reduced motion disables decorative motion.
- [x] Homepage Lighthouse remains `>= 90`.

### Phase 4 — Anime.js Entrance Timeline

Implemented architecture:

- Entrance wrappers (`[data-script-page-enter]`) are separate from inner composition nodes.
- Anime.js only animates wrapper `translateY` + opacity. Inner nodes keep static rotate/translate for stack depth.
- CSS line reveal lives on inner line nodes only; no opacity conflict with entrance wrappers.
- `getAnimate()` from `animeLoader.ts` is the only Anime.js loading path.
- `animate()` return values are saved in `instancesRef`; cleanup calls `.pause()` on all.
- Cleanup removes `data-hero-motion` and clears inline wrapper transform/opacity.
- Static-first behavior prevents blank scenes if Anime.js fails.

Definition of Done:

- [x] Anime.js is not in initial sync bundle.
- [x] Reduced motion bypasses Anime.js.
- [x] Animation payload uses transform/opacity only.
- [x] Cleanup restores wrapper visibility.
- [x] Homepage Lighthouse remains `>= 90`.

### Phase 5 — Optional Hover Micro-Interaction

Tasks:

- Add hover/focus enhancement on desktop pointer devices only, if visual QA proves it improves the hero.
- Keep the scene `pointer-events-none` unless a dedicated wrapper owns hover state.
- Do not add interaction on coarse pointer devices.

Definition of Done:

- [ ] Hover effect is disabled on coarse pointers.
- [ ] Carousel controls remain clickable.
- [ ] No pointer-event overlay blocks nav/buttons.

### Phase 6 — QA And Regression Tests

Tests:

- static scene renders;
- reduced-motion fallback exists;
- no direct Anime.js import outside allowed path;
- animation payload uses transform/opacity only;
- import failure leaves scene visible;
- cleanup pauses instances and clears inline styles.

Manual QA:

- desktop light/dark;
- mobile 390px;
- wide desktop;
- carousel with image slides and brand slide mixed;
- reduced motion.

Performance QA:

- Lighthouse `/` after deploy;
- compare FCP/LCP/TBT/CLS with baseline;
- inspect bundle for Anime.js placement.

Definition of Done:

- [ ] Homepage Performance `>= 90`.
- [ ] Accessibility `100`.
- [ ] SEO `100`.
- [ ] CLS `0`.
- [ ] TBT regression `<= +50ms`.

## What Not To Do

- Do not build a chapter waterfall with dozens of animated lines.
- Do not animate individual characters in brand copy.
- Do not use canvas for this iteration.
- Do not create a heavy particle field.
- Do not run an Anime.js infinite loop.
- Do not add route data or API dependency to the brand animation.
- Do not make animation required for content comprehension.
- Do not move this animation into `@write/public-ui`.

## Open Questions

- Should the script line strips eventually use real script-like snippets, or remain abstract?
- Should the light sweep exist in dark mode only, or both themes?
- Should the brand slide pause carousel autoplay during entrance animation?
- Should image banner slides share any of the same motion vocabulary?

## Recommended Next Step

Run Phase 6 browser QA after deploy:

1. inspect desktop dark/light;
2. inspect 390px mobile;
3. verify reduced-motion static fallback;
4. run Lighthouse `/`;
5. confirm Anime.js remains outside the initial sync bundle.
