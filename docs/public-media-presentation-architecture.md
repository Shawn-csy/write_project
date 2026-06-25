# Public Media Presentation Architecture

Last updated: 2026-06-25

## Phase Status

| Phase | Title                                | Status  |
|-------|--------------------------------------|---------|
| 1     | Display Presets                      | Done    |
| 2     | Crop Model                           | Done    |
| 3     | Public Image Renderer                | Done    |
| 4     | Editor Preview Panel                 | Planned |
| 5     | Per-Preset Overrides                 | Planned |
| 6     | Migration Plan                       | Done    |
| 7     | Media URL Boundary                   | Done    |
| 8     | Shared UI Image Renderer Slot        | Done    |
| 9     | Hero Banner Placement Integration    | Done    |
| 10    | Hero Art Direction                   | Runtime Done; Editor Pending |

## Purpose

This document defines the long-term media presentation architecture for the
public frontend. The goal is to make uploaded images predictable across homepage
cards, banners, avatars, logos, reader headers, and future previews.

This is not an `object-fit` tweak plan. The public site needs a stable model for:

- image display presets;
- crop/focal-point semantics;
- Next.js image rendering;
- editor preview across multiple target sizes;
- migration away from ad hoc `style` and `transform` handling.

## Problem Statement

Some uploaded images show blank space when displayed in full-width homepage
contexts. This usually happens when the image crop model, `next/image fill`,
container aspect ratio, and transform-based zoom are combined without a single
presentation contract.

Current risks:

- one crop value is reused across very different aspect ratios;
- `getMediaCropStyle()` was originally designed around direct `<img>` rendering;
- `next/image fill` and transform-based crop style can interact badly;
- components choose their own aspect ratio, `sizes`, fallback, and crop behavior;
- authors cannot preview how the same image will look in each public placement.
- shared public UI components render plain `<img>` while Next-owned components use
  `PublicImage`; media URLs must work in both contexts;
- homepage hero now uses the `hero-banner` preset through a renderer slot, but
  it still needs hero-specific art direction for ultra-wide compositions.

## Principles

1. Display intent must be explicit through a preset.
2. Components should pass semantic image data, not hand-built crop CSS.
3. The renderer should prevent blank-space states by construction.
4. Editor preview must use the same renderer as the public site.
5. Dynamic crop/focal values can remain data-driven; static visual treatment
   belongs in shared primitives.
6. Packages that are not Next.js apps must not depend on `next/image`.
7. API/BFF responses must return browser-facing media URLs, not Docker-internal
   backend URLs.
8. `next/image` optimization is an app-level renderer concern, not a data-layer
   rewrite concern.
9. Shared UI components that need host-specific image behavior must accept an
   image renderer slot/context instead of importing host renderer implementations.

## Phase 1 — Display Presets

Status: Runtime Done; Editor Pending

### Implementation Notes

- `apps/public/lib/imagePresets.ts` — `PublicImagePreset` union type + `PRESETS` record with `aspectRatio`, `sizes`, `objectFit`, `cropMode` per placement.
- 9 presets: `script-cover`, `series-cover`, `hero-banner`, `author-banner`, `org-banner`, `reader-backdrop`, `avatar`, `logo`, `thumbnail`.
- `logo` uses `contain-safe` cropMode and `objectFit: contain` — full mark visibility for org logos.
- All other presets use `focal-cover` with `objectFit: cover`.

Define the public image placements as presets.

```ts
export type PublicImagePreset =
  | "script-cover"
  | "series-cover"
  | "hero-banner"
  | "author-banner"
  | "org-banner"
  | "reader-backdrop"
  | "avatar"
  | "logo"
  | "thumbnail";
```

Each preset owns:

```ts
interface PublicImagePresetConfig {
  aspectRatio: string;
  sizes: string;
  objectFit: "cover" | "contain";
  cropMode: "cover-crop" | "contain-safe" | "focal-cover";
}
```

Initial preset recommendations:

| Preset | Ratio | Fit | Notes |
| --- | --- | --- | --- |
| `script-cover` | `2 / 3` | cover | Main card covers |
| `series-cover` | `2 / 3` | cover | Series cards and thumbnails |
| `hero-banner` | `16 / 5` or container-defined | cover | Homepage banner |
| `author-banner` | `4 / 1` | cover | Author profile header |
| `org-banner` | `4 / 1` | cover | Organization profile header |
| `reader-backdrop` | container-defined | cover | Blurred atmospheric layer |
| `avatar` | `1 / 1` | cover | Persona avatar |
| `logo` | `1 / 1` | contain-safe by default | Organization logos may need full mark visibility |
| `thumbnail` | caller-defined | cover | Small list/card thumbnails |

## Phase 2 — Crop Model

Status: Done

### Implementation Notes

- `resolvePresetStyle()` in `apps/public/lib/imagePresets.ts` converts `MediaCropRef` (cx/cy `-1..1`) to `objectPosition` using the full 0–100% range: `pos = (c + 1) / 2 * 100`.
- No `transform: scale()` — the old `getMediaCropStyle()` applied a CSS scale which exposed empty container areas when combined with `next/image fill`. Removed.
- `contain-safe` presets (logo) skip focal-point calculation; no `objectPosition` applied.
- `zoom` field in `MediaCropRef` is intentionally ignored in public renderer. `objectFit: cover` + focal `objectPosition` eliminates blank space without scale transforms. Zoom will remain ignored until a per-preset crop editor exists that can preview zoom effect per placement (Phase 4/5). Do not infer zoom support from `MediaCropRef.zoom` being present in the data model.

The crop model should represent intent, not raw CSS transforms.

Recommended shape:

```ts
export interface PublicMediaCrop {
  focalX: number; // 0..1
  focalY: number; // 0..1
  zoom: number;   // >= 1
}
```

Renderer rules:

- clamp `focalX` and `focalY` to `0..1`;
- clamp `zoom` to the supported editor range;
- calculate object position from focal point;
- avoid transform styles that can expose empty container areas;
- use `cover` presets when full-bleed visual fill is required;
- use `contain-safe` only for logos or assets where full mark visibility matters.

Future extension:

```ts
export interface PublicMediaCropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
```

Crop rect is more precise but should not be introduced until the editor UI can
support it properly.

## Phase 3 — Public Image Renderer

Status: Done

### Implementation Notes

- `apps/public/components/PublicImage.tsx` — accepts `src`, `alt`, `preset`, `crop?`, `sizes?` (override), `priority?`, `className?`.
- `sizes` defaults to preset config value; caller can override for fixed-pixel contexts (e.g. 48px avatar in list).
- Callers no longer call `getMediaCropStyle()` — crop is passed as raw `MediaCropLike` and resolved internally.
- `PublicImage` is the only boundary that upgrades browser-facing `/media/...`
  URLs to the backend origin for `next/image`'s server-side optimizer.
- Unknown external image hosts fall back to plain `<img>` instead of going through
  `next/image`; this avoids an open optimizer/proxy surface.
- **Fallback contract (current):** `if (!src) return null`. No placeholder slot. Callers are responsible for rendering their own empty state. The "consistent fallback contract" target in Phase 3 is partially met — blank-space is prevented by `objectFit: cover`, but a visual placeholder/skeleton for missing images is not yet implemented. This is acceptable until Phase 4 editor preview requires a shared empty state.
- `packages/public-ui` `<img>` tags remain unchanged — package boundary, no Next.js dependency.

`PublicImage` should evolve from a thin `next/image` wrapper into a preset-based
renderer.

Target API:

```tsx
<PublicImage
  src={src}
  alt={alt}
  preset="script-cover"
  crop={crop}
  priority={isAboveFold}
/>
```

Responsibilities:

- wrap `next/image`;
- choose `sizes` from preset unless explicitly overridden;
- apply safe object-position based on crop/focal point;
- expose a consistent fallback contract;
- prevent blank-space states;
- support debug overlay in development.

Non-goals:

