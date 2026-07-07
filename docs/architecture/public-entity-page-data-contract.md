# Public Entity Page Data Contract

This document defines the long-term fix for public author and organization page
drift. The current symptoms are:

- author pages can show a different cover/card presentation than the homepage;
- author profile tags are easy to confuse with script/content tags;
- organization pages have the same class of drift;
- entity pages may still be using an older app-local card path while the
  homepage uses the shared public gallery card system.

The goal is not a local patch to one page. The goal is one data contract and one
rendering path for public entity pages.

## Current Diagnosis

There are two plausible root causes, and both must be checked before coding.

### 1. Old data contract risk

Author and organization pages fetch:

- `/api/public-personas/{id}`
- `/api/public-organizations/{id}`
- `/api/public-scripts?personaId={id}`
- `/api/public-scripts?organizationId={id}`

These endpoints currently expose fields such as:

- `persona.avatar`
- `persona.bannerUrl`
- `persona.tags`
- `org.logoUrl`
- `org.bannerUrl`
- `org.tags`
- `script.coverUrl`
- `script.coverCrop`
- `script.coverDesign`
- `script.tags`
- `script.persona`
- `script.organization`
- `script.series`

Before changing UI, verify the page is not reading older or fallback identity
fields. Public author URLs should be persona-scoped. Owner fallback must not be
treated as a canonical author page unless a migration explicitly defines that
behavior.

### 2. Old rendering path risk

The homepage gallery uses the shared public gallery card system:

- `toGalleryInput(script)`
- `enrichScript(...)`
- `ScriptGalleryCard` / `ScriptGalleryCardFrame`
- app-level `PublicImage` cover renderer

Author, organization, and tag pages still use `apps/public/components/ScriptCard`.
That older card can diverge in:

- cover fallback behavior;
- `coverDesign` support;
- series badge placement;
- crop handling;
- author link rules;
- tag filtering and display rules;
- typography tokens and hover behavior.

The long-term fix is to remove this second public card path from entity pages.

## Canonical Public Entity Model

Public entity pages should project backend responses into a local page model
before rendering.

```ts
type PublicEntityKind = "author" | "organization";

interface PublicEntityProfileModel {
  kind: PublicEntityKind;
  id: string;
  name: string;
  description?: string;
  website?: string;

  image: {
    bannerUrl?: string;
    bannerCrop?: MediaCropLike | null;
    avatarUrl?: string;
    avatarCrop?: MediaCropLike | null;
    logoUrl?: string;
    logoCrop?: MediaCropLike | null;
  };

  /**
   * Tags configured on the profile itself.
   * These are not script/content tags.
   */
  profileTags: string[];

  /**
   * Tags aggregated from public scripts shown on this page.
   * These may be used for future filtering or secondary context, but must not
   * replace profileTags in the header.
   */
  workTags: string[];

  scripts: PublicScript[];
}
```

### Tag Semantics

Keep these categories separate:

| Category | Source | Where It Appears | Meaning |
| --- | --- | --- | --- |
| Profile tags | `persona.tags`, `org.tags` | entity header | author/org identity, specialty, role |
| Work tags | aggregate of `script.tags` | optional work filter/context | content tags from public works |
| Card tags | `script.tags` after gallery enrichment | each work card | content tags for that script |
| License tags | derived by gallery enrichment | card/filter shortcuts | usage rights, not profile identity |

Do not show work tags under a label that implies author/org identity.
Do not use profile tags as script card tags.

## Image Contract

| Placement | Source | Renderer | Preset |
| --- | --- | --- | --- |
| Author banner | `persona.bannerUrl` | `PublicImage` | `author-banner` |
| Author avatar | `persona.avatar` | `PublicImage` | `avatar` |
| Organization banner | `org.bannerUrl` | `PublicImage` | `org-banner` |
| Organization logo | `org.logoUrl` | `PublicImage` | `logo` |
| Script card cover | `script.coverUrl` / `script.coverDesign` | shared gallery card renderer | `script-cover` |
| Series badge/cover | `script.series.*` | shared gallery card renderer | card-owned |

