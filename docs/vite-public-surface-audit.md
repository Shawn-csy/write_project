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
| `PublicTopBar.tsx` | `redirect/remove` | Used by `PublicGalleryPage` (retired in Batch 1), `PublicReaderPage`, `AuthorProfilePage`, `OrganizationPage`, and `PublicSeriesPage`. Imports `useNavigate`, `useI18n`, Vite UI components. Not used by editor. Delete in Batch 2 after those pages removed. |
| `PublicHeroMarquee.tsx` | `redirect/remove` | Duplicate of `packages/public-ui/src/gallery/PublicHeroMarquee.tsx`. Was used by `PublicGalleryPage` (deleted in Batch 1); verified unused after Batch 1 deletion. Delete in Batch 2. |
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

**Status: completed in commit `eeb77e9`.**

Deleted:

- `src/pages/PublicGalleryPage.tsx`
- `src/pages/PublicAboutPage.tsx`
- `src/pages/PublicHelpPage.tsx` + test
- `src/pages/PublicLicensePage.tsx`
- `src/pages/PublicImportFormatPage.tsx`
- `src/pages/PublicGalleryPage.usageRights.test.ts`
- `src/components/gallery/*` (all 11 files)
- `src/hooks/public/usePublicGalleryState.ts`
- `src/hooks/public/usePublicGalleryFiltering.ts` + test
- Gallery routes removed from `PublicRoutes.tsx`

Not in Batch 1 — these still have active consumers in Batch 2 routes:

- `src/hooks/public/usePublicTerms.ts` — still used by `PublicReaderPage`
- `src/components/public/PublicTopBar.tsx` — still used by `AuthorProfilePage`, `OrganizationPage`, `PublicSeriesPage`
- `src/components/public/PublicHeroMarquee.tsx` — verified unused after gallery deletion; delete in Batch 2

### Batch 2: Reader/author/org/series pages and all remaining public-only dependencies

Remove after QA criteria below are satisfied:

Pages:

- `src/pages/PublicReaderPage.tsx`
- `src/pages/PublicSeriesPage.tsx`
- `src/pages/AuthorProfilePage.tsx`
- `src/pages/OrganizationPage.tsx`

Hooks:

- `src/hooks/public/usePublicReaderScript.ts`
- `src/hooks/public/usePublicTerms.ts`

Components (no editor dependency confirmed):

- `src/components/public/TermsConsentDialog.tsx`
- `src/components/public/R18ConsentDialog.tsx`
- `src/components/public/PublicTopBar.tsx`
- `src/components/public/PublicHeroMarquee.tsx`

Routes:

- Remove `/read/:id`, `/author/:id`, `/org/:id`, `/series/:seriesName` from `PublicRoutes.tsx`

Do NOT remove `src/components/reader/*` — permanently used by editor preview in `ScriptMetadataDialog`.

---

## Batch 2 Deletion Criteria

Batch 2 files must NOT be deleted until all criteria below are verified against the Next.js production runtime (`next start` or production-like container — not Vite dev).

A route is considered ready when every item in its checklist is ticked. QA must be recorded (date + tester) before the deletion PR is opened.

---

### /read/[id] — `PublicReaderPage.tsx`

- [x] Script title, synopsis, cover image display correctly
- [x] Script body renders with correct marker/theme styling
- [x] Marker legend shows when `showMarkerLegend` is set (標記 10/10 menu verified)
- [x] Consent gate appears for restricted scripts; dismissing redirects to `/`
- [x] Related series section links navigate to `/series/[name]` on Next
- [x] Like / share / stats (views, duration) display correctly
- [x] Reader toolbar controls (theme, font size, focus mode) function
- [x] Open Graph / Twitter meta tags present in page source
- [x] Structured data (`application/ld+json`) present in page source
- [x] Desktop viewport ✓
- [x] Mobile viewport ✓
- [x] Light theme ✓
- [x] Dark theme ✓
- [ ] Vite editor preview (via `ScriptMetadataDialog`) unaffected — not yet verified in this session

---

### /author/[id] — `AuthorProfilePage.tsx`

- [x] Author name, avatar, bio, banner display correctly
- [x] Author's public scripts listed and cards are clickable → `/read/[id]`
- [x] Author's series listed and links navigate to `/series/[name]`
- [x] Org affiliation link navigates to `/org/[id]`
- [ ] Author tag filter navigates to `/?view=authors&authorTag=...` — not tested (no tag filter UI visible on this author)
- [x] Social/website links render and open correctly (icons visible in header)
- [x] 404/notFound behavior when author ID does not exist
- [x] Desktop viewport ✓
- [ ] Mobile viewport ✓ — not separately tested for author page
- [ ] Light theme ✓ — not separately tested for author page
- [ ] Dark theme ✓ — not separately tested for author page

