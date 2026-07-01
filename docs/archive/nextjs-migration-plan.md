# Next.js Public Frontend Migration Plan

> **Status: COMPLETE** — All Phases 1–7 implemented and verified. Vite Batch 2 public surface deleted 2026-06-17. This document is retained as implementation record; it is no longer a planning doc.

## Overview

Split the current monolithic Vite SPA into two independent frontends:

- **`apps/public`** — Next.js App Router, SSR/ISR, all public-facing pages
- **`apps/workspace`** — existing Vite SPA, unchanged, all auth-gated editor/dashboard pages
- **`packages/script-engine`** — shared parser/document/render core; canonical implementation used by both apps

The Python FastAPI backend remains unchanged.

---

## Motivation

| Problem | Current | After Migration |
|---|---|---|
| Google bot sees empty HTML | Only meta tags injected by backend | Full SSR HTML |
| AI crawlers (Perplexity, GPT) | Invisible | Fully readable |
| Core Web Vitals / LCP | SPA JS waterfall | SSR HTML first |
| Long-tail SEO (script titles, author names) | Indexed slowly | Indexed immediately |
| Marker theme inconsistency | Editor and public reader parse independently | Single canonical engine |

---

## Architecture

```
open-scripts.shawnup.com
        |
     Nginx
        |
   _____|_______________________
  |                             |
  | /dashboard, /edit/*, /studio, /admin
  |                             |
  apps/workspace            apps/public
  (Vite SPA, port 1090)    (Next.js, port 3000)
        |                       |
        |____________________   |
                            |   |
                    packages/script-engine
                    (shared parser core, pure TS)
                            |
                      apps/backend
                   (FastAPI, port 1091)
```

### Nginx routing rules

```nginx
location ~ ^/(dashboard|edit|studio|admin) {
    proxy_pass http://workspace:1090;
}
location / {
    proxy_pass http://public:3000;
}
location /api/ { proxy_pass http://backend:1091; }
location /media/ { proxy_pass http://backend:1091; }
location /sitemap.xml { proxy_pass http://backend:1091; }
```

---

## Core Principle: script-engine as Platform Core

The marker theme system is the product's core format. Any divergence between the editor preview and the public reader is a product defect. The only safe resolution is a single canonical implementation.

**`packages/script-engine`** is that implementation. Both apps import it. Neither app owns or duplicates parser logic.

### Engine contract

- No React dependency
- No Vite / Next.js dependency
- No DOM / localStorage
- No i18n context
- Only: text + marker theme → structured document / render model

---

## packages/script-engine Architecture

```
packages/script-engine/
  src/
    marker-theme/
      normalize.ts        ← normalizeMarkerConfigsSchema, normalizeThemeConfigs
      validate.ts         ← validateMarkerConfigs
      resolve.ts          ← resolveMarkerConfigs (embedded → public list → default)
      defaultRules.ts     ← DEFAULT_MARKER_RULES, getDefaultMarkerConfigs
    parser/
      parseScreenplay.ts  ← top-level parse fn (splitTitle + build + lineOffset)
      directASTBuilder.ts ← DirectASTBuilder class
      inlineParser.ts     ← parseInline (pure regex scan, no Parsimmon)
      parserGenerators.ts ← buildFlexiblePattern, helper fns
      titlePageParser.ts  ← splitTitleAndBody, extractTitleEntries
    document/
      astTypes.ts         ← MarkerConfig, AstNode, InlineToken types
      scriptDocument.ts   ← ScriptDocument type + builder
      toc.ts              ← extractToc
      markerUsage.ts      ← extractMarkersUsed
    render/
      renderTokens.ts     ← AstNode[] + markerConfigs → RenderToken[]
      styleResolver.ts    ← block/inline/range style resolution
      htmlSerializer.ts   ← RenderToken[] → plain HTML string (for SSR / OG)
    fixtures/             ← parity test fixtures
    index.ts              ← public exports
```

### Parsimmon replacement

The current Vite `inlineParser.ts` + `parserGenerators.ts` depend on Parsimmon. The engine replaces this with a pure regex left-to-right scan that is semantically equivalent:
- `P.alt(...).many()` → priority-sorted pattern loop with left-to-right position cursor
- `P.noneOf(...).atLeast(1)` → accumulate unmatched chars as text tokens
- `buildFlexibleTokenPattern` → halfwidth/fullwidth character class expansion (pure string ops)

This makes the engine work in any JS environment including Node.js/SSR with no extra dependencies.

### Public exports (index.ts)

