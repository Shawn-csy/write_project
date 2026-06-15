# Vite Public Surface Audit

Last updated: 2026-06-15
Phase: 2 (Public Surface Audit)

## Scope

Files scanned:
- `src/components/public/*`
- `src/components/gallery/*`
- `src/components/reader/*`
- `src/hooks/public/*`
- `src/pages/*Public* / AuthorProfilePage / OrganizationPage`
- `src/routes/PublicRoutes.tsx`

## Classification Key

| Label | Meaning |
|---|---|
| `shared-package` | Logic already in or should move to `packages/*` |
| `editor-preview` | Keep in Vite; rename/document as editor-only |
| `redirect/remove` | Route retired; replace with redirect to Next or delete |
| `deprecated-wrapper` | Thin re-export around shared package; delete after Next migration verified |

---

## src/components/public/

| File | Classification | Notes |
|---|---|---|
| `PublicTopBar.tsx` | `redirect/remove` | Used only by `PublicGalleryPage` and `PublicReaderPage` (both retired). Imports `useNavigate`, `useI18n`, Vite UI components. Not used by editor. Delete after pages removed. |
| `PublicHeroMarquee.tsx` | `redirect/remove` | Duplicate of `packages/public-ui/src/gallery/PublicHeroMarquee.tsx`. Used only by `PublicGalleryPage`. Delete after gallery page removed. |
| `TermsConsentDialog.tsx` | `redirect/remove` | Used only by `PublicGalleryPage` and `PublicReaderPage`. No editor dependency (confirmed). Delete in Batch 2 after reader page removed. |
| `R18ConsentDialog.tsx` | `redirect/remove` | Same as above. Delete in Batch 2. |

---

## src/components/gallery/

| File | Classification | Notes |
|---|---|---|
| `ScriptGalleryCard.tsx` | `redirect/remove` | Vite-local version. Canonical version is `packages/public-ui/src/ScriptGalleryCard.tsx`. Used only by `GalleryScriptsView`. Remove after gallery retired. |
| `GalleryScriptsView.tsx` | `redirect/remove` | Used only by `PublicGalleryPage`. Not an editor dependency. |
| `GalleryFilterBar.tsx` | `redirect/remove` | Used only by `PublicGalleryPage`. |
| `GalleryMobileFilterSheet.tsx` | `redirect/remove` | Used only by `PublicGalleryPage`. |
| `GalleryPeopleView.tsx` | `redirect/remove` | Used only by `PublicGalleryPage` (author/org tabs). |
| `AuthorGalleryCard.tsx` | `redirect/remove` | Used only by `GalleryPeopleView`. |
| `OrgGalleryCard.tsx` | `redirect/remove` | Used only by `GalleryPeopleView`. |
| `HorizontalScrollLane.tsx` | `redirect/remove` | Used only by `GalleryScriptsView`. |
| `views/AboutView.tsx` | `redirect/remove` | Rendered by `PublicGalleryPage` (`?view=about`). Next has `/about` route. |
| `views/HelpView.tsx` | `redirect/remove` | Rendered by `PublicGalleryPage` (`?view=help`). Next has `/help/*`. |
| `views/LicenseView.tsx` | `redirect/remove` | Rendered by `PublicGalleryPage` (`?view=license`). Next has `/license`. |

---

## src/components/reader/

