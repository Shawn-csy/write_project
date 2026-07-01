# Next-Native Public Frontend Architecture

Last updated: 2026-06-24

## Phase Status

| Phase | Title                    | Status  |
|-------|--------------------------|---------|
| 1     | Font System              | Done    |
| 2     | Image Primitive          | Done    |
| 3     | JSON-LD Output Contract  | Done    |
| 4     | Editorial Design Primitives | Done    |
| 5     | Route Boundaries         | Done    |

## Purpose

This document defines the long-term architecture for making `apps/public`
properly Next-native. The goal is not to cosmetically replace APIs. The goal is
to move repeated frontend infrastructure into stable boundaries so the public
site benefits from Next.js where it matters:

- font loading;
- image optimization;
- structured data output;
- editorial design primitives;
- route loading/error/not-found boundaries.

## Current Assessment

The public app already uses important Next.js features correctly:

- App Router file routes in `apps/public/app`;
- server `page.tsx` data fetching with client components for interaction;
- `generateMetadata()` for SEO pages;
- ISR via `export const revalidate`;
- on-demand revalidation through `revalidatePath()`;
- BFF route handlers for same-origin public API access;
- standalone output with monorepo tracing.

The remaining gaps are not page-level features. They are infrastructure gaps:

- fonts are not centralized through `next/font` — **done (Phase 1)**;
- images optimized through `PublicImage` primitive — **done (Phase 2)**;
- JSON-LD output is manually escaped in more than one style — **done (Phase 3)**;
- editorial styling consolidated into `@layer components` primitives — **done (Phase 4)**;
- route-level loading/error/not-found states are incomplete — **done (Phase 5)**.

## Principles

1. Build primitives first, migrate call sites second.
2. Keep server-only helpers out of client barrels.
3. Do not introduce page-specific one-off abstractions for shared concerns.
4. Preserve the current editorial visual direction.
5. Keep reader-specific behavior separate from homepage/gallery behavior.
6. Prefer measured migration over broad mechanical replacement.

## Phase 1 — Font System

Status: Done

Goal: all public-site fonts are controlled by Next.js, not CSS `@import`.

### Target Architecture

Create one font entrypoint:

```ts
// apps/public/app/fonts.ts
export const publicSans = ...
export const publicSerif = ...
```

`layout.tsx` attaches the font variables to `<html>`:

```tsx
<html className={`${publicSans.variable} ${publicSerif.variable}`}>
```

`globals.css` continues to expose semantic font tokens:

```css
--font-sans: var(--font-public-sans), system-ui, sans-serif;
--font-serif: var(--font-public-serif), Georgia, serif;
```

### Required Work

- Remove CSS `@import url(...)` font loading.
- Use `next/font/google` or self-hosted local font files.
- Keep the existing Tailwind `fontFamily` mapping.
- Verify homepage, reader, print/PDF output, and dark mode.

### Implementation Notes

- `apps/public/app/fonts.ts` — `Noto_Sans_TC` (400/500/700) + `Noto_Serif_TC` (400/700) via `next/font/google`.
- Variables `--font-public-sans` / `--font-public-serif` attached to `<html>` in `layout.tsx`.
- `globals.css` `--font-sans`/`--font-serif` reference the Next.js variables with CJK system stack as fallback.
- `preload: false` is intentional: Noto TC is a large CJK font; preloading the latin subset offers minimal benefit while adding link overhead. The system CJK stack (`PingFang TC`, `Noto Sans TC`) covers CJK glyphs without download.

### Non-Goals

- Do not change the editorial font direction.
- Do not replace the reader font preference model.

## Phase 2 — Image Primitive

Status: Done

Goal: image optimization is adopted through a shared primitive instead of
directly replacing `<img>` everywhere.

### Target Architecture

`PublicImage` wraps `next/image` in `fill` mode. Callers call `getMediaCropStyle()` first and pass the resulting `style` prop:

```tsx
const { src, style } = getMediaCropStyle(coverUrl, coverCrop);

<div className="relative w-24 h-32 overflow-hidden">
  <PublicImage src={src} alt={title} sizes="96px" style={style} />
</div>
```

`PublicImage` does not accept a raw crop object. Crop-to-CSS conversion stays in `getMediaCropStyle`. `PublicImage` is responsible for:

- Next.js image optimization and `sizes`-based responsive loading;
- applying `objectFit: "cover"` merged with caller-provided `style`;
- returning `null` when `src` is empty.

### Migration Order

1. Gallery script card covers.
2. Series card covers.
3. Hero/banner images.
4. Author avatars.
5. Organization logos.
6. Reader overlay/related section images.

### Rules

- Do not convert all `<img>` mechanically.
- Do not duplicate crop logic in each component.
- Keep decorative images `aria-hidden` where appropriate.
- Keep meaningful covers and avatars with real alt text.

### Implementation Notes

