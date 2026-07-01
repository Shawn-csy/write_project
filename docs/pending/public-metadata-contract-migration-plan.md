# Public Metadata Contract Migration Plan

Last updated: 2026-06-23
Phase 1: ✅ Complete

## Purpose

This document defines the remaining work required to remove public-page runtime reads from legacy `customMetadata` system keys.

The previous public compatibility cleanup removed route-level and component-prop compatibility. The remaining compatibility is data-contract compatibility: public reader, gallery, SEO, and export flows still read system fields from `customMetadata` because the public API does not yet expose every value as canonical top-level fields.

This plan is backend-first. Frontend fallback removal must wait until the public API and stored data can supply the same information through explicit fields.

Related document:

- `docs/public-backward-compatibility-removal.md`

## Current Decision

Do not remove frontend `customMetadata` runtime reads yet.

Removing them before backend/API migration would silently drop live public data:

- author override display
- audience/rating labels
- license label and special terms
- synopsis/summary fallback
- export metadata rows
- gallery filtering/search text

The correct sequence is:

1. Define canonical public fields.
2. Add backend response normalization and tests.
3. Backfill stored data.
4. Switch frontend reads to canonical fields.
5. Remove legacy `customMetadata` reads from public runtime.

## Scope

In scope:

- Public script response contract.
- Public gallery projection.
- Public reader header/overlay.
- Public reader export metadata.
- SEO description and metadata generation.
- Backend migration/normalization for system keys currently stored in `customMetadata`.
- Public author identity cleanup as a separate backend/API track.

Out of scope:

- User-authored arbitrary custom fields. These may remain in `customMetadata`.
- Editor preview components that are not public routes.
- Normal empty/loading/error fallbacks.
- Parser-only creative metadata that intentionally remains free-form, such as role/background/performance/chapter details, unless a separate product decision promotes them to structured fields.

## Existing Canonical Fields

Some structured fields already exist on `models.Script` and `schemas.Script`.

| Field | Status | Notes |
|---|---|---|
| `licenseCommercial` | Exists | Public runtime still also checks legacy metadata in some paths |
| `licenseDerivative` | Exists | Same |
| `licenseNotify` | Exists | Same |
| `synopsis` | Exists | Public runtime still has `customMetadata` fallback |
| `outline` | Exists | Public runtime still has `customMetadata` fallback |
| `activityName` | Exists | Export/runtime paths still accept legacy metadata in shared package |
| `activityBannerUrl` | Exists | Not the main blocker for current public page reads |
| `activityContent` | Exists | Export/runtime paths still accept legacy metadata in shared package |
| `activityWorkUrl` | Exists | Same |
| `activityDemoLinks` | Exists as JSON string | Export/runtime paths still accept legacy metadata keys |
| `seriesId` / `seriesOrder` | Exists | Gallery still falls back to legacy series metadata |

## Missing Or Ambiguous Public Fields

These values are still primarily derived from `customMetadata` or require a clearer canonical model.

| Field | Needed Type | Current Legacy Sources | Purpose |
|---|---|---|---|
| `targetAudience` | `string | null` | `TargetAudience`, `觀眾取向`, audience-like tags | Reader header, export metadata, gallery facets |
| `contentRating` | `string | null` | `ContentRating`, `內容分級`, rating-like tags | Reader header, export metadata, age/rating display |
| `license` | `string | null` | `License`, `授權` | Human-readable license label |
| `licenseSpecialTerms` | `string[]` | `LicenseSpecialTerms` JSON/string, persona defaults | Reader overlay/export license details |
| `licenseTags` | `string[]` or derived-only | `LicenseTags`, derived from commercial/derivative/notify | Gallery license shortcuts |
| `authorDisplayMode` | enum-like string | `AuthorDisplayMode` | Controls persona/owner/override author display |
| `authorOverrideName` | `string | null` | `Author` | Display-only author override |
| `authorOverrideAvatarUrl` | `string | null` optional | Not consistently modeled | Optional if product needs avatar for override |