- Do not accept arbitrary transform style from callers.
- Do not require every caller to know the target `sizes` string.
- Do not put Next.js image logic into `packages/public-ui`.

## Phase 4 — Editor Preview Panel

Status: Planned

Authors need to see how one image appears across public placements before saving.

The preview panel should render the same image through the same renderer in
multiple presets:

- script cover;
- series cover;
- homepage hero/banner;
- author banner;
- organization banner;
- avatar/logo;
- reader backdrop;
- mobile card preview.

Suggested UI:

```text
Image Crop

[Original image + focal-point editor]

Preview
[Script Cover] [Series Cover] [Avatar]
[Hero Banner Wide]
[Author Banner]
[Mobile Card]
```

Rules:

- Preview must not use a separate rendering implementation.
- Preview labels should show target ratio and placement.
- Empty/unsafe areas should be visually obvious in edit mode.
- The editor should warn when a crop is poor for an important preset.

## Phase 5 — Per-Preset Overrides

Status: Planned

A single crop cannot satisfy every placement. Use one default crop with optional
per-preset overrides.

```ts
export interface PublicMediaPresentation {
  src: string;
  defaultCrop?: PublicMediaCrop;
  crops?: Partial<Record<PublicImagePreset, PublicMediaCrop>>;
}
```

Resolution order:

1. `crops[preset]`;
2. `defaultCrop`;
3. centered fallback `{ focalX: 0.5, focalY: 0.5, zoom: 1 }`.

This keeps simple uploads simple while allowing advanced tuning.

## Phase 6 — Migration Plan

Status: Done

### Implementation Notes

- `ScriptCard` — `script-cover` preset; crop from `script.coverCrop`.
- `SeriesPageClient` — cover thumbnail: `series-cover`; atmospheric blur banner: `hero-banner` (no crop applied, intentionally blurred; `reader-backdrop` reserved for future reader page overlay).
- `AuthorPageClient` — banner: `author-banner`; avatar: `avatar`; series thumbnails: `thumbnail`.
- `OrgPageClient` — banner: `org-banner`; logo: `logo` (contain); member avatars: `avatar`.
- `GalleryPeopleGrid` — author avatars: `avatar`; org logos: `logo`.
- All callers removed `getMediaCropStyle()` import and call; crop passed directly as `MediaCropLike`.

1. Add preset config and crop resolver.
2. Refactor `PublicImage` to accept `preset` + `crop`.
3. Migrate homepage gallery cards:
   - `script-cover`;
   - `series-cover`.
4. Migrate entity pages:
   - author/org banners;
   - author avatars;
   - org logos;
   - series header cover.
5. Add editor preview panel.
6. Add per-preset override persistence.
7. Migrate reader backdrop and related sections.

## Phase 7 — Media URL Boundary

Status: Done

### Contract

Public API data must keep media URLs browser-facing:

```ts
coverUrl: "/media/user/cover.webp"
avatar: "/media/user/avatar.jpg"
```

It must not rewrite them to Docker-internal origins:

```ts
// Do not emit this from API/BFF data:
coverUrl: "http://write_project-backend:1091/media/user/cover.webp"
```

Reason:

- `@write/public-ui` components intentionally render plain `<img>` and run in the
  browser.
- Browsers cannot resolve Docker-internal hostnames.
- Next's optimizer is the only consumer that needs backend-internal absolute URLs.

### Runtime Routing

- Production nginx serves `/media/...` by proxying to backend.
- Next dev/standalone uses `next.config.ts` rewrites for `/media/:path*`.
- `/api/public-*` routes are routed to the Next BFF in nginx so deployment method
  does not change public frontend API behavior.

### Implementation Notes

- `apps/public/lib/api.ts` returns backend JSON unchanged.
- `apps/public/components/PublicImage.tsx` resolves `/media/...` to backend origin
  only for `next/image`.
- `apps/public/lib/publicImageOrigins.ts` owns the allowlist for external origins
  that can use `next/image`.

## Phase 8 — Shared UI Image Renderer Slot

Status: Done

