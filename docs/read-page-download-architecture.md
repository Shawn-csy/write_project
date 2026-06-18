# Read Page Download Architecture

## Decision Summary

| Decision | Choice |
|---|---|
| Format | PDF only (print dialog). No `.txt` fallback. |
| Entry point | Reader toolbar only. Not in `ReadWorkHeader`. |
| Implementation source | Reuse Vite `scriptExportBasic.ts` / `scriptExportShared.ts` logic, extracted to a shared package. No second implementation in `apps/public`. |
| Rendered HTML source | Live DOM snapshot of `.script-renderer` via `pickRenderedRoot()`. Same mechanism as Vite. Works client-side in Next.js (same renderer package used). |
| New package | `packages/reader-export` — extracts the pure PDF/print logic from Vite's `src/lib/`. |

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

Phases 1–4 complete. Phase 5 (print preview QA) pending.

| Phase | Status |
|---|---|
| 1 — Extract `packages/reader-export` | ✓ DONE |
| 2 — Rendered HTML snapshot confirmed | ✓ DONE |
| 3 — `usePublicExport` + `buildPdfHeaderHtml` | ✓ DONE |
| 4 — Toolbar wiring + ReadWorkHeader cleanup | ✓ DONE |
| 5 — Browser print preview QA | ◐ PENDING |

### What was built

- `packages/reader-export` — `exportScriptAsPdf`, `buildPrintHtml`, `getRenderedSnapshot`, `getRenderedLines`, `pickRenderedRoot`. 10 unit tests.
- `apps/public/lib/pdfHeaderModel.ts` — `buildPdfHeaderHtml(model)` pure fn. 7 unit tests.
- `apps/public/app/read/[id]/usePublicExport.ts` — polls `pickRenderedRoot()` for readiness; `pdfReady` flag disables button until DOM renderer present.
- `apps/public/app/read/[id]/usePublicReaderShare.ts` — share with `navigator.clipboard` + `window.prompt` fallback.
- `ReadWorkHeader` — standalone actions bar removed. Props: `{ onLike }` only.
- `ReaderToolbar` — `endSlot` with 分享 + PDF buttons; PDF disabled until `pdfReady`.
- `apps/public/package.json` + root `package.json` — `@write/reader-export: "*"` declared.
- Vite `src/lib/scriptExportBasic.ts` — re-exports `exportScriptAsPdf` from `@write/reader-export`.

---

## Phase 5 — Browser Print Preview QA ◐ PENDING

**Goal:** verify PDF output in real browser conditions.

Required checks:
- PDF header includes title, cover image (when present), author/org.
- Script body renders with correct typography (no dark background in print).
- Series position visible in PDF header.
- Long script paginates without truncation.
- No-cover script: header shows title only.
- Mobile: PDF button accessible in toolbar, not disabled.

Definition of Done:
- [ ] Print preview verified for series + no-series scripts on prod (:1090).
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
