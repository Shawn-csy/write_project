# Read Page Download Architecture

## Decision Summary

| Decision | Choice |
|---|---|
| Format | PDF only (print dialog). No `.txt` fallback. |
| Entry point | Reader toolbar only. Not in `ReadWorkHeader`. |
| Implementation source | Reuse Vite `scriptExportBasic.ts` / `scriptExportShared.ts` logic, extracted to a shared package. No second implementation in `apps/public`. |
| Rendered HTML source | Live DOM snapshot of `.script-renderer` via `pickRenderedRoot()`. Same mechanism as Vite. Works client-side in Next.js (same renderer package used). |
| New package | `packages/reader-export` — extracts the pure PDF/print logic from Vite's `src/lib/`. |

Related design: `docs/read-page-export-metadata-projection.md` defines how PDF
metadata rows must stay aligned with the visible public reader metadata model.

## Why PDF, not .txt

- Vite public reader already has PDF as the primary export.
- `.txt` is lossy (loses marker styling, inline formatting, layout).
- Print/PDF preserves the rendered output the reader sees.
- Keeps the public reader export model consistent between Vite and Next.js.

## Why toolbar, not ReadWorkHeader

- `ReadWorkHeader` is above the script body — export actions belong after the reader has seen the content.
- Toolbar is the canonical location for reader utility actions (font, markers, TOC, export).
- Avoids a second actions bar floating between the cover art and the script body.

## Implementation Status (2026-06-18)

Phases 1–4 are complete. Phase 5 browser QA exposed two blocking gaps:

- the PDF header still shows only part of the public metadata on real output;
- the script body still inherits reader/theme colors instead of rendering as a
  full light-theme print document.

Phase 6 is therefore not enough by itself. It has unit-level metadata projection
coverage, but the browser print output is not accepted until Phase 7 below is
complete.

| Phase | Status |
|---|---|
| 1 — Extract `packages/reader-export` | ✓ DONE |
| 2 — Rendered HTML snapshot confirmed | ✓ DONE |
| 3 — `usePublicExport` + `buildPdfHeaderHtml` | ✓ DONE |
| 4 — Toolbar wiring + ReadWorkHeader cleanup | ✓ DONE |
| 5 — Browser print preview QA | ✗ FAILED — gaps documented |
| 6 — Shared export metadata depth | ◐ PARTIAL — unit projection done; real print incomplete |
| 7 — Print output normalization | ◐ REQUIRED |

### What was built (Phases 1–4)

- `packages/reader-export` — `exportScriptAsPdf`, `buildPrintHtml`, `getRenderedSnapshot`, `getRenderedLines`, `pickRenderedRoot`, `formatStructuredMetadataValue`, full export metadata API.
- `apps/public/app/read/[id]/usePublicExport.ts` — rAF-polls `pickRenderedRoot()` for readiness; `pdfReady` flag disables button until DOM renderer present.
- `apps/public/app/read/[id]/usePublicReaderShare.ts` — share with `navigator.clipboard` + `window.prompt` fallback.
- `ReadWorkHeader` — standalone actions bar removed. Props: `{ onLike }` only.
- `ReaderToolbar` — `endSlot` with 分享 + PDF buttons; PDF disabled until `pdfReady`.
- `apps/public/package.json` + root `package.json` — `@write/reader-export: "*"` declared.
- Vite `src/lib/scriptExportBasic.ts` — re-exports `exportScriptAsPdf` from `@write/reader-export`.

### Phase 6 additions (2026-06-18)