| File | Classification | Notes |
|---|---|---|
| `PublicReaderLayout.tsx` | `editor-preview` | **Active editor dependency.** Used by `ScriptMetadataDialog` for in-dashboard reader preview. Must keep. Consider renaming to `EditorReaderPreview.tsx` to clarify intent. |
| `PublicScriptInfoOverlay.tsx` | `editor-preview` | Used by `PublicReaderLayout` → used in editor preview. Keep. |
| `PublicMarkerLegend.tsx` | `editor-preview` | Used by `PublicReaderLayout`. Keep. |
| `SimplifiedReaderHeader.tsx` | `editor-preview` | Used by `PublicReaderLayout`. Keep. |
| `ReaderActions.tsx` | `editor-preview` | Used by `PublicReaderLayout`. Keep. |
| `ReaderControls.tsx` | `editor-preview` | Used by `PublicReaderLayout`. Keep. |
| `ReaderAppearanceMenu.tsx` | `editor-preview` | Used by `SimplifiedReaderHeader`. Keep. |
| `ReaderTOC.tsx` | `editor-preview` | Used by `SimplifiedReaderHeader`. Keep. |
| `SceneSelect.tsx` | `editor-preview` | Used by reader controls. Keep. |
| `CharacterSelect.tsx` | `editor-preview` | Used by reader controls. Keep. |
| `ActivitySection.tsx` | `editor-preview` | Used by `PublicReaderLayout`. Keep. |
| `RelatedSeriesSection.tsx` | `editor-preview` | Used by `PublicReaderLayout`. Keep. |
| `ReadGuideOverlay.tsx` | `editor-preview` | Used by `PublicReaderLayout`. Keep. |
| `ControlsRow.tsx` | `editor-preview` | Used by reader. Keep. |
| `PublicReaderLayout.test.tsx` | `editor-preview` | Test for above. Keep. |
| `PublicScriptInfoOverlay.test.tsx` | `editor-preview` | Test for above. Keep. |

---

## src/hooks/public/

| File | Classification | Notes |
|---|---|---|
| `usePublicReaderLayoutState.ts` | `editor-preview` | Used by `PublicReaderLayout` → editor preview. Imports `useSettings`, `useI18n`, Vite contexts. Intentionally Vite-coupled — provides editor context to reader preview. Keep. |
| `usePublicGalleryState.ts` | `redirect/remove` | Used only by `PublicGalleryPage`. Imports `useNavigate`, `useSearchParams`, `useAuth`, Vite API client. No editor dependency. Delete with gallery page. |
| `usePublicGalleryFiltering.ts` | `shared-package` | Thin wrapper over `@write/public-ui` `useGalleryFilterModel`. Logic already canonical in package. This file adds only Vite-specific type mapping. Delete with gallery page; Next uses package directly. |
| `usePublicGalleryFiltering.test.ts` | `redirect/remove` | Tests for above hook. Delete with hook. |
| `usePublicReaderScript.ts` | `redirect/remove` | Used only by `PublicReaderPage` (retired). Fetches script via Vite API client. No editor dependency. Delete with reader page. |
| `usePublicTerms.ts` | `redirect/remove` | Used only by `usePublicGalleryState` and `PublicReaderPage`. No editor dependency. Delete with those consumers. |

---

## src/pages/

| File | Classification | Notes |
|---|---|---|
| `PublicGalleryPage.tsx` | `redirect/remove` | Route `/` now owned by Next. Vite route should redirect to Next or be removed entirely. Nginx already routes `/` → Next at port 1090. |
| `PublicReaderPage.tsx` | `redirect/remove` | Route `/read/:id` now owned by Next. Same as above — nginx routes `/read/` → Next. |
| `PublicSeriesPage.tsx` | `redirect/remove` | Route `/series/:seriesName` owned by Next. |
| `AuthorProfilePage.tsx` | `redirect/remove` | Route `/author/:id` owned by Next. |
| `OrganizationPage.tsx` | `redirect/remove` | Route `/org/:id` owned by Next. |
| `PublicAboutPage.tsx` | `redirect/remove` | Was `/about`; now redirect via `PublicRoutes.tsx` to `/?view=about`. Effectively dead code. Delete. |
| `PublicHelpPage.tsx` | `redirect/remove` | Was `/help`; now redirect. Dead code. Delete. |
| `PublicLicensePage.tsx` | `redirect/remove` | Was `/license`; now redirect. Dead code. Delete. |
| `PublicImportFormatPage.tsx` | `redirect/remove` | Was `/help/import-format`; now redirect. Dead code. Delete. |
| `PublicHelpPage.test.tsx` | `redirect/remove` | Tests for dead page. Delete with page. |
| `PublicGalleryPage.usageRights.test.ts` | `redirect/remove` | Tests for dead page. Delete with page. |