`packages/public-ui` must remain framework-neutral. It cannot import
`next/image`, `PublicImage`, or app-local Next helpers.

For components that need host-specific image behavior, use a renderer slot:

```tsx
type PublicImageRenderer = (input: {
  src: string;
  alt: string;
  preset: PublicImagePreset;
  crop?: MediaCropLike | null;
  priority?: boolean;
  className?: string;
}) => React.ReactNode;
```

Shared components should default to plain `<img>` fallback but allow the Next app
to inject `PublicImage`.

Targets:

- `PublicHeroMarquee`;
- `ScriptGalleryCard`;
- `SeriesGalleryCard`;
- reader related sections that show covers or banners.

Initial priority is `PublicHeroMarquee`, because homepage hero is the visible
place where image aspect and focal crop currently diverge from the preset system.

### Completed Scope

- `HeroSlide.image` is available as the structured image field.
- `PublicHeroMarquee` accepts a `renderImage` slot.
- `packages/public-ui` still has no dependency on `next/image` or app-local
  `PublicImage`.
- The plain `<img>` fallback remains for non-Next hosts.

## Phase 9 — Hero Banner Placement Integration

Status: Done

Homepage hero must be treated as a first-class image placement, not a standalone
carousel with hand-written `<img className="object-cover">`.

### Data Model

Target `HeroSlide` shape:

```ts
interface HeroSlide {
  id?: string | number;
  title?: string;
  subtitle?: string;
  content?: string;
  link?: string;
  image?: {
    url: string;
    crop?: MediaCropLike | null;
    alt?: string;
  };
  overlayOpacity?: number;
}
```

Compatibility adapters may still read legacy `imageUrl`, but the internal model
should be `image`.

### Renderer Contract

`PublicHeroMarquee` should accept a renderer slot:

```tsx
<PublicHeroMarquee
  slides={slides}
  fullBleed
  renderImage={(image, slide, index) => (
    <PublicImage
      src={image.url}
      crop={image.crop}
      preset="hero-banner"
      alt={image.alt || slide.title || "banner"}
      priority={index === 0}
    />
  )}
/>
```

Fallback behavior without `renderImage`:

- render a plain `<img>`;
- use the same semantic `image.url` / `image.crop` data;
- never import Next-specific code.

### What This Solves

The current hero image path is:

```txt
GalleryClient → PublicHeroMarquee → raw <img object-cover>
```

It does not know about `hero-banner`, focal crop, or per-placement overrides.
On ultra-wide viewports, this can expose undesirable parts of the source image
or make poor source composition obvious.

The target path is:

```txt
GalleryClient → PublicHeroMarquee renderImage slot → PublicImage(hero-banner)
```

This uses the same placement preset and focal-point policy as the rest of the
public media system.

This phase solves the renderer boundary problem. It does **not** guarantee that
every uploaded source image composes well in an ultra-wide full-bleed hero. If
the source image has dark or empty content near one side, `object-fit: cover`
will still faithfully show that content unless the author provides a
placement-specific focal crop or the renderer has an art-direction fallback.

### Completed Scope

- `GalleryClient` injects `PublicImage` for homepage hero slides.
- Homepage hero uses the `hero-banner` preset through the host renderer slot.
- The first slide is marked `priority` for LCP.
- `parseBannerSlides` projects legacy `imageUrl` plus optional `imageCrop` into
  `HeroSlide.image`.

## Phase 10 — Hero Art Direction

Status: Done

The remaining black-edge issue belongs here. It is not a `next/image`,
optimizer, media URL, or renderer-slot problem. It is a hero composition
problem.

### Problem

Full-bleed hero banners are intentionally wider than most uploaded artwork. At
maximum desktop widths, a source image can expose one of these states:

- dark or empty source content on one side;
- a subject positioned too close to the edge;
- a source aspect ratio that works for cards but not for ultra-wide hero;
- no hero-specific focal crop, so the generic center crop is used.

Changing `object-fit`, hard-coding `object-position`, or adding per-page scale
would only hide the symptom for one image and break another. The fix must be a
placement-aware hero composition model.