```ts
// marker-theme
export { normalizeMarkerConfigsSchema, normalizeThemeConfigs } from "./marker-theme/normalize";
export { resolveMarkerConfigs } from "./marker-theme/resolve";
export { getDefaultMarkerConfigs } from "./marker-theme/defaultRules";

// parser
export { parseScreenplay } from "./parser/parseScreenplay";
export { DirectASTBuilder } from "./parser/directASTBuilder";
export { parseInline } from "./parser/inlineParser";

// document
export type { MarkerConfig, AstNode, InlineToken, ScriptDocument } from "./document/astTypes";
export { extractToc } from "./document/toc";

// render
export type { RenderToken } from "./render/renderTokens";
export { toRenderTokens } from "./render/renderTokens";
```

---

## Integration Strategy

### tsconfig path alias (no npm workspaces required)

Both apps import the engine via tsconfig path alias pointing directly to source. No build step needed for the engine itself.

**Vite (`tsconfig.json`)**:
```json
"paths": {
  "@/*": ["./src/*"],
  "@script-engine/*": ["../../packages/script-engine/src/*"]
}
```

**Next.js (`apps/public/tsconfig.json`)**:
```json
"paths": {
  "@/*": ["./*"],
  "@script-engine/*": ["../../packages/script-engine/src/*"]
}
```

**Vite `vite.config.ts`** needs matching alias:
```ts
resolve: {
  alias: {
    "@": path.resolve(__dirname, "src"),
    "@script-engine": path.resolve(__dirname, "../../packages/script-engine/src"),
  }
}
```

### Vite facade (no breaking changes to existing code)

`src/lib/screenplayAST.ts` keeps its current public API. Internal implementation delegates to engine:

```ts
// src/lib/screenplayAST.ts — thin facade, public API unchanged
import { parseScreenplay as _parse } from "@script-engine/parser/parseScreenplay";
export const parseScreenplay = (text = "", markerConfigs?: unknown) => _parse(text, markerConfigs);
```

All existing Vite components (`ScriptRenderer`, `statistics`, `export`, etc.) continue importing from `src/lib/screenplayAST.ts` unchanged.

---

## Pages to Migrate

| Current Route | Next.js Route | Rendering Strategy |
|---|---|---|
| `/` | `app/page.tsx` | SSR + client hydration |
| `/read/:id` | `app/read/[id]/page.tsx` | ISR + on-demand revalidation |
| `/author/:id` | `app/author/[id]/page.tsx` | ISR |
| `/org/:id` | `app/org/[id]/page.tsx` | ISR |
| `/series/:name` | `app/series/[name]/page.tsx` | ISR |
| `/privacy` | `app/privacy/page.tsx` | SSG |
| `/terms` | `app/terms/page.tsx` | SSG |

---

## Revalidation Strategy

```
User saves script in workspace editor
→ PUT /api/scripts/:id (backend)
→ backend calls: POST http://public:3000/api/revalidate
  { secret: REVALIDATE_SECRET, paths: ["/read/:id"] }
→ Next.js clears ISR cache for that path
```

---

## Migration Phases

---

### Phase 1 — packages/script-engine (parser core) ← START HERE

**Goal**: establish the canonical engine. Immediately resolves Next/Vite marker theme inconsistency.

**Work**:

1. Create `packages/script-engine/src/` directory structure
2. Port pure logic from Vite (no React, no DOM, no Parsimmon):
   - `src/lib/markerThemeCodec.ts` → `marker-theme/normalize.ts`
   - `src/lib/markerRules.ts` → `marker-theme/normalize.ts` (inline) or separate
   - `src/constants/defaultMarkerRules.ts` → `marker-theme/defaultRules.ts`
   - `src/lib/parsers/inlineParser.ts` + `parserGenerators.ts` → `parser/inlineParser.ts` (Parsimmon replaced with pure regex scan)
   - `src/lib/parsers/titlePageParser.ts` → `parser/titlePageParser.ts`
   - `src/lib/importPipeline/directASTBuilder.ts` → `parser/directASTBuilder.ts`
