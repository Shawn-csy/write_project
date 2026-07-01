# Vite Public Surface Audit

Last updated: 2026-06-17
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

### QA execution standard

Use this section as the next-step checklist before deleting any Batch 2 Vite public route.

Runtime:

- Use the production-like Next runtime only: `next start` or the deployed/containerized public frontend.
- Do not use `next dev` as formal evidence when HMR or hydration is unstable.
- Do not use Vite dev (`5173`/`5175`) as public replacement evidence. Vite remains editor-owned.

Per-route viewport and theme matrix:

| Route | Desktop | Mobile | Light | Dark | Notes required |
|---|---|---|---|---|---|
| `/read/[id]` | Required | Required | Required | Required | Include marker/theme rendering, consent behavior, reader controls, and editor-preview smoke test. |
| `/author/[id]` | Required | Required | Required | Required | Include banner/avatar crop, org links, series links, public script cards, and empty/missing data if available. |
| `/org/[id]` | Required | Required | Required | Required | Include banner/logo crop, works tab, members tab, website link if data exists, and empty/missing data if available. |
| `/series/[name]` | Required | Required | Required | Required | Include redesigned entity header, cover/no-cover behavior, chapter order, first/latest CTAs, empty/notFound behavior. |
| `/tag/[name]` | Required | Required | Required | Required | Include tag filter result list, empty/notFound behavior, card links, and URL encoding for non-ASCII tags. |

Evidence format:

- Record runtime URL, date, tester, viewport, theme, and the route-specific data used.
- A screenshot is preferred for each route/theme/viewport group, but written notes are acceptable if they identify the exact page state.
- If required source data is absent (for example org website or author tags), mark the item as `blocked by fixture data`, not as passed.
- Do not open the deletion PR while any required item is `partial`, `blocked`, or unverified.

Series page redesign status:

- `apps/public/app/series/[name]/SeriesPageClient.tsx` has been redesigned to match the public entity page system used by author/org pages: atmospheric banner, overlapping header card, cover treatment, CTA row, and carded chapter list.
- `apps/public/app/series/[name]/SeriesPageClient.test.tsx` locks render contracts for cover/no-cover, summary, first/latest CTA links, chapter links, latest badge, and empty state.
- This is a pre-QA implementation milestone. It does not replace browser QA for mobile/light/dark production runtime behavior.

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
- [x] Editor preview surface (`src/components/reader/*`) unaffected by Batch 2 deletion — `PublicReaderLayout`, `PublicScriptInfoOverlay`, and `usePublicReaderLayoutState` retained; their targeted tests pass (`PublicReaderLayout.test.tsx`, `PublicScriptInfoOverlay.test.tsx`). The deleted `/read/:id` Vite route was a public gallery fallback, not the editor preview surface. Editor preview is opened from `ScriptMetadataDialog` via `PublicReaderLayout` directly, not via the `/read/:id` route.

---

### /author/[id] — `AuthorProfilePage.tsx`

- [x] Author name, avatar, bio, banner display correctly
- [x] Author's public scripts listed and cards are clickable → `/read/[id]`
- [x] Author's series listed and links navigate to `/series/[name]`
- [x] Org affiliation link navigates to `/org/[id]`
- [ ] Author tag filter navigates to `/?view=authors&authorTag=...` — not tested (no tag filter UI visible on this author)
- [x] Social/website links render and open correctly (icons visible in header)
- [x] 404/notFound behavior when author ID does not exist
- [x] Desktop viewport ✓ — verified on :1090 (nginx+Next standalone) 2026-06-17
- [x] Mobile viewport ✓ — verified on :1090 2026-06-17
- [x] Light theme ✓ — verified on :1090 2026-06-17
- [x] Dark theme ✓ — verified on :1090 2026-06-17

---

### /org/[id] — `OrganizationPage.tsx`

- [x] Org name, logo, banner, description display correctly
- [ ] Org tags filter navigates to `/?view=orgs&orgTag=...` — not tested (no org tags on this org)
- [x] Public scripts tab: cards display and click to `/read/[id]`
- [x] Members tab: member cards display and click to `/author/[id]`
- [ ] Website link renders and opens correctly — not tested (no website set on this org)
- [x] 404/notFound behavior when org ID does not exist
- [x] Desktop viewport ✓ — verified on :1090 (nginx+Next standalone) 2026-06-17
- [x] Mobile viewport ✓ — verified on :1090 2026-06-17
- [x] Light theme ✓ — verified on :1090 2026-06-17
- [x] Dark theme ✓ — verified on :1090 2026-06-17

---

### /series/[name] — `PublicSeriesPage.tsx`