Recommended minimal additions:

```ts
targetAudience?: string | null;
contentRating?: string | null;
license?: string | null;
licenseSpecialTerms?: string[];
licenseTags?: string[];
authorDisplayMode?: "persona" | "owner" | "override" | "" | null;
authorOverrideName?: string | null;
```

`licenseTags` can be either persisted or response-derived. If response-derived, document that it is not client-editable and is computed from `licenseCommercial`, `licenseDerivative`, `licenseNotify`, plus any migrated legacy tags.

## Current Runtime Legacy Reads

| Area | File | Current behavior |
|---|---|---|
| Gallery enrichment | `packages/public-ui/src/gallery/filterModel.ts` | Reads author override, series fallback, license fallback, summary/outline fallback, license special terms/tags from `customMetadata` |
| Next gallery projection | `apps/public/lib/galleryProjection.ts` | Passes `customMetadata` through to gallery model |
| Reader overlay projection | `apps/public/lib/scriptProjection.ts` | Reads target audience, content rating, license, license special terms, preface metadata from `customMetadata` |
| Reader header model | `apps/public/lib/readWorkHeaderModel.ts` | Uses synopsis fallback from `customMetadata` |
| SEO description | `apps/public/lib/scriptDescription.ts` | Uses synopsis/summary/outline fallback from `customMetadata` |
| Export metadata | `packages/reader-export/src/exportMetadata.ts` | Reads title, author override, series, synopsis, audience/rating, license, activity/demo fields from `customMetadata` |
| Public export adapter | `apps/public/lib/publicReaderExportMetadata.ts` | Passes `customMetadata` to shared export metadata builder |

These reads are compatibility behavior because they keep old records working, but they are still required until canonical fields are available.

## Phase 0: Contract Freeze

Owner: product/backend/frontend together.

Deliverables:

- Confirm canonical field names and types.
- Decide whether each field is persisted, response-derived, or editor-only.
- Decide whether legacy metadata keys are removed from `customMetadata` after migration or preserved as inert historical data.
- Define precedence:
  - Existing top-level field wins.
  - Legacy `customMetadata` fills only when top-level field is empty.
  - Persona defaults fill only when both script top-level and script legacy data are empty.

Acceptance:

- This document is updated with final field names.
- Backend and frontend agree on a single public script response shape.

## Phase 1: Backend Response Normalization

Goal: expose canonical top-level fields without changing frontend behavior yet.

Implementation outline:

1. Add missing fields to backend schemas.
2. Add DB columns only for values that should be persisted.
3. Add a public normalization helper at the backend response boundary.
4. For each public script response:
   - read top-level DB field first;
   - fallback to legacy `customMetadata` only inside backend normalization;
   - emit canonical field in API response.
5. Keep `customMetadata` in response for now to avoid frontend breakage.

Candidate backend files:

- `server/models.py`
- `server/schemas.py`
- `server/routers/public.py`
- `server/routers/public_bundle.py`
- `server/crud_ops/scripts.py`
- `server/crud_ops/scripts_query.py`
- migration scripts under `server/`

Acceptance:

- `/api/public-scripts`
- `/api/public-scripts/{id}`
- `/api/public-bundle`

all include the canonical fields.

Tests:

- Add or update `server/tests/test_public_api.py`.
- Add or update `server/tests/test_public_bundle_api.py`.
- Add tests where only legacy `customMetadata` exists and response still includes canonical fields.
- Add tests where both top-level and legacy values exist and top-level wins.

## Phase 2: Data Backfill Migration

Goal: move system metadata from legacy `customMetadata` keys into canonical fields.

Migration rules:

- Never overwrite non-empty canonical fields by default.
- Record conflicts where top-level and legacy values differ.
- Preserve arbitrary custom fields.
- Remove or mark migrated system keys only after the team decides whether historical metadata should stay visible in raw DB.