- `apps/public/components/PublicImage.tsx` — `next/image` `fill` mode wrapper; accepts `src`, `alt`, `sizes`, `style` (from `getMediaCropStyle`).
- Image hostnames served from `open-scripts.shawnup.com/media/...` via nginx static serving, already in `remotePatterns`.
- Migrated: `ScriptCard` covers, `SeriesPageClient` banner + cover thumbnail, `AuthorPageClient` banner + avatar + series thumbnails, `OrgPageClient` banner + logo + member avatars, `GalleryPeopleGrid` author avatars + org logos.
- `packages/public-ui` `<img>` tags not migrated — package does not depend on Next.js and cannot use `next/image`.

## Phase 3 — JSON-LD Output Contract

Status: Done

Goal: all structured data output uses one escape/render path.

### Target Architecture

```ts
// apps/public/lib/jsonLd.tsx
export function jsonLdSafe(value: unknown): string
export function JsonLdScript({ data }: { data: unknown }): React.ReactElement
```

All pages render JSON-LD through `JsonLdScript`. `lib/seo.ts` re-exports `jsonLdSafe` from `jsonLd` for backward compatibility.

### Implementation Notes

- All 6 page components (`/`, `/read/[id]`, `/series/[name]`, `/tag/[name]`, `/author/[id]`, `/org/[id]`) use `<JsonLdScript data={...} />`.
- `generateMetadata().other` does not carry JSON-LD — that was a prior misuse; removed from `author` and `org` pages.
- `lib/seo.ts` `jsonLdSafe` is now a re-export; the canonical impl lives in `lib/jsonLd.tsx`.

### Tests

- Escapes `<`, `>`, and `&`.
- Accepts object and array payloads.
- Does not double-escape valid JSON.

## Phase 4 — Editorial Design Primitives

Status: Done

Goal: preserve the current preferred editorial style while reducing inline
style drift.

### Target Architecture

Add component-level design classes under `@layer components`:

```css
.editorial-panel {}
.editorial-card {}
.editorial-control {}
.editorial-action {}
.editorial-chip {}
.editorial-reveal {}
.editorial-hover-surface {}
```

Use CSS variables for:

- palette;
- border;
- radius;
- shadow;
- motion timing;
- public text scale.

### Rules

- Dynamic crop/object-position style can stay inline.
- Static shadows, borders, gradients, and motion should move into classes.
- Do not create one-off variants per page unless the page has a real layout
  reason.
- Hit targets remain at least 44px even when the visible control is compact.

### Implementation Notes

- Classes added to `globals.css` `@layer components`: `.editorial-border-b`, `.editorial-border-b-strong`, `.editorial-hero-wash`, `.editorial-grain`, `.editorial-accent-rule`, `.editorial-rule`, `.editorial-eyebrow`, `.editorial-dim`, `.editorial-indicator`, `.editorial-scrim`, `.editorial-handle`.
- Migrated: `GalleryStaticHero`, `GallerySegmentBar`, `GalleryMobileSheet`, `GalleryListOverlay`.
- Dynamic values (animation delays, sliding indicator `left`/`width`, crop styles) remain inline per the rules.

## Phase 5 — Route Boundaries

Status: Done

Goal: App Router route states are deliberate and branded.

### Required Files

Global:

- `apps/public/app/loading.tsx`;
- `apps/public/app/error.tsx`;
- `apps/public/app/not-found.tsx`.

Route-level:

- `apps/public/app/read/[id]/loading.tsx`;
- `apps/public/app/read/[id]/error.tsx`;
- `apps/public/app/series/[name]/loading.tsx`;
- `apps/public/app/author/[id]/loading.tsx`;
- `apps/public/app/org/[id]/loading.tsx`.

### UX Contract

- Loading uses editorial skeletons, not generic spinners.
- Error states are in Traditional Chinese.
- Error states include retry or navigation actions.
- 404 is branded and links back to the public homepage.

### Implementation Notes

- Global: `app/error.tsx`, `app/loading.tsx`, `app/not-found.tsx` — all present.
- Route-level: `read/[id]/loading.tsx`, `read/[id]/error.tsx`, `series/[name]/loading.tsx`, `author/[id]/loading.tsx`, `org/[id]/loading.tsx`.
- Error components use the stable `reset` prop (not `unstable_retry`).
- `not-found.tsx` includes topbar + branded 404 + link to `/`.

## Execution Order

1. Phase 1 — Font system.
2. Phase 3 — JSON-LD output contract.
3. Phase 5 — route boundaries.
4. Phase 2 — image primitive.
5. Phase 2 migration for gallery/hero/entity images.
6. Phase 4 — editorial design primitive extraction.
7. Browser QA and Lighthouse/CLS review.

This order is intentional. Fonts, JSON-LD, and route states are low-risk
infrastructure changes. Image migration has a wider rendering surface and should
start only after the primitive is stable.

## Definition Of Done

Each phase is complete only when:

- the shared primitive or contract exists;
- at least one high-value caller uses it;
- tests cover the shared helper or component contract;
- `next build` passes;
- no new one-off page-level implementation is introduced;
- documentation reflects the final boundary.

## Non-Goals

- Do not reintroduce Vite public-page behavior.
- Do not optimize images by hand with ad hoc `srcset`.
- Do not put JSON-LD escaping in page components.
- Do not move reader-specific settings into public shell actions.
- Do not solve visual issues by scaling the entire document.