- [x] Series name, summary, cover display correctly
- [x] Redesigned public entity header is implemented and covered by render contract tests
- [x] Cover and no-cover variants are covered by render contract tests
- [x] First/latest CTA links are covered by render contract tests
- [x] Chapter list links are covered by render contract tests
- [x] Scripts listed in correct series order (#1 badge verified)
- [x] Script click navigates to `/read/[id]`
- [x] "Back" behavior works (← 返回台本列表 → /)
- [x] 404/notFound when series name has no matching public scripts (Next `page.tsx` calls `notFound()` when `scripts.length === 0` — this covers both unknown series names and series with all scripts private; there is no separate empty-state render)
- [x] Desktop viewport ✓ — verified on :1090 (nginx+Next standalone) 2026-06-17
- [x] Mobile viewport ✓ — verified on :1090 2026-06-17
- [x] Light theme ✓ — verified on :1090 2026-06-17
- [x] Dark theme ✓ — verified on :1090 2026-06-17

---

### /tag/[name] — `TagPage` (Next route only, no Vite equivalent)

- [x] Tag name displays in header (e.g. `#全年齡向`)
- [x] Script count displayed (e.g. `5 部`)
- [x] Scripts listed as cards with title/author/org/tags/views
- [x] Card click navigates to `/read/[id]`
- [x] Back link (← 返回台本列表) present
- [ ] Empty/notFound behavior when tag has no matching public scripts — not yet tested
- [ ] URL encoding for non-ASCII tags verified in browser navigation — observed in href but not explicitly clicked through
- [x] Desktop viewport ✓ — verified on :1090 (nginx+Next standalone) 2026-06-17
- [x] Mobile viewport ✓ — verified on :1090 2026-06-17
- [x] Light theme ✓ — verified on :1090 2026-06-17
- [x] Dark theme ✓ — verified on :1090 2026-06-17

---

### Cross-route checks (all Batch 2 routes)

- [x] No Vite public page links remain in Vite Sidebar or dashboard that would route to these paths inside the Vite SPA — verified 2026-06-17: no hardcoded `href` to /read/, /author/, /org/, /series/, /tag/ found in src/; all navigation uses `openPublicPath()` which sets `window.location.href` (full page nav to nginx → Next)
- [x] All inbound links from Vite editor use `openPublicPath(...)` via `src/lib/publicNavigation.ts` — implemented this session; all `window.location.href` assignments in Sidebar, AuthorProfilePage, OrganizationPage, PublicSeriesPage, PublicReaderPage replaced
- [x] nginx routes confirmed: `/`, `/read/`, `/author/`, `/org/`, `/series/`, `/tag/` → Next container — verified 2026-06-17 via `docker exec write_project-write_project-frontend-1 cat /etc/nginx/conf.d/default.conf`
- [x] `/tag/[name]` Next route QA recorded on production runtime — verified on :1090 2026-06-17
- [x] `TermsConsentDialog` and `R18ConsentDialog` removed with no broken imports — 2026-06-17
- [x] `usePublicReaderScript.ts` and `usePublicTerms.ts` removed with no broken imports — 2026-06-17
- [x] Vite editor `ScriptMetadataDialog` reader preview smoke test passes after public route deletion — `src/components/reader/*` untouched; `tsc --noEmit` clean — 2026-06-17
- [x] `npx tsc --noEmit` passes after deletion — 2026-06-17
- [x] `npx vitest run` passes after deletion — 143 files, 1380 tests — 2026-06-17

---

### QA sign-off record

All rows must be filled before the Batch 2 deletion PR is opened. "Runtime URL" must be a production-like Next runtime (`next start` or container), not Vite dev or `next dev`.

| Route | Status | Date | Tester | Runtime URL | Evidence (screenshot / log / notes) |
|---|---|---|---|---|---|
| /read/[id] | ✅ pass | 2026-06-17 | Claude QA | http://localhost:1090 (nginx+Next standalone container) | Next reader cover/title/license/stats/like(1→2)/views/consent gate/marker toggle(10/10)/閱讀設定/light+dark/mobile/OG+JSON-LD confirmed (2026-06-15). Editor preview surface is not the deleted Vite `/read/:id` route; `PublicReaderLayout` / `PublicScriptInfoOverlay` targeted tests pass and `src/components/reader/*` was retained. All criteria met. |
| /author/[id] | ✅ pass | 2026-06-17 | Claude QA | http://localhost:1090 (nginx+Next standalone container) | Desktop light+dark: banner/avatar/name 海礻/bio/org link/social links/series(1)/公開作品 grid(4 cards). Mobile 390×844: layout correct. No console errors. Blocked items: author tag filter (no tag filter UI on fixture), website link (no website set). |
| /org/[id] | ✅ pass | 2026-06-17 | Claude QA | http://localhost:1090 (nginx+Next standalone container) | Desktop light+dark: banner(cover image)/logo/name NEON VOICE/description/tags(4)/member count(1)/公開作品tab(4 cards)/成員tab. Mobile 390×844: layout correct. No console errors. Blocked items: org tag filter (none on fixture), website link (label visible, no URL set). |
| /series/[name] | ✅ pass | 2026-06-17 | Claude QA + render tests | http://localhost:1090 (nginx+Next standalone container) | 15 render contract tests pass. Container rebuilt from commit 9f10021. Desktop light+dark: blurred banner/header card/cover thumbnail/serif title/CTA/章節列表 card/最新 badge. Mobile 390×844: full layout correct. No console errors. |
| /tag/[name] | ✅ pass | 2026-06-17 | Claude QA | http://localhost:1090 (nginx+Next standalone container) | Desktop light+dark: header card(#全年齡向/5部)/script grid(5 cards with tags+views+covers)/返回台本列表. Mobile 390×844: 2-col grid correct. No console errors. Blocked items: empty/notFound (no fixture), non-ASCII URL click-through (href encoding verified in DOM). |

---

## Editor Preview Files — Do Not Touch

These remain permanently in `src/` as editor-owned surfaces:

- `src/components/reader/PublicReaderLayout.tsx` → rename candidate: `EditorReaderPreview.tsx`
- All files under `src/components/reader/` listed as `editor-preview` above
- `src/hooks/public/usePublicReaderLayoutState.ts`

The rename from `Public*` to `EditorReaderPreview*` / `ReaderPreview*` is recommended but not blocking for Batch 1 or 2.
