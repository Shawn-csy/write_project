# Read Page Export Metadata Projection

Last updated: 2026-06-22

## Problem

The public read page and the PDF export historically projected script metadata
through different paths.

The visible read page uses `PublicScriptInfoOverlay` through app-level projection
logic. That path understands public reader preface fields such as:

- `RoleSetting`
- `BackgroundInfo` / `EnvironmentInfo`
- `PerformanceInstruction`
- `OpeningIntro`
- `ChapterSettings`

The PDF export uses `@write/reader-export/buildExportMetadata()` through the
Next adapter `buildPublicReaderPrintSnapshot()`.

That model is now shared between Vite and Next and is tested with a
metadata-rich public script fixture. The historical failure mode was that PDF
output could show raw implementation keys and JSON payloads:

```text
BackgroundInfo：asdasd
PerformanceInstruction：{"mode":"multi","items":[...]}
ChapterSettings：{"mode":"chapter_multi","items":[...]}
```

This is not acceptable as a long-term design. Export output must represent the
same public-facing metadata the reader sees on screen.

## Current QA Status

Model and snapshot-level output is now accepted. Real browser print/PDF output
still requires a final print-preview QA pass.

The failing output below is the 2026-06-18 QA baseline, not the current expected
output:

```text
未命名劇本
組織：NEON VOICE 霓聲工作室
作者：海聶
系列：ＡＡＡ #0
觀眾：男性向・成人向
角色設定：ＣＣ：ㄇ
BackgroundInfo：asdasd
PerformanceInstruction：{"mode":"multi","items":[{"name":"ＣＣ","text":"asdasd"}]}
OpeningIntro：asdasd
ChapterSettings：{"mode":"chapter_multi","items":[...]}
```

Current tests assert that these raw keys/JSON/title fallback failures do not
appear in the generated print snapshot. The final acceptance standard remains
the actual print output, not only `buildExportMetadata()` rows.

## Principle

There must be one public metadata presentation model.

Screen rendering and PDF export may use different renderers, but they should not
independently interpret script metadata.

```text
PublicScript / customMetadata
  ↓
public metadata presentation model
  ↓
screen overlay
PDF export header
future share/AI-readable surfaces
```

Do not fix this by adding isolated `if (meta.performanceinstruction)` branches in
the export code. That keeps the drift alive.

## Target Output

Given metadata such as:

```text
Title: AAA
RoleSetting: {"mode":"multi","items":[{"name":"CC","text":"m"}]}
BackgroundInfo: asdasd
PerformanceInstruction: {"mode":"multi","items":[{"name":"CC","text":"asdasd"}]}
OpeningIntro: asdasd
ChapterSettings: {"mode":"chapter_multi","items":[{"chapter":"asdasd","environment":"asd","situation":"asd"}]}
```

PDF metadata rows should be public-facing:

```text
AAA
角色設定：CC：m
背景資訊：asdasd
演繹指示：CC：asdasd
作品的開頭引言：asdasd
章節：asdasd（環境：asd；狀況：asd）
```

They should not expose internal English keys or raw JSON.

## Ownership

| Layer | Responsibility |
|---|---|
| `apps/public` | Next route data loading, adapter from `PublicScript` to shared model input |
| `@write/reader-export` | Export rendering, PDF/print HTML, export metadata rows |
| `@write/reader-export/publicMetadataProjection` | Key aliases, labels, structured JSON formatting, reserved-field filtering |
| `PublicScriptInfoOverlay` | Screen rendering only |

The helper currently lives in `packages/reader-export/src/publicMetadataProjection.ts`.
Both export metadata and the Next public overlay projection use it, so screen and
PDF cannot drift on preface aliases, structured JSON formatting, or reserved
custom-field filtering.

## Current Implementation

The current integration point is:

```text
PublicScript + rendered .script-renderer HTML
  ↓
apps/public/lib/publicReaderPrintSnapshot.ts
  buildPublicReaderPrintSnapshot()
  ↓
@write/reader-export
  buildExportMetadata()
  buildExportMetadataHtml()
  getRenderedSnapshot()
  buildPrintHtml()
  ↓
{ metadata, headerHtml, bodyHtml, printHtml }
```

`buildPublicReaderPrintSnapshot()` is intentionally route-adapter code: it knows
the `PublicScript` shape, but it does not rebuild metadata rows or print HTML by
hand.

## Metadata Rules

### Title

Title fallback order:

1. `source.title`
2. `customMetadata.Title`
3. route fallback title
4. `"Script"`

The PDF must not show `未命名劇本` when a valid custom metadata title exists.

### Preface Fields

| Canonical row | Accepted keys |
|---|---|
| `大綱` | `Outline`, `大綱` |
| `角色設定` | `RoleSetting`, `角色設定` |
| `背景資訊` | `BackgroundInfo`, `EnvironmentInfo`, `背景資訊` |
| `演繹指示` | `PerformanceInstruction`, `演繹指示` |
| `作品的開頭引言` | `OpeningIntro`, `作品的開頭引言` |
| `章節` | `ChapterSettings`, `章節` |
| `狀況` | `SituationInfo`, `狀況`, `狀況資訊`, `情境` |

These keys are system preface keys. They must not also appear as generic custom
fields.

### Structured JSON Values

`mode: "multi"` should render as:

```text
name：text / name：text
```

Example:

```json
{"mode":"multi","items":[{"name":"CC","text":"asdasd"}]}
```

renders:

