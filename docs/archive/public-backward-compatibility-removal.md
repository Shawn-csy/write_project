# Public Backward Compatibility Removal Rationale

Last updated: 2026-06-23

## Purpose

公開站已經由 `apps/public` 的 Next.js runtime 接管首頁、閱讀頁、作者頁、組織頁、系列頁、標籤頁與靜態資訊頁。Vite SPA 應只保留工作區、編輯器與登入後操作介面。

目前公開頁面仍保留多個向後支援層：舊 Vite 公開 route、舊 `/gallery` redirect、舊資料欄位 projection、舊 component props，以及公開作者頁的 User fallback。這些相容層曾經用來降低遷移風險，但在 Next 公開站成為 canonical owner 後，繼續保留會讓公開站邊界變得模糊。

本文件說明為什麼需要移除這些向後支援，並定義移除範圍與驗證重點。

## Why Removal Is Necessary

### 1. Avoid split ownership of public routes

公開 route 必須只有一個 owner。若 Vite SPA 與 Next.js 同時保留公開頁實作，實際使用者看到的結果會取決於 nginx、dev server、測試環境或 fallback routing。

已確認的 split ownership：

- `apps/public/app/privacy/page.tsx` 與 Vite `src/pages/PrivacyPolicyPage.tsx` 曾同時存在。
- `apps/public/app/terms/page.tsx` 與 Vite `src/pages/TermsOfServicePage.tsx` 曾同時存在。
- `src/routes/PublicRoutes.tsx` 曾保留 Vite `/privacy`、`/terms` route，即使 nginx production 已 route 到 Next。

保留雙 owner 會造成 SEO metadata、內容版本、樣式與行為分歧。

### 2. Prevent stale SEO behavior from becoming contractual

`/gallery` 是舊 Vite public gallery URL。當它只靠 nginx redirect 到 `/` 時，這不是新的產品入口，而是為舊 URL 保留的相容行為。

如果測試繼續要求 `/gallery` 必須 redirect，這個 legacy URL 就會被升級成長期契約。公開站應改為只驗證 canonical public URLs：

- `/`
- `/read/:id`
- `/author/:id`
- `/org/:id`
- `/series/:name`
- `/tag/:name`
- `/about`
- `/help`
- `/license`
- `/privacy`
- `/terms`

`/gallery` 若不再是產品 URL，應從 nginx、SEO 驗證與文件中移除。

### 3. Reduce hidden data-shape dependencies

公開頁仍讀取大量 `customMetadata` legacy keys，例如：

- `Title`
- `Synopsis` / `Summary` / `Description` / `Notes`
- `Series` / `SeriesName` / `Episode`
- `LicenseCommercial` / `LicenseDerivative` / `LicenseNotify`
- `LicenseSpecialTerms`
- `ActivityDemoUrl`
- `EventDemoLink`

這讓新欄位即使已存在，公開頁仍可能被舊 metadata 覆寫或補值。結果是資料契約不清楚，難以判斷哪些欄位是正式 API，哪些只是歷史 import 殘留。

公開頁應優先依賴 typed top-level fields；legacy metadata adapter 若仍必要，應限制在 migration job 或後台資料修復工具，而不是 runtime reader/gallery path。

### 4. Remove compatibility code from shared UI packages

`@write/public-ui` 是公開 UI 的共享 package。它目前仍包含舊 props 或舊資料格式轉換：

- `ScriptGalleryCard` 的 `href` legacy compat。
- `CoverDesign.sub` deprecated field。
- `migrateLegacySub()` 將舊 `sub` 欄位轉成 `layers`。

共享 package 內的相容層會影響所有 public surfaces，並鼓勵新 call site 繼續使用舊 API。若要移除舊架構，這些轉接點也應一併清掉，讓型別直接反映正式契約。

### 5. Make public author identity unambiguous

`/api/public-personas/{persona_id}` 目前會先找 Persona，找不到再用 User fallback。這讓 `/author/:id` 同時可能代表 Persona ID 或 User ID。

公開作者頁應只接受 canonical public author identity。否則：

- URL 語義不穩定。
- author links 的來源難以追蹤。
- owner fallback 可能被誤認為可連結 persona。
- `override-author` / `header-author-fallback` sentinel 會繼續滲入公開 UI model。

如果舊 user-id author URL 還有流量，應用一次性 redirect/migration 解決，而不是在公開 API runtime 長期 fallback。

## Current Backward Compatibility Inventory