---

### /org/[id] — `OrganizationPage.tsx`

- [x] Org name, logo, banner, description display correctly
- [ ] Org tags filter navigates to `/?view=orgs&orgTag=...` — not tested (no org tags on this org)
- [x] Public scripts tab: cards display and click to `/read/[id]`
- [x] Members tab: member cards display and click to `/author/[id]`
- [ ] Website link renders and opens correctly — not tested (no website set on this org)
- [x] 404/notFound behavior when org ID does not exist
- [x] Desktop viewport ✓
- [ ] Mobile viewport ✓ — not separately tested for org page
- [ ] Light theme ✓ — not separately tested for org page
- [ ] Dark theme ✓ — not separately tested for org page

---

### /series/[name] — `PublicSeriesPage.tsx`

- [x] Series name, summary, cover display correctly
- [x] Script cards listed in correct series order (#1 badge verified)
- [x] Script card click navigates to `/read/[id]`
- [x] "Back" behavior works (← 返回台本列表 → /)
- [x] 404/notFound when series name has no matching public scripts (Next `page.tsx` calls `notFound()` when `scripts.length === 0` — this covers both unknown series names and series with all scripts private; there is no separate empty-state render)
- [x] Desktop viewport ✓
- [ ] Mobile viewport ✓ — not separately tested for series page
- [ ] Light theme ✓ — not separately tested for series page
- [ ] Dark theme ✓ — not separately tested for series page

---

### Cross-route checks (all Batch 2 routes)

- [ ] No Vite public page links remain in Vite Sidebar or dashboard that would route to these paths inside the Vite SPA
- [x] All inbound links from Vite editor use `openPublicPath(...)` via `src/lib/publicNavigation.ts` — implemented this session; all `window.location.href` assignments in Sidebar, AuthorProfilePage, OrganizationPage, PublicSeriesPage, PublicReaderPage replaced
- [ ] nginx routes confirmed: `/read/`, `/author/`, `/org/`, `/series/` → Next container
- [ ] `TermsConsentDialog` and `R18ConsentDialog` removed with no broken imports
- [ ] `usePublicReaderScript.ts` and `usePublicTerms.ts` removed with no broken imports
- [ ] `npx tsc --noEmit` passes after deletion
- [ ] `npx vitest run` passes after deletion

---

### QA sign-off record

All rows must be filled before the Batch 2 deletion PR is opened. "Runtime URL" must be a production-like Next runtime (`next start` or container), not Vite dev or `next dev`.

| Route | Status | Date | Tester | Runtime URL | Evidence (screenshot / log / notes) |
|---|---|---|---|---|---|
| /read/[id] | 🟡 partial | 2026-06-15 | Claude QA | http://localhost:1090 | Cover/title/license/stats/like(1→2)/views(116→119)/consent gate/marker toggle(10/10)/閱讀設定(theme+font+size)/light+dark theme/mobile 375×812/OG+JSON-LD confirmed. **Pending:** Vite editor preview unaffected (not yet verified). |
| /author/[id] | 🟡 partial | 2026-06-15 | Claude QA | http://localhost:1090 | Banner/avatar/name/bio/social links/series section/3 script cards→/read/[id]/org link→/org/[id]/404 confirmed. **Pending:** author tag filter, mobile viewport, light/dark theme. |
| /org/[id] | 🟡 partial | 2026-06-15 | Claude QA | http://localhost:1090 | Banner/logo/name/description/member count/公開作品tab(3 cards→/read/)/成員tab(→/author/)/404 confirmed. **Pending:** org tag filter, website link, mobile viewport, light/dark theme. |
| /series/[name] | 🟡 partial | 2026-06-15 | Claude QA | http://localhost:1090 | Series cover/name/script cards(#1 badge→/read/)/author link/back→//404 confirmed. **Pending:** mobile viewport, light/dark theme. |

---

## Editor Preview Files — Do Not Touch

These remain permanently in `src/` as editor-owned surfaces:

- `src/components/reader/PublicReaderLayout.tsx` → rename candidate: `EditorReaderPreview.tsx`
- All files under `src/components/reader/` listed as `editor-preview` above
- `src/hooks/public/usePublicReaderLayoutState.ts`

The rename from `Public*` to `EditorReaderPreview*` / `ReaderPreview*` is recommended but not blocking for Batch 1 or 2.