---

## src/routes/PublicRoutes.tsx

| Item | Classification | Notes |
|---|---|---|
| `/` → `PublicGalleryPage` | `redirect/remove` | Remove route; nginx already sends `/` to Next. If Vite SPA ever handles `/`, it would compete with Next. |
| `/read/:id` → `PublicReaderPage` | `redirect/remove` | Same; nginx routes to Next. |
| `/series/:seriesName` → `PublicSeriesPage` | `redirect/remove` | Same. |
| `/author/:id` → `AuthorProfilePage` | `redirect/remove` | Same. |
| `/org/:id` → `OrganizationPage` | `redirect/remove` | Same. |
| `/about` → Navigate `/?view=about` | already redirect | Fine as-is until Vite public routes deleted entirely. |
| `/license` → Navigate | already redirect | Fine as-is. |
| `/help` → Navigate | already redirect | Fine as-is. |
| `/privacy` → `PrivacyPolicyPage` | out of scope | Vite still owns this page (no Next equivalent yet). Keep. |
| `/terms` → `TermsOfServicePage` | out of scope | Same. Keep. |

---

## Summary Counts

| Classification | Count |
|---|---|
| `redirect/remove` | 38 |
| `editor-preview` | 16 |
| `shared-package` | 1 (`usePublicGalleryFiltering.ts`) |
| `deprecated-wrapper` | 0 |

---

## Recommended Removal Sequence

### Batch 1: Pages and their exclusive dependencies (safe, no editor impact)

Remove in one PR:

- `src/pages/PublicGalleryPage.tsx`
- `src/pages/PublicAboutPage.tsx`
- `src/pages/PublicHelpPage.tsx` + test
- `src/pages/PublicLicensePage.tsx`
- `src/pages/PublicImportFormatPage.tsx`
- `src/pages/PublicGalleryPage.usageRights.test.ts`
- `src/components/gallery/*` (all 11 files)
- `src/hooks/public/usePublicGalleryState.ts`
- `src/hooks/public/usePublicGalleryFiltering.ts` + test
- `src/hooks/public/usePublicTerms.ts`
- `src/components/public/PublicTopBar.tsx`
- `src/components/public/PublicHeroMarquee.tsx`
- Remove gallery routes from `PublicRoutes.tsx`

Prerequisite confirmed: `TermsConsentDialog` and `R18ConsentDialog` are used only by `PublicGalleryPage` and `PublicReaderPage` — no editor dependency.

### Batch 2: Reader page and its exclusive dependencies

Remove after confirming `/read/:id` is fully served by Next with parity:

- `src/pages/PublicReaderPage.tsx`
- `src/pages/PublicSeriesPage.tsx`
- `src/pages/AuthorProfilePage.tsx`
- `src/pages/OrganizationPage.tsx`
- `src/hooks/public/usePublicReaderScript.ts`
- Remove reader/author/org/series routes from `PublicRoutes.tsx`

Do NOT remove `src/components/reader/*` — still used by editor preview in `ScriptMetadataDialog`.

### Batch 2 also includes

- `src/components/public/TermsConsentDialog.tsx`
- `src/components/public/R18ConsentDialog.tsx`

Both confirmed to have no editor dependency — delete with reader page.

---

## Editor Preview Files — Do Not Touch

These remain permanently in `src/` as editor-owned surfaces:

- `src/components/reader/PublicReaderLayout.tsx` → rename candidate: `EditorReaderPreview.tsx`
- All files under `src/components/reader/` listed as `editor-preview` above
- `src/hooks/public/usePublicReaderLayoutState.ts`

The rename from `Public*` to `EditorReaderPreview*` / `ReaderPreview*` is recommended but not blocking for Batch 1 or 2.