| Area | File | Compatibility Behavior | Recommendation |
|---|---|---|---|
| Vite public routes | `src/routes/PublicRoutes.tsx` | Vite still mounted public static pages | Remove; Next owns public static pages |
| Vite static pages | `src/pages/PrivacyPolicyPage.tsx`, `src/pages/TermsOfServicePage.tsx` | Duplicate Next pages | Remove |
| Legacy URL | `nginx.conf` | `/gallery` redirects to `/` | Remove if `/gallery` is retired |
| SEO verification | `scripts/verify-public-seo.mjs` | Requires `/gallery` redirect | Update to stop asserting retired URL |
| Gallery card API | `packages/public-ui/src/ScriptGalleryCard.tsx` | `href` legacy prop | Remove legacy prop after call sites use `scriptHref` |
| Cover design | `packages/public-ui/src/cover/types.ts` | Deprecated `sub` field | Remove after migrating stored cover designs to `layers` |
| Cover rendering | `packages/public-ui/src/cover/CoverRenderer.tsx` | `migrateLegacySub()` runtime adapter | Remove with deprecated `sub` |
| Public metadata projection | `apps/public/lib/*`, `packages/public-ui/src/gallery/filterModel.ts`, `packages/reader-export/src/exportMetadata.ts` | Reads legacy `customMetadata` keys | Move to migration/normalization boundary, remove from runtime public pages |
| Public author API | `server/routers/public.py` | Persona lookup falls back to User | Remove after URL/data migration |
| Non-link author sentinels | `apps/public/lib/readWorkHeaderModel.ts`, `packages/public-ui/src/reader/PublicScriptInfoOverlay.tsx` | `override-author`, `header-author-fallback` special ids | Replace with explicit non-link author model |

## Removal Principles

- Remove compatibility at the runtime boundary, not only from UI components.
- Do not replace legacy behavior with silent fallback under a different name.
- Keep editor preview code only if it is editor-owned and not reachable as a public route.
- Prefer one-time data migration for old records over permanent runtime adapters.
- Update tests so they assert canonical behavior, not legacy support.
- Update docs and SEO verification at the same time as route behavior changes.

## Suggested Removal Sequence

### Phase 1: Public route ownership

- Remove Vite public routes and duplicate Vite static pages.
- Remove `/gallery` redirect if product no longer supports it.
- Update `scripts/verify-public-seo.mjs` to stop asserting `/gallery`.
- Confirm nginx routes all canonical public pages to Next.

### Phase 2: Shared UI API cleanup

- Replace all `ScriptGalleryCard href` call sites with `scriptHref`.
- Remove `href` from `ScriptGalleryCardProps`.
- Migrate stored `coverDesign.sub` data to `coverDesign.layers`.
- Remove `CoverDesign.sub` and `migrateLegacySub()`.

### Phase 3: Metadata contract cleanup

- Define canonical top-level public fields for title, synopsis, outline, series, license, audience, rating, activity and demo links.
- Move legacy `customMetadata` extraction into an import/data migration step.
- Remove legacy key reads from Next public reader, gallery, SEO and export metadata runtime paths.
- Keep arbitrary custom fields only as explicitly user-authored extra metadata, not as fallback for system fields.

### Phase 4: Public author identity cleanup

- Decide canonical author URL identity: Persona-only is the current clean target.
- Migrate or redirect old user-id author URLs if analytics shows meaningful traffic.
- Remove User fallback from `/api/public-personas/{id}`.
- Replace sentinel author ids with explicit fields such as `author.isClickable`.

## Acceptance Criteria

- No Vite route serves a public page that has a Next route equivalent.
- `/gallery` is absent from sitemap, nginx public routing, and SEO verification if retired.
- Public page metadata is generated from canonical Next data paths only.
- Runtime public reader/gallery code does not interpret legacy system fields from `customMetadata`.
- Shared public UI types do not expose deprecated props or data shapes.
- Public author URLs resolve through one canonical identity model.
- Tests cover canonical behavior and do not require legacy redirects or fallback data.

## Risks And Mitigations

| Risk | Mitigation |
|---|---|
| Old public links break | Check analytics before removing route redirects; if needed, use a short-lived redirect with an explicit removal date |
| Old records lose metadata display | Run a data migration from `customMetadata` system keys into top-level fields before removing runtime reads |
| Existing cover designs lose subtitle text | Migrate `coverDesign.sub` into `coverDesign.layers` before removing renderer adapter |
| Author pages with user ids 404 | Build a mapping from User-owned public scripts to Persona records, or publish a one-time redirect map |
| Tests fail because they assert legacy behavior | Update tests in the same phase as route/API cleanup |

## Non-Goals

- Removing editor preview components under `src/components/reader/*`; those are Vite workspace/editor concerns, not public route ownership.
- Removing normal empty/loading/error states such as missing banner rendering no hero, no-cover placeholders, or SEO text fallback from content.
- Removing `src/lib/publicNavigation.ts`; that file is a Vite-to-Next handoff helper for workspace actions, not a public page compatibility route.
