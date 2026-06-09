# @write/script-engine

Canonical screenplay parser shared by Vite editor, Next.js public reader, and export pipelines.

## Stable Public API

```ts
import {
  // Top-level parse
  parseScreenplay,       // (text, markerConfigs?) → ScriptDocument
  buildAST,             // (text, markerConfigs?) → AstNode  (body only, no title page)

  // Inline parser
  parseInline,          // (text, MarkerConfig[]) → InlineToken[]
  buildFlexiblePattern, // (token: string) → string  (halfwidth+fullwidth regex)

  // Marker theme normalization
  normalizeThemeConfigs,        // (unknown) → unknown[]
  normalizeMarkerConfigsSchema, // (unknown) → MarkerConfig[]
  isBlockLike, isInlineLike,
  normalizeLegacyMarkerType,

  // Defaults
  getDefaultMarkerRules,
  defaultMarkerConfigs,
  DEFAULT_MARKER_RULES,

  // Document utilities
  extractToc,           // (AstNode) → TocEntry[]
  splitTitleAndBody,    // (text) → { titleLines, bodyText, bodyStartLine }
  extractTitleEntries,  // (titleLines) → TitleEntry[]
} from '@write/script-engine';
```

## Types

```ts
import type {
  MarkerConfig,
  AstNode,
  InlineToken,
  TocEntry,
  TitleEntry,
  MarkerUsage,
  ScriptDocument,
} from '@write/script-engine';
```

## ScriptDocument shape

```ts
interface ScriptDocument {
  titlePage: string[];        // raw title page lines
  titleEntries: TitleEntry[]; // parsed key/value pairs
  ast: AstNode;               // root node, children = body nodes
  toc: TocEntry[];            // scene headings for navigation
  scenes: { id: string; label: string }[];
  markersUsed: MarkerUsage[]; // { markerId, count } for each matched block marker (inline markers not tracked)
}
```

## AstNode types

| type | description |
|------|-------------|
| `root` | document root, has `children` |
| `action` | action/description line |
| `blank` | empty line |
| `scene_heading` | scene heading (via `parseAs: "scene_heading"`) |
| `character` | character name (via `parseAs: "character"`) |
| `dialogue` | dialogue line (via `parseAs: "dialogue"`) |
| `layer` | block marker hit (`rangeRole`: start/end/pause) |
| `range` | collapsed range (`startNode`, `endNode`, `children`) |

## Internal (not exported)

`DirectASTBuilder` — use `buildAST` or `parseScreenplay` instead.

## Resolver priority

`normalizeMarkerConfigsSchema` accepts:
- `MarkerConfig[]` (canonical)
- `{ configs: [...] }` / `{ markerConfigs: [...] }` / `{ markers: [...] }`
- JSON string of any of the above
- Nested string inside `obj.configs` / `obj.markerConfigs` / `obj.markers`