- `packages/reader-export/src/exportMetadata.ts` — owns `buildExportMetadata`, `filterExportMetadata`, `buildExportMetadataHtml`, `buildExportMetadataDocsBlocks`, `buildExportMetadataRows`, `formatStructuredMetadataValue`, `EXPORT_METADATA_FIELD_ORDER`, related types. Covers: title, synopsis, org, author, date, series (order 0 safe), tags, audience, roleSetting (JSON decoded), situationInfo, arbitrary customFields, activity, demoLinks, contact, license, specialTerms.
- `packages/reader-export/src/customMetadata.ts` — pure helpers (`customMetadataEntriesToMeta`, `normalizeCustomMetadataEntries`).
- `src/lib/exportMetadata.ts` — reduced to re-export shim. Vite call sites unchanged.
- `apps/public/lib/publicReaderExportMetadata.ts` — `buildPublicReaderExportMetadata(script)` adapter; passes activityName, activityContent, activityDemoLinks from PublicScript top-level fields.
- `apps/public/app/read/[id]/usePublicExport.ts` — uses `buildPublicReaderExportMetadata` + `buildExportMetadataHtml`. No longer uses `ReadWorkHeaderModel` as PDF source.
- `apps/public/lib/pdfHeaderModel.ts` — deleted (replaced by shared model).

### Current browser QA findings (2026-06-18)

Observed real PDF/print output still does not meet the product contract:

```text
未命名劇本
組織：NEON VOICE 霓聲工作室
作者：海聶
系列：ＡＡＡ #0
觀眾：男性向・成人向
角色設定：ＣＣ：ㄇ
BackgroundInfo：asdasd
PerformanceInstruction：{"mode":"multi","items":[...]}
OpeningIntro：asdasd
ChapterSettings：{"mode":"chapter_multi","items":[...]}
...
```

Problems:

- incomplete metadata projection in real output;
- public preface fields are still leaking internal English keys;
- structured metadata JSON can still leak into output;
- title fallback can still resolve to `未命名劇本`;
- script body color/style still inherits the active reader theme.

These findings override any earlier "Phase 6 done" status.

---

## Phase 6 — Shared Export Metadata Depth ◐ PARTIAL

**Goal:** make the Next public reader PDF header as complete as the Vite export
metadata, while keeping one shared metadata/export contract.

Unit-level model work exists, but real browser output proved that the integration
is not complete yet.

### Problem

The current Next PDF header uses `ReadWorkHeaderModel`.

That model is correct for the visible work header, but it is not a complete
download/export metadata source. The visible header intentionally prioritizes
presentation. The PDF export header should preserve the author's configured
script information.

### Required metadata coverage

The PDF header should include, when public and available:

- title
- synopsis
- author/persona
- organization
- series name and order
- tags
- license rows
- contact rows
- target audience / content rating
- role setting / character setup
- situation / detailed settings
- activity/preface information
- demo links
- custom metadata fields
- special license terms

If any field is not safe for public export, it must be explicitly filtered by
the export metadata model. It must not disappear merely because a simplified
header model forgot to include it.

### Target architecture

```text
PublicScript
  ↓
@write/reader-export
  buildExportMetadata()
  filterExportMetadata()
  buildExportMetadataHtml()
  ↓
PDF header HTML
  ↓
exportScriptAsPdf(renderedHtml + headerHtml)
```

`ReadWorkHeaderModel` remains a UI model only.

It should not be the PDF export metadata source.

### Implementation plan

1. Move the export metadata model into `packages/reader-export`.

   Source to migrate:

   - `src/lib/exportMetadata.ts`

   Public exports:

   - `buildExportMetadata`
   - `filterExportMetadata`
   - `buildExportMetadataHtml`
   - `buildExportMetadataRows`
   - `buildExportMetadataDocsBlocks`
   - `EXPORT_METADATA_FIELD_ORDER`
   - related types

2. Keep Vite compatibility through a thin re-export.

   `src/lib/exportMetadata.ts` should re-export from `@write/reader-export`
   after migration, so existing Vite call sites do not fork.

3. Replace the Next app-local PDF header builder.

   `apps/public/lib/pdfHeaderModel.ts` should either be deleted or reduced to a
   thin adapter that calls shared `buildExportMetadataHtml`.

4. Add a Next public reader export adapter.

   Suggested responsibility:

   ```text
   buildPublicReaderExportMetadata(script: PublicScript)
     -> ExportMetadata
   ```

   This adapter may normalize Next `PublicScript` fields before passing them to
   shared `buildExportMetadata`, but it must not rebuild the HTML by hand.

5. Update `usePublicExport`.

   It should build `headerHtml` from shared export metadata, not from
   `ReadWorkHeaderModel`.