Suggested key mapping:

| Legacy key | Canonical field |
|---|---|
| `TargetAudience`, `觀眾取向` | `targetAudience` |
| `ContentRating`, `內容分級` | `contentRating` |
| `License`, `授權` | `license` |
| `LicenseCommercial` | `licenseCommercial` |
| `LicenseDerivative` | `licenseDerivative` |
| `LicenseNotify` | `licenseNotify` |
| `LicenseSpecialTerms` | `licenseSpecialTerms` |
| `LicenseTags` | `licenseTags` |
| `AuthorDisplayMode` | `authorDisplayMode` |
| `Author` | `authorOverrideName` when `authorDisplayMode=override` |
| `Series` / `SeriesName` | resolve or report; prefer `seriesId` |
| `SeriesOrder`, `Episode` | `seriesOrder` |
| `Synopsis`, `Summary`, `Description`, `Notes`, `摘要` | `synopsis` |
| `Outline`, `大綱` | `outline` |
| `ActivityName`, `EventName` | `activityName` |
| `ActivityContent`, `EventContent` | `activityContent` |
| `ActivityWorkUrl`, `EventWorkLink` | `activityWorkUrl` |
| `ActivityDemoLinks`, `ActivityDemoUrl`, `EventDemoLinks`, `EventDemoLink` | `activityDemoLinks` |

Migration output:

- total scripts scanned
- scripts changed
- values backfilled by field
- conflicts skipped
- invalid JSON values repaired or skipped
- system keys left in `customMetadata`

Acceptance:

- Migration can run idempotently.
- Dry-run mode produces the same report shape as write mode.
- Rollback plan exists before production write mode.

## Phase 3: Frontend Switch To Canonical Fields

Goal: frontend runtime reads canonical fields first and stops relying on legacy system keys.

Steps:

1. Update `apps/public/lib/types.ts` with canonical fields.
2. Update `apps/public/lib/galleryProjection.ts` to pass canonical fields into gallery model.
3. Update `packages/public-ui/src/gallery/filterModel.ts`:
   - remove author override reads from `customMetadata`;
   - remove series fallback reads from `customMetadata`;
   - remove license/audience/rating fallback reads from `customMetadata`;
   - keep arbitrary `customMetadata` only if needed for custom display.
4. Update `apps/public/lib/scriptProjection.ts`:
   - read targetAudience/contentRating/license/licenseSpecialTerms from top-level fields;
   - keep preface free-form fields only if they are intentionally still `customMetadata`.
5. Update `apps/public/lib/readWorkHeaderModel.ts` and `apps/public/lib/scriptDescription.ts`:
   - remove synopsis/summary/outline fallbacks from `customMetadata` once backfill is complete.
6. Update `packages/reader-export/src/exportMetadata.ts`:
   - read system fields from source top-level fields only;
   - keep arbitrary custom field rows;
   - remove `customMetadata.Title` fallback if title is always canonical.
7. Update tests to assert canonical fields, not legacy fallbacks.

Acceptance:

- Public reader UI displays the same metadata before and after the frontend switch.
- Gallery filters/search produce the same results for migrated records.
- PDF/export metadata includes the same rows for migrated records.
- Legacy system keys no longer affect runtime rendering in public pages.

## Phase 4: Remove Legacy Runtime Reads

Goal: delete compatibility logic after a production soak period.

Removal targets:

- legacy key reads in `filterModel.ts`
- legacy key reads in `scriptProjection.ts`
- legacy key reads in `scriptDescription.ts`
- legacy key reads in `readWorkHeaderModel.ts`
- system-key fallbacks in `reader-export/src/exportMetadata.ts`
- tests that intentionally verify legacy fallback behavior

Keep:

- arbitrary custom fields display
- parser/preface fields that are explicitly not promoted to top-level fields
- migration scripts and reports for audit, if useful

Acceptance:

- `rg "meta\\.targetaudience|meta\\.contentrating|meta\\.licensespecialterms|meta\\.authordisplaymode|meta\\.seriesorder|meta\\.activitydemo|customMetadata.Title|legacy" apps/public packages/public-ui packages/reader-export` finds no public runtime legacy system-field reads, excluding migration tests/docs.

## Public Author Identity Track

This track is related but separate from metadata migration.

Current behavior:

- `server/routers/public.py` resolves `/api/public-personas/{id}` by trying Persona first, then User.
- This means `/author/:id` can represent either a Persona ID or a User ID.

Target:

- `/author/:id` should represent one canonical public author identity.
- Recommended target: Persona-only public author URLs.

Plan:

1. Measure or inspect existing user-id author URLs.
2. Ensure every public script that should have an author page has a Persona.
3. Create a User ID to Persona ID mapping or one-time redirect map if needed.
4. Update public API to stop falling back from Persona to User.
5. Update frontend tests to expect 404/redirect for old user IDs.

Blocked until:

- Product decides whether old user-id URLs get redirects or hard 404s.
- Backend can guarantee public scripts have canonical Persona identity when needed.

## Verification Matrix

| Surface | Before backend normalization | After backend normalization | After migration | After frontend cleanup |
|---|---|---|---|---|
| Public homepage gallery | No regression | Canonical fields present but unused | Same visible data | Uses canonical fields only |
| Public read page | No regression | Canonical fields present but unused | Same visible data | Uses canonical fields only |
| Public SEO | No regression | Canonical fields present | Same metadata | No legacy system-key reads |
| PDF/export metadata | No regression | Canonical fields available | Same rows | No legacy system-key fallbacks |
| Public bundle | No regression | Canonical fields included | Same data | No legacy system-key reads |
| Author pages | No regression | No change | Optional mapping ready | Persona-only or explicit redirect behavior |

## Rollout Strategy

Recommended deployment order:

1. Deploy backend response normalization with no frontend changes.
2. Verify canonical fields in production API responses.
3. Run migration dry-run and review report.
4. Run migration write mode during a low-risk window.
5. Deploy frontend switch to canonical fields.
6. Soak and compare public page snapshots.
7. Remove legacy runtime reads.
8. Remove or archive migration-only code after audit window.

Rollback:

- If frontend canonical-field switch loses data, rollback frontend only; backend normalization can remain.
- If migration writes bad data, restore from DB backup or run a targeted reverse migration using the migration report.
- Do not reintroduce client-side legacy reads as the first rollback unless production pages are broken and backend rollback is slower.

## Open Questions

- Should `license` be persisted as a user-editable label, derived from structured license fields, or both?
- ~~Should `licenseTags` be persisted or response-derived?~~ **Resolved**: `licenseTags` remains response-derived via `deriveSimpleLicenseTags()` from canonical `licenseCommercial`/`licenseDerivative`/`licenseNotify` fields. No DB column needed. Legacy `customMetadata.licensetags` free-form entries are dropped (not backfilled) — the structured derivation covers all supported tag values.
- ~~Should `targetAudience` and `contentRating` remain tags, become fields, or both during a transition period?~~ **Resolved**: Both are canonical DB columns (`targetAudience`, `contentRating`). No longer read from tags or customMetadata on the frontend.
- Should migrated system keys be removed from `customMetadata`, or preserved but ignored?
- Should author override remain a supported product feature after canonicalization?
- Should User ID author URLs return 301/308 to Persona URLs, or 404/410?

## Definition Of Done

- Public API returns all canonical metadata fields needed by public runtime.
- Existing public records are backfilled or normalized.
- Frontend public runtime no longer reads system metadata from `customMetadata`.
- `customMetadata` only represents arbitrary custom fields and intentionally free-form creative metadata.
- Public author URLs have one canonical identity model.
- Tests cover both migration behavior and final canonical behavior.
