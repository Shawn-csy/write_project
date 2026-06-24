# Public Media Presentation Architecture

Last updated: 2026-06-24

## Phase Status

| Phase | Title                    | Status  |
|-------|--------------------------|---------|
| 1     | Display Presets          | Done    |
| 2     | Crop Model               | Done    |
| 3     | Public Image Renderer    | Done    |
| 4     | Editor Preview Panel     | Planned |
| 5     | Per-Preset Overrides     | Planned |
| 6     | Migration Plan           | Done    |

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

## Principles

1. Display intent must be explicit through a preset.
2. Components should pass semantic image data, not hand-built crop CSS.
3. The renderer should prevent blank-space states by construction.
4. Editor preview must use the same renderer as the public site.
5. Dynamic crop/focal values can remain data-driven; static visual treatment
   belongs in shared primitives.
6. Packages that are not Next.js apps must not depend on `next/image`.

## Phase 1 — Display Presets

Status: Done

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

## Do Not Do

- Do not use per-page `scale-110` to fix crop blank space. Decorative blurred backdrops (e.g. series header atmospheric layer) may use explicit overscan (`scale-110`) if the intent is visual blur overscan, not crop compensation, and it is documented at the call site.
- Do not switch all public images to `contain`.
- Do not pass raw crop transform styles through multiple components.
- Do not let each page define its own `sizes` and aspect-ratio semantics.
- Do not duplicate preview rendering outside the canonical renderer.

## Definition Of Done

The media system is complete when:

- each public image placement uses a named preset;
- the renderer prevents blank-space states without ad hoc scale hacks;
- editor preview uses the same renderer as public pages;
- authors can inspect at least card, banner, avatar/logo, and mobile previews;
- per-preset overrides are supported for advanced cases;
- `next/image` remains isolated to the Next public app boundary;
- browser QA confirms no blank space on homepage cards/banners at common widths.