3. Add `parser/parseScreenplay.ts` (same logic as current `src/lib/screenplayAST.ts`)
4. Add `document/astTypes.ts` — canonical `MarkerConfig`, `AstNode`, `InlineToken` types
5. Add `document/toc.ts` — `extractToc(root: AstNode): TocEntry[]`
6. Add `index.ts` with public exports
7. Add tsconfig path aliases to Vite `tsconfig.json` + `vite.config.ts`
8. Add tsconfig path alias to `apps/public/tsconfig.json`
9. Update Vite `src/lib/screenplayAST.ts` → thin facade over engine
10. Update `src/lib/markerThemeCodec.ts` → re-export `normalizeMarkerConfigsSchema` from engine (keeps existing importers working)
11. Update Next `apps/public/app/read/[id]/page.tsx` → use engine `parseScreenplay`
12. Update Next `apps/public/lib/markerThemeResolver.ts` → use engine `resolveMarkerConfigs`
13. Update Next `ScriptContentRenderer` → use engine `parseInline` for inline tokens
14. Delete `apps/public/lib/scriptParser.ts` (engine is now canonical)
15. Delete `apps/public/lib/script-parser/` (interim files, superseded by engine)

**Fixtures** (`packages/script-engine/src/fixtures/`):

Each fixture is `{ content, markerConfigs, description }` with a corresponding snapshot of expected `parseScreenplay()` output.

- `default-markers.fixture.ts` — default marker rules + sample dialogue/action/scene content
- `custom-prefix.fixture.ts` — custom `#C`/`#D` character + dialogue markers
- `regex-marker.fixture.ts` — regex mode chapter heading marker
- `range-marker.fixture.ts` — range/section open+content+close
- `inline-enclosure.fixture.ts` — `【】` inline enclosure within dialogue
- `legacy-normalization.fixture.ts` — `dual` type normalization, bad `mapFields` string stripped

**Verification**:
```bash
# Vite typecheck
npx tsc --noEmit

# Next typecheck
cd apps/public && npx tsc --noEmit

# Existing Vite tests (must not regress)
npm run test

# Engine fixture tests
cd packages/script-engine && npx vitest run

# Next build
cd apps/public && npm run build
```

**Success criteria**:
- Same content + markerConfigs → identical `parseScreenplay()` output from Vite facade and Next engine call
- No Vite test regression
- Next `/read/:id` SSR renders with engine-parsed AST + marker theme applied

---

### Phase 2 — ScriptDocument Model

**Goal**: unified document model so all consumers (reader, stats, export) get the same structured output from a single parse.

**New type**:
```ts
interface ScriptDocument {
  titlePage: string[];                           // raw title lines
  titleEntries: { key: string; values: string[] }[];
  ast: AstNode;                                  // root node with children
  toc: TocEntry[];                               // scene headings with id + label
  scenes: { id: string; label: string }[];
  markersUsed: MarkerUsage[];
}
```

