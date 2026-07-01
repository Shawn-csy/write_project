/**
 * Shared render model for script content.
 *
 * Pure data — no React, no DOM. Consumers (React, Google Docs, PDF, etc.)
 * map RenderBlock[] to their own output format.
 */

// ─── inline ───────────────────────────────────────────────────────────────────

/** A single styled text run within a line. */
export interface InlineRun {
  /** Display text after marker renderer rules are applied. */
  text: string;
  /** Raw marker content before renderer.template/showDelimiters are applied. */
  content?: string;
  /** Merged CSS-style object (from marker config style + token style). */
  style?: Record<string, string>;
  /** Marker id that produced this run, if it was a highlight token. */
  markerId?: string;
}

// ─── block kinds ──────────────────────────────────────────────────────────────

/** Source line numbers for traceability. */
export interface LineSpan {
  lineStart: number;
  lineEnd: number;
}

export type RenderBlockKind =
  | "scene_heading"
  | "character"
  | "dialogue"
  | "action"
  | "parenthetical"
  | "transition"
  | "centered"
  | "blank"
  | "layer"
  | "range"
  | "unknown";

// ─── base ─────────────────────────────────────────────────────────────────────

interface RenderBlockBase {
  kind: RenderBlockKind;
  /** Node id (slug) — present on scene_heading nodes. */
  id?: string;
  /** Source position. */
  span?: LineSpan;
  /** Merged style from marker config + range inheritance. */
  style?: Record<string, string>;
  /** Marker id that produced this block. */
  markerId?: string;
}

// ─── leaf blocks ──────────────────────────────────────────────────────────────

export interface SceneHeadingBlock extends RenderBlockBase {
  kind: "scene_heading";
  text: string;
}

export interface CharacterBlock extends RenderBlockBase {
  kind: "character";
  text: string;
}

/**
 * Text-bearing blocks: dialogue, action, parenthetical, transition, centered.
 * Each line is pre-split and tokenised into InlineRun[].
 */
export interface TextBlock extends RenderBlockBase {
  kind: "dialogue" | "action" | "parenthetical" | "transition" | "centered";
  /** One entry per source line (split on \n). */
  lines: InlineRun[][];
}

export interface BlankBlock extends RenderBlockBase {
  kind: "blank";
}

export interface UnknownBlock extends RenderBlockBase {
  kind: "unknown";
  text?: string;
}

// ─── container blocks ─────────────────────────────────────────────────────────

/**
 * A block/range marker boundary line (layer start, end, pause).
 * Carries its own label runs.
 */
export interface LayerBlock extends RenderBlockBase {
  kind: "layer";
  /** Rendered label runs for the layer line (may be empty). */
  labelRuns: InlineRun[];
  /** rangeRole: start | end | pause | undefined */
  rangeRole?: string;
  /** child blocks inside this layer (only present for standalone layer nodes) */
  children?: RenderBlock[];
}

/**
 * A collapsed range node. Children are the blocks between start and end.
 * startBlock / endBlock are the rendered layer boundary lines.
 */
export interface RangeBlock extends RenderBlockBase {
  kind: "range";
  startBlock?: LayerBlock;
  endBlock?: LayerBlock;
  children: RenderBlock[];
  /** Continuity depth for visual indentation (nested ranges). */
  depth: number;
}

// ─── union ────────────────────────────────────────────────────────────────────

export type RenderBlock =
  | SceneHeadingBlock
  | CharacterBlock
  | TextBlock
  | BlankBlock
  | UnknownBlock
  | LayerBlock
  | RangeBlock;