`/media/...` must stay browser-facing in API data. It is converted to the
backend origin only inside `PublicImage` for Next image optimization.

## Execution Plan

### Phase 1 — Audit Data Shape ✅ COMPLETE

Confirmed:

- Author page fetches `/public-personas/{id}` — persona-scoped ✓
- Org page fetches `/public-organizations/{id}` — org-scoped ✓
- Root cause was old frontend card path (`ScriptCard`), not backend projection.

### Phase 2 — Introduce Entity Page Projection ✅ COMPLETE

`apps/public/lib/publicEntityPageModel.ts` — implemented and wired into production.

- `buildAuthorEntityModel(persona, scripts)` → `PublicEntityProfileModel`
- `buildOrgEntityModel(org, scripts)` → `PublicEntityProfileModel`
- `profileTags` (persona/org identity) separated from `workTags` (script content tags).
- Image fields explicit per entity kind; no cross-entity fallback.
- Owner fallback excluded from model identity.
- `AuthorPageClient` and `OrgPageClient` both call the builder; header renders
  `model.profileTags`, not `persona.tags` / `org.tags` directly.

Tests: `apps/public/lib/publicEntityPageModel.test.ts` (8 tests).

Open: image fields in headers (`bannerUrl`, `avatarUrl`, `logoUrl`) are still read
from raw props rather than from `model.image`. This is safe because the model
currently passes them through unchanged, but if fallback logic is added to the
model later, the header would not reflect it. Track separately if needed.

### Phase 3 — Replace App-Local ScriptCard on Entity Pages ✅ COMPLETE

`apps/public/components/EntityScriptGrid.tsx` — implemented.

- Accepts `PublicScript[]`.
- Projects each script via `toGalleryInput()` → `enrichScript()`.
- Renders `ScriptGalleryCard` with `PublicImage` cover renderer (same as homepage).
- `authorHref` uses raw `s.persona?.id` — owner fallback from `toGalleryInput`
  never produces a `/author/` link.
- `tagHref` passes `(tag) => /tag/${encodeURIComponent(tag)}` — tags render as
  crawlable `<a>` links, not JS buttons.

Migrated: `/author/[id]`, `/org/[id]`, `/tag/[name]`.
`apps/public/components/ScriptCard.tsx` deleted.

Tests: `apps/public/components/EntityScriptGrid.test.tsx` (4 tests) — covers
owner-only author link suppression and tag `<a>` rendering contract.

### Phase 4 — Clarify Header Tag UI ✅ COMPLETE

- Author header: `作者標籤` label above `model.profileTags` chips.
- Org header: `組織標籤` label above `model.profileTags` chips.
- Profile tag chips are `<span>` (not linked to `/tag/`), keeping them distinct
  from script content tag navigation.
- Work tag section (`作品標籤`) not yet surfaced in the UI; `workTags` is
  computed by the model but not rendered. Add when needed.

### Phase 5 — Remove or Quarantine the Old ScriptCard ✅ COMPLETE

`apps/public/components/ScriptCard.tsx` and its test deleted.
`rg "ScriptCard" apps/public/app` returns no matches.

## Verification Checklist

Use local production-like runtime (`http://localhost:1090`) after deployment.

Author page:

- banner/avatar match `/api/public-personas/{id}`;
- header profile tags match `persona.tags`;
- script cards match homepage card behavior;
- card tags match `script.tags`;
- card author links use persona ids only.

Organization page:

- banner/logo match `/api/public-organizations/{id}`;
- header profile tags match `org.tags`;
- script cards match homepage card behavior;
- member avatars use `member.avatar`;
- card tags match `script.tags`.

Tag page:

- script cards match homepage card behavior;
- no local card drift remains.

## Non-Goals

- Do not reintroduce Vite public pages as canonical references.
- Do not infer author identity from owner id unless a separate migration plan
  explicitly defines owner-to-persona redirects.
- Do not make backend media URLs absolute at the API data boundary.
- Do not merge profile tags and script tags into one visual bucket.