**Work**:
1. `parseScreenplay()` returns `ScriptDocument`
2. `document/toc.ts` — `extractToc()` (moves from Next's self-made version into engine)
3. `document/markerUsage.ts` — scan AST for which marker IDs appear and how often
4. Next reader uses `document.toc`, `document.scenes`, `document.titleEntries` from engine
5. Vite `screenplayAST.ts` facade maps `ScriptDocument` back to existing return shape for backward compat

**Verification**:
- Same script: `toc` output identical between Vite and Next
- `scenes` list identical
- `markersUsed` list correct

---

### Phase 3 — Render Token Layer

**Goal**: decouple AST interpretation from React rendering. Renderer reads a flat token stream, not raw AST nodes.

**New types** (`render/renderTokens.ts`):
```ts
type RenderToken =
  | { type: "block"; nodeType: string; markerId?: string; text: string; style?: Record<string,string>; inline?: InlineToken[] }
  | { type: "rangeStart"; markerId: string; style?: Record<string,string> }
  | { type: "rangeEnd"; markerId: string }
  | { type: "blank" };
```

**Work**:
1. `toRenderTokens(ast: AstNode, markerConfigs: MarkerConfig[]): RenderToken[]`
2. Style resolution unified in engine:
   - block style (from marker config)
   - inline token style (per token, from marker config)
   - range style (propagated from range marker to children)
   - `renderer.template` expansion
   - `showDelimiters` control
3. Next `ScriptContentRenderer` renders `RenderToken[]`
4. `htmlSerializer.ts` — `RenderToken[] → string` for OG image generation and server-side export preview
5. Vite renderer migrates progressively; not required in this phase

**Verification**:
- Range markers: same visual output in Vite and Next
- Inline enclosure delimiters shown/hidden correctly per config
- `renderer.template` substitution correct

---

### Phase 4 — Stats / Export Adapter

**Goal**: statistics and export consume engine output rather than running their own parse pass.

**Work**:
1. Statistics hooks consume `ScriptDocument` (character count, marker usage, word count)
2. Google Docs export adapts `ScriptDocument` or `RenderToken[]`
3. PDF/export metadata uses engine `titleEntries`
4. Search index / AI raw format produced by engine

**Verification**:
- Word count / character count consistent between editor stats and export
- Google Docs output does not regress

---

### Phase 5 — Next.js Public Pages Completion

All public routes fully functional with engine-backed parsing.

**Work**:
1. `/` gallery — SSR + client hydration; `usePublicGalleryState` adapted to `next/navigation`
2. `/author/[id]` — ISR, `Person` JSON-LD
3. `/org/[id]` — ISR, `Organization` JSON-LD
4. `/series/[name]` — ISR
5. `/privacy`, `/terms`, `/about` — SSG
6. Nginx cutover for each route after per-route verification

---

### Phase 6 — Vite Link Hard-Navigation Fix

**Problem**: Vite SPA `navigate()` calls on public-facing links bypass nginx and stay in the SPA, never reaching Next.js.

**Audit targets**: `ScriptGalleryCard`, `AuthorGalleryCard`, `OrgGalleryCard`, `PublicTopBar`, `SeriesCard`, `HorizontalScrollLane`.

**Fix**: replace `navigate("/read/:id")` with `window.location.href = "/read/:id"` or `<a href="/read/:id">` for all links pointing to public routes. Internal workspace links (`/edit/:id`, `/dashboard`) remain as `navigate()`.

---

### Phase 7 — Cleanup

1. Delete `apps/public/lib/scriptParser.ts` (already done in Phase 1)
2. Remove Python SEO injection from `server/main.py` for routes handled by Next.js
3. Remove dead Vite code for migrated public routes
4. Final nginx cleanup

---

## First PR Scope (completed)

Phase 1 only. All items completed.

- [x] `packages/script-engine/src/` created with all parser + document modules
- [x] `packages/script-engine/src/fixtures/` with 6 fixture files
- [x] Vite `tsconfig.json` + `vite.config.ts` path alias `@write/script-engine` added
- [x] Next `apps/public/tsconfig.json` path alias `@write/script-engine` added
- [x] Vite `src/lib/screenplayAST.ts` → thin facade over engine
- [x] Vite `src/lib/markerThemeCodec.ts` → re-exports from engine
- [x] Next `/read/[id]/page.tsx` uses engine `parseScreenplay`
- [x] Next `ScriptContentRenderer` uses engine `parseInline`
- [x] `apps/public/lib/scriptParser.ts` deleted
- [x] `apps/public/lib/script-parser/` deleted
- [x] All verification commands pass
- [x] 6 fixture tests pass

---

## Docker Images

### Current (2 images)
```
write_project-frontend   nginx + Vite dist
write_project-backend    FastAPI
```

### After migration (3 images)
```
write_project-public     Next.js (port 3000)
write_project-workspace  nginx + Vite dist (port 1090)
write_project-backend    FastAPI (unchanged)
```

---

## Environment Variables

| Var | Where | Purpose |
|---|---|---|
| `REVALIDATE_SECRET` | backend + public app | authenticate revalidation webhook |
| `NEXTJS_REVALIDATE_URL` | backend | URL of Next.js revalidation endpoint |
| `NEXT_PUBLIC_API_URL` | public app | API base URL (same as `VITE_API_URL`) |

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Engine Parsimmon removal changes inline parse behaviour | Fixture parity tests lock expected output before and after |
| Vite facade breaks existing Vite call sites | `screenplayAST.ts` keeps identical return shape; run full Vite test suite |
| Next cold start on low-memory server | Next standalone output; ISR means most pages cached |
| localStorage / browser API SSR errors | `"use client"` boundaries enforced; `typeof window !== "undefined"` guards |
| ISR stale cache after script update | On-demand revalidation webhook; fallback daily revalidate |

---

## Success Criteria

- [x] Same content + markerTheme → identical `parseScreenplay()` output from engine, Vite facade, and Next
- [x] All public routes return full SSR HTML (`/`, `/read/[id]`, `/author/[id]`, `/org/[id]`, `/series/[name]`, `/tag/[name]`)
- [ ] Google Search Console indexes new pages within 2 weeks — ongoing, not yet verifiable
- [ ] `/read/[id]` ISR cache updates within 5 seconds of script save — pending production traffic observation
- [x] Existing workspace (editor, dashboard) fully unaffected — Vite Batch 2 deletion verified with tsc + vitest
- [x] New marker rules modified only in engine → effect visible in both editor and public reader
- [ ] Lighthouse SEO score ≥ 95 on `/read/[id]` — not yet measured
