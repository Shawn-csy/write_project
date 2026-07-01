# Public Motion System

Last updated: 2026-06-26

This document defines how public pages may use JavaScript motion, including
Anime.js, without turning animation into scattered component-level decoration.

The goal is to improve perceived quality and interaction feedback while keeping
the public site fast, readable, accessible, and maintainable.

## Principles

Motion must be product-driven.

Allowed reasons to animate:

- clarify state change;
- confirm an async action completed;
- focus attention on one first-viewport story element;
- make navigation or filtering feel continuous;
- reveal transient UI such as panels or previews.

Not allowed:

- animation because a component is visually plain;
- per-card or per-button loops across large lists;
- scroll-driven spectacle on content pages;
- animation that delays the actual action;
- animation that hides missing layout or data architecture.

## Technical Rules

1. Prefer CSS for hover, focus, simple opacity, and simple transforms.
2. Use Anime.js only for timeline/stagger orchestration or stateful feedback.
3. Animate only `transform`, `opacity`, and, for SVG-only cases, stroke/dash
   attributes.
4. Do not animate layout properties such as `width`, `height`, `top`, `left`,
   `margin`, or `padding`.
5. All JS motion must support `prefers-reduced-motion`.
6. Motion must never block pointer events unless the animated element is the
   actual control.
7. Long-running decorative motion must be `aria-hidden` and
   `pointer-events: none`.
8. Anime.js must be lazy-loaded. It must not be part of the public shell's
   critical path.

## Dependency Boundary

Anime.js may be used only behind public motion helpers.

Allowed import locations:

```txt
apps/public/lib/motion/
apps/public/app/gallery/hero-motion/
```

Disallowed direct imports:

```txt
apps/public/components/*
apps/public/app/gallery/GalleryClient.tsx
apps/public/app/gallery/GalleryScriptResults.tsx
packages/public-ui/*
packages/script-reader-ui/*
```

Shared packages must remain framework-neutral and dependency-light. If a shared
component needs a motion effect, the Next host should inject that behavior via a
slot, hook, or wrapper.

## Proposed Motion Helpers

```txt
apps/public/lib/motion/
  useReducedMotion.ts
  useAnimePressFeedback.ts
  useAnimeSuccessFeedback.ts
  useAnimeSegmentIndicator.ts
  motionTokens.ts
```

`motionTokens.ts` owns durations, easing names, and scale values. Components
should not invent ad hoc timing values.

Example token shape:

```ts
export const PUBLIC_MOTION = {
  duration: {
    press: 120,
    settle: 220,
    panel: 260,
    success: 480,
  },
  scale: {
    press: 0.96,
    pop: 1.03,
  },
};
```

## Button Motion Taxonomy

### 1. Primary Actions

Examples:

- `進入工作室`
- `儲存`
- `建立`
- `加入系列`
- `公開`

Allowed motion:

- click press: `scale(0.96)` then settle;
- success confirmation: subtle pop or check icon pulse;
- loading progress only when the action is async and has visible waiting time.

Do not:

- delay navigation until animation finishes;
- add decorative hover timelines;
- run a loop on idle buttons.

### 2. Async Feedback Buttons

Examples:

- share;
- copy;
- PDF/export;
- like;
- save settings.

These are the best candidates for Anime.js because they have clear state
transitions.

Allowed motion:

- icon morph or pulse after success;
- short progress sweep while exporting;
- copied state pulse;
- disabled-to-ready transition when DOM/export target becomes available.

Implementation requirement:

- business state remains React-owned;
- Anime.js only animates the visible feedback layer.

### 3. Segmented Controls

Examples:

- `標準 / 密集`;
- theme selection;
- text scale selection;
- reader font size / line height controls.

Allowed motion:

- indicator slide;
- active pill resize;
- label opacity change.

Best target:

```txt
GalleryViewModeToggle
PublicAppearanceMenu segmented rows
ReaderPreferencesPanel segmented rows
```

Do not animate each option independently with unrelated timing. The segment
indicator should be the motion source of truth.

### 4. Icon-Only Shell Buttons

Examples:

- appearance;
- help/info;
- filter;
- carousel prev/next;
- reader settings;
- marker visibility.

Allowed motion:

- click press;
- icon rotate only when it maps to state, such as panel open/close;
- panel trigger highlight when open.

Do not:

- run JS motion on every hover;
- add ripples to every icon button;
- reduce hit target size for visual polish.

Minimum hit target remains 44px.

### 5. Destructive Actions

Examples:

- delete;
- detach;
- unpublish.

Allowed motion:

- confirmation panel fade;
- subtle warning ring on the second confirmation state.

Do not:

- shake aggressively;
- make destructive actions playful;
- animate away from the required confirmation flow.

## Public Page Opportunities

### Homepage Hero

Priority: High.

Best use:

- brand hero timeline;
- opened script desk with marker highlight;
- restrained page-curl cue;
- hero slide text stagger.

Rules:

- load Anime.js after mount;
- fallback to static hero when reduced motion is enabled;
- decorative layers must be `aria-hidden`;
- no hero text typing on the main H1.

### Homepage Gallery

Priority: Medium.

Best use:

- view mode indicator transition;
- filter result enter transition capped to visible items;
- reset filters success feedback.

Rules:

- do not animate all cards on every keystroke;
- search typing should not create animation churn;
- hover preview must remain non-blocking.

### Public Shell Actions

Priority: Medium.

Best use:

- appearance panel trigger open state;
- info/help trigger;
- studio entry button press.

Rules:

- shell motion should be consistent across all public pages;
- reader topbar does not inherit global shell buttons.

### Reader Toolbar

Priority: Medium.

Best use:

- share copied feedback;
- PDF ready/export feedback;
- marker visibility menu open state;
- reader settings panel reveal.

Rules:

- never animate script content while reading;
- never shift toolbar layout during animation;
- all export/readiness states remain semantic buttons.

### Cards And Hover Preview

Priority: Low to Medium.

Best use:

- preview layer fade/position settle;
- like success feedback.

Rules:

- card hover scale remains CSS;
- cards must not individually import Anime.js;
- gallery-level preview provider owns the motion layer.

### Author / Org / Series Pages

Priority: Low.

Best use:

- page section reveal only if it does not delay content;
- tag chip feedback;
- chapter navigation feedback.

Rules:

- content pages should feel stable and readable;
- avoid decorative loops.

## First Implementation Phase

Phase 1 should be deliberately small.

1. Create motion tokens and reduced-motion helper.
2. Create `useAnimePressFeedback`.
3. Apply it to:
   - `PublicShellActions` buttons;
   - `GalleryViewModeToggle`;
   - reader toolbar share/PDF buttons.
4. Create `useAnimeSuccessFeedback`.
5. Apply it only to share/copy/PDF success states.

Completion criteria:

- no direct `animejs` imports outside `apps/public/lib/motion`;
- reduced motion disables JS animation;
- buttons remain immediately clickable;
- tests cover hook fallback behavior;
- browser QA confirms no blocked clicks, no layout shift, and no delayed
  navigation.

## Second Implementation Phase

If Phase 1 feels correct:

1. Move brand hero decorative motion into `apps/public/app/gallery/hero-motion`.
2. Lazy-load Anime.js only for the brand hero timeline.
3. Keep the static CSS fallback.
4. Add browser QA for:
   - desktop;
   - mobile;
   - reduced motion;
   - carousel slide switch.

Completion criteria:

- public hero remains meaningful before JS motion starts;
- LCP image/text is not dependent on Anime.js;
- the animation does not overlap or obscure the main headline;
- no continuous high-DOM animation outside the hero.

## Non-Goals

- Do not create a global animation framework for the whole app.
- Do not animate reader script body text.
- Do not animate every gallery card individually.
- Do not add Anime.js to shared packages.
- Do not use animation to hide broken loading, cropping, or layout states.
- Do not add motion to admin/editor workflows until public motion patterns are
  proven.

## Definition Of Done

This work is successful when:

- public button feedback feels consistent across topbar, gallery, and reader;
- the brand hero has one controlled motion layer, not multiple competing demos;
- all JS motion is isolated behind motion helpers;
- reduced-motion users receive a stable static experience;
- public page performance remains unaffected in build and browser QA;
- future components know whether to use CSS, Anime.js, or no animation at all.