### Target Contract

Hero images should support explicit hero placement data:

```ts
interface HeroImagePlacement {
  url: string;
  alt?: string;
  crop?: MediaCropLike | null;
  mobileCrop?: MediaCropLike | null;
  desktopCrop?: MediaCropLike | null;
  ultraWideCrop?: MediaCropLike | null;
  backgroundMode?: "cover" | "blur-fill";
}
```

The public renderer should choose the most specific crop by viewport class:

```txt
mobile viewport      → mobileCrop ?? crop
desktop viewport     → desktopCrop ?? crop
ultra-wide viewport  → ultraWideCrop ?? desktopCrop ?? crop
```

### Rendering Strategy

Default strategy:

- render one `PublicImage(preset="hero-banner")` as the primary image;
- use placement crop to control focal point;
- keep `object-fit: cover`.

Blur-fill strategy for difficult images:

- `backgroundMode: "blur-fill"` switches the foreground to `object-fit: contain`
  (letterbox — shows the full image without cropping);
- a blurred, oversized copy of the same image renders behind it, filling the
  letterbox bars so no black edges appear;
- use when the source image aspect ratio is narrower than the hero container at
  ultra-wide viewports and cropping is undesirable;
- set alongside `ultraWideCrop` to control where the background blur layer is
  centred.

### Future Editor Requirements

The editor must eventually allow hero-specific crop preview:

- desktop wide preview;
- current hero ratio preview;
- mobile hero preview;
- warning when image composition is poor for full-bleed hero;
- optional `hero-banner` placement override;
- explicit ultra-wide preview because this is where the current black edge
  appears.

### Runtime Acceptance Criteria

- No hero source requires a carousel-local hard-coded `object-position`.
- The homepage hero can choose mobile, desktop, and ultra-wide focal crops.
- Ultra-wide viewport QA confirms no unwanted edge band for the current banner.
- The implementation remains split correctly:
  `packages/public-ui` owns renderer slot and layout;
  `apps/public` owns Next image rendering;
  editor/dashboard owns placement editing.

### Editor Acceptance Criteria

- Authors can preview the exact visible crop before publishing.
- Editor preview covers desktop, mobile, and ultra-wide hero variants.
- Per-placement hero crop data can be persisted without changing the public
  renderer contract.

## Do Not Do

- Do not use per-page `scale-110` to fix crop blank space. Decorative blurred backdrops (e.g. series header atmospheric layer) may use explicit overscan (`scale-110`) if the intent is visual blur overscan, not crop compensation, and it is documented at the call site.
- Do not switch all public images to `contain`.
- Do not pass raw crop transform styles through multiple components.
- Do not let each page define its own `sizes` and aspect-ratio semantics.
- Do not duplicate preview rendering outside the canonical renderer.
- Do not rewrite `/media/...` API data to Docker-internal backend URLs.
- Do not use `remotePatterns: [{ hostname: "**" }]` for `next/image`.
- Do not import `next/image` or app-local `PublicImage` from `packages/public-ui`.
- Do not fix homepage hero full-width issues by hard-coding `object-position`
  in the carousel. Hero must use `hero-banner` preset and image renderer slot.
- Do not treat the remaining hero black edge as a media URL, optimizer, or
  `object-fit` issue. It requires hero art direction.

## Definition Of Done

The media system is complete when:

- each public image placement uses a named preset;
- the renderer prevents blank-space states without ad hoc scale hacks;
- editor preview uses the same renderer as public pages;
- authors can inspect at least card, banner, avatar/logo, and mobile previews;
- per-preset overrides are supported for advanced cases;
- `next/image` remains isolated to the Next public app boundary;
- `/media/...` works for both browser `<img>` and Next image optimizer;
- shared UI image components support host renderer injection where needed;
- homepage hero uses the `hero-banner` preset through the host renderer slot;
- hero art direction supports placement-specific crops for mobile, desktop, and
  ultra-wide hero previews;
- browser QA confirms no blank space on homepage cards/banners at common widths.