6. Add tests for metadata depth.

   Required tests:

   - role setting / character setup appears in PDF header
   - custom fields appear in PDF header
   - license rows appear
   - contact rows appear
   - series order appears, including order `0`
   - organization and persona are both handled
   - unsafe/private fields are not included unless explicitly marked public

### Definition of Done

- [x] `packages/reader-export` owns the export metadata model.
- [x] Vite imports remain compatible through re-export shims.
- [x] Next PDF header uses shared `buildExportMetadataHtml`.
- [x] `ReadWorkHeaderModel` is not used as the PDF metadata source.
- [x] Custom metadata, license, contact, series, tags covered by tests.
- [x] No duplicated metadata HTML builder remains in `apps/public`.
- [ ] Real PDF output includes the same public preface metadata as the visible
      reader overlay.
- [ ] Real PDF output contains no raw public metadata JSON.
- [ ] Real PDF output does not show internal English metadata keys for public
      preface fields.

---

## Phase 7 — Print Output Normalization ◐ REQUIRED

**Goal:** make the actual printed document deterministic and light-themed.

The current print/export path clones rendered DOM and computed inline styles.
That preserves marker styling, but it also preserves active theme colors. For
public PDF output this is wrong: the document must print as a light document,
regardless of reader theme.

Required behavior:

- `html`, `body`, `.script-renderer`, and all script text must render on a white
  background by default;
- default text color must be black or an explicit light-theme neutral;
- marker colors may be preserved only if they remain readable on white;
- dark-mode foreground/background variables must not leak into print output;
- inline `color`, `background`, and `background-color` copied from DOM must be
  normalized for print unless they represent an intentional marker style;
- metadata header and script body must use the same light print baseline.

Implementation direction:

1. Add a print sanitization step in `@write/reader-export`.
2. Sanitize cloned HTML before it enters `buildPrintHtml()`.
3. Strip or replace theme-derived dark colors from `.script-renderer` descendants.
4. Keep semantic inline styles such as bold/italic/underline and marker colors.
5. Add fixture tests with dark-theme inline styles to verify output is light.

Definition of Done:

- [ ] Dark-theme reader output prints with white background and dark text.
- [ ] Metadata header prints with white/light neutral colors.
- [ ] Marker styles remain readable.
- [ ] No `.dark`, `oklch(...)` dark theme variables, or dark background colors
      leak into final print HTML.
- [ ] Browser print preview confirms light output.

---

## Phase 5 — Browser Print Preview QA ✗ FAILED

**Goal:** verify PDF output in real browser conditions.

Prerequisite:

- Phase 6 and Phase 7 must be complete before final print preview QA can pass.

Required checks:
- PDF header includes title, cover image (when present), author/org.
- PDF header includes role settings / detailed settings / custom metadata when
  present.
- Script body renders with correct typography (no dark background in print).
- Series position visible in PDF header.
- Long script paginates without truncation.
- No-cover script: header shows title only.
- Mobile: PDF button accessible in toolbar, not disabled.

Definition of Done:
- [ ] Print preview verified for series + no-series scripts on prod (:1090).
- [ ] Metadata-rich script verified: role setting, details, custom fields, and
  license/contact rows appear in PDF header.
- [ ] No dark background bleed in print output.
- [ ] Cover image visible in PDF header when present.
- [ ] Toolbar PDF button accessible on mobile viewport.

---

## Anti-Patterns

Do not:
- Implement a second PDF renderer in `apps/public` from scratch.
- Use raw `script.content` (Fountain text) as PDF source — must use rendered HTML.
- Put download button in `ReadWorkHeader` — toolbar only.
- Add `.txt` export — not aligned with Vite public reader.
- Call `pickRenderedRoot()` during SSR — PDF export is client-only, gated by user click.
- Add Google Docs or XLSX export to public reader — out of scope.
- Use `ReadWorkHeaderModel` as the long-term PDF metadata source.
- Add metadata fields directly inside `apps/public/lib/pdfHeaderModel.ts` instead
  of moving the shared export metadata model into `@write/reader-export`.