```text
CC：asdasd
```

`mode: "chapter_multi"` should render as:

```text
chapter（環境：environment；狀況：situation）
```

Example:

```json
{"mode":"chapter_multi","items":[{"chapter":"asdasd","environment":"asd","situation":"asd"}]}
```

renders:

```text
asdasd（環境：asd；狀況：asd）
```

Plain strings remain unchanged. Invalid JSON remains unchanged and must not crash
export.

### Audience / Rating

Audience and rating sources should match the overlay projection:

1. top-level source fields
2. `TargetAudience` / `ContentRating` custom metadata
3. tag-derived values

Audience/rating tags must not duplicate into the regular `標籤` row.

### Activity / Demo Links

Activity and demo link metadata should use dedicated rows:

- `活動`
- `活動說明`
- `試聽範例`

Legacy keys that are marked reserved must either be rendered through dedicated
rows or explicitly documented as intentionally private. They must not be silently
filtered away.

## Implementation Plan and Status

### Phase 1 — Shared Presentation Helpers ✓ DONE

Create pure helpers:

- `normalizePublicMetadataKey(key)`
- `formatStructuredMetadataValue(value)`
- `buildPublicPrefaceItems(meta)`
- `isPublicMetadataSystemKey(key)`
- `readPublicPrefaceValue(meta, fieldKey, sourceValue)`

Implemented in `packages/reader-export/src/publicMetadataProjection.ts`. It does
not depend on DOM, React, Next.js, or Vite.

### Phase 2 — Export Metadata Uses Presentation Helpers ✓ DONE

Update `buildExportMetadata()` to:

- use the title fallback chain;
- render preface fields with public labels;
- format `multi` and `chapter_multi` JSON;
- remove preface keys from generic custom field rows;
- keep current license/contact/activity/demo rows.

### Phase 3 — App Adapter Integration ✓ DONE

Update `apps/public/lib/publicReaderExportMetadata.ts` tests using a realistic
`PublicScript` fixture that includes:

- missing top-level title with `customMetadata.Title`;
- `RoleSetting`;
- `BackgroundInfo`;
- `PerformanceInstruction`;
- `OpeningIntro`;
- `ChapterSettings`;
- contact fields;
- license rows;
- audience/rating tags.

The fixture should assert exact output rows, not only partial containment.

### Phase 4 — Overlay Projection Convergence ✓ DONE

Duplicated preface rules were removed from `apps/public/lib/scriptProjection.ts`.
The overlay projection now imports the same helper used by PDF export:

- `buildPublicPrefaceItems()`
- `normalizePublicMetadataKey()`
- `isPublicMetadataSystemKey()`

Overlay tests cover `multi`, `chapter_multi`, `EnvironmentInfo`, and
`SituationInfo`, so the visible reader header and PDF export share alias and
formatter semantics.

### Phase 5 — Browser PDF QA ◐ PENDING

Use a metadata-rich script and verify print preview output:

- no raw JSON visible;
- no English implementation keys for public preface fields;
- title is correct;
- role/performance/chapter settings are readable;
- output matches visible public metadata semantics.

### Phase 6 — Light Print Theme Contract ✓ DONE (model/snapshot)

The export must not preserve the active reader theme as the print theme.

Implemented at the generated HTML/snapshot level:

- metadata header uses light theme colors;
- script body uses white background and black/light-neutral foreground;
- dark reader background and foreground colors are removed or converted;
- marker styling is preserved only when readable on white;
- final print HTML is deterministic regardless of the current app theme.

This belongs in `@write/reader-export`, not route-local Next code.

## Tests

Required tests:

- `customMetadata.Title` becomes export title when top-level title is missing.
- `RoleSetting` JSON renders as `角色設定：角色：內容`.
- `PerformanceInstruction` JSON renders as `演繹指示：角色：內容`.
- `ChapterSettings` JSON renders as `章節：章節名（環境：...；狀況：...）`.
- `BackgroundInfo` renders as `背景資訊`, not `BackgroundInfo`.
- `OpeningIntro` renders as `作品的開頭引言`, not `OpeningIntro`.
- Preface keys do not appear as `customField`.
- Invalid JSON does not crash and remains readable.
- Audience/rating do not duplicate into normal tags.

## Anti-Patterns

Do not:

- add one-off row builders for each new key in `buildExportMetadata()`;
- let PDF export use `ReadWorkHeaderModel`;
- let screen overlay and PDF export keep separate key alias tables;
- expose raw metadata JSON to readers;
- silently filter reserved keys without dedicated output or explicit privacy
  rationale.

## Definition of Done

- [x] PDF output uses public labels for all preface fields.
- [x] PDF output never exposes raw `multi` / `chapter_multi` JSON.
- [x] Export metadata title fallback includes `customMetadata.Title`.
- [x] Screen overlay and PDF export share key alias/formatter helpers.
- [x] Metadata-rich fixture test locks the complete row output.
- [x] Generated print snapshot includes complete metadata, not only partial rows.
- [x] Generated print snapshot does not leak raw English public metadata keys or JSON.
- [x] Generated print HTML is light-themed regardless of active reader theme.
- [ ] Actual browser print output includes complete metadata, not only partial
      rows. (Phase 5 browser QA)
- [ ] Actual browser print output does not leak raw English public metadata keys
      or JSON. (Phase 5 browser QA)
- [ ] Browser print preview is fully light-themed regardless of active reader
      theme. (Phase 5 browser QA)
