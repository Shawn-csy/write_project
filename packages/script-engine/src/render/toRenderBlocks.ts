import type { AstNode, InlineToken, MarkerConfig } from "../document/astTypes";
import { parseInline } from "../parser/inlineParser";
import type {
  RenderBlock,
  InlineRun,
  LineSpan,
  LayerBlock,
  RangeBlock,
} from "./renderTypes";
import { toInlineRuns, toLineRuns } from "./toInlineRuns";

// ─── helpers ──────────────────────────────────────────────────────────────────

function span(node: AstNode): LineSpan | undefined {
  const s = node.lineStart;
  const e = node.lineEnd ?? node.lineStart;
  if (s == null) return undefined;
  return { lineStart: s as number, lineEnd: (e ?? s) as number };
}

function mergeStyle(
  ...sources: (Record<string, string> | undefined | null)[]
): Record<string, string> | undefined {
  const out: Record<string, string> = {};
  for (const src of sources) {
    if (src) Object.assign(out, src);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function getInlineTokens(node: AstNode, inlineConfigs: MarkerConfig[]): InlineToken[] {
  if (Array.isArray(node.inline) && node.inline.length > 0) {
    return node.inline as InlineToken[];
  }
  const text = typeof node.text === "string" ? node.text : "";
  return parseInline(text, inlineConfigs);
}

function labelRuns(node: AstNode, inlineConfigs: MarkerConfig[]): InlineRun[] {
  if (Array.isArray(node.inlineLabel) && node.inlineLabel.length > 0) {
    return toInlineRuns(node.inlineLabel as InlineToken[], inlineConfigs);
  }
  const labelText = typeof node.text === "string" ? node.text :
    typeof node.label === "string" ? node.label : "";
  if (!labelText) return [];
  return [{ text: labelText }];
}

function cfgStyle(node: AstNode, markerConfigs: MarkerConfig[]): Record<string, string> | undefined {
  const id = node.markerId ?? node.layerType;
  if (!id) return undefined;
  const cfg = markerConfigs.find((c) => c.id === id);
  return cfg?.style as Record<string, string> | undefined;
}

// ─── per-node converters ──────────────────────────────────────────────────────

function convertLayer(
  node: AstNode,
  markerConfigs: MarkerConfig[],
  inlineConfigs: MarkerConfig[],
  depth: number
): LayerBlock {
  const style = mergeStyle(cfgStyle(node, markerConfigs), node.style as Record<string, string>);
  const children = node.children && node.children.length > 0
    ? convertNodes(node.children, markerConfigs, inlineConfigs, depth)
    : undefined;
  return {
    kind: "layer",
    id: node.id as string | undefined,
    span: span(node),
    style,
    markerId: (node.markerId ?? node.layerType) as string | undefined,
    rangeRole: node.rangeRole as string | undefined,
    labelRuns: labelRuns(node, inlineConfigs),
    children,
  };
}

function convertRange(
  node: AstNode,
  markerConfigs: MarkerConfig[],
  inlineConfigs: MarkerConfig[],
  depth: number
): RangeBlock {
  const style = mergeStyle(
    cfgStyle(node, markerConfigs),
    node.style as Record<string, string>
  );
  const startBlock = node.startNode
    ? convertLayer(node.startNode, markerConfigs, inlineConfigs, depth + 1)
    : undefined;
  const endBlock = node.endNode
    ? convertLayer(node.endNode, markerConfigs, inlineConfigs, depth + 1)
    : undefined;
  const children = convertNodes(
    node.children ?? [],
    markerConfigs,
    inlineConfigs,
    depth + 1
  );
  return {
    kind: "range",
    id: node.id as string | undefined,
    span: span(node),
    style,
    markerId: (node.markerId ?? node.layerType) as string | undefined,
    startBlock,
    endBlock,
    children,
    depth,
  };
}

function convertTextNode(
  node: AstNode,
  kind: "dialogue" | "action" | "parenthetical" | "transition" | "centered",
  markerConfigs: MarkerConfig[],
  inlineConfigs: MarkerConfig[]
) {
  const text = typeof node.text === "string" ? node.text : "";
  const style = mergeStyle(
    cfgStyle(node, markerConfigs),
    node.rangeStyle as Record<string, string>,
    node.style as Record<string, string>
  );
  const lines = toLineRuns(
    text,
    (line) => getInlineTokens({ ...node, text: line, inline: undefined }, inlineConfigs),
    inlineConfigs
  );
  return { kind, id: node.id as string | undefined, span: span(node), style, markerId: node.markerId as string | undefined, lines };
}

function convertNode(
  node: AstNode,
  markerConfigs: MarkerConfig[],
  inlineConfigs: MarkerConfig[],
  depth: number
): RenderBlock | null {
  switch (node.type) {
    case "scene_heading":
      return {
        kind: "scene_heading",
        id: node.id as string | undefined,
        span: span(node),
        style: mergeStyle(cfgStyle(node, markerConfigs), node.style as Record<string, string>),
        markerId: node.markerId as string | undefined,
        text: typeof node.text === "string" ? node.text : "",
      };

    case "character":
      return {
        kind: "character",
        id: node.id as string | undefined,
        span: span(node),
        style: mergeStyle(cfgStyle(node, markerConfigs), node.style as Record<string, string>),
        markerId: node.markerId as string | undefined,
        text: typeof node.text === "string" ? node.text : "",
      };

    case "dialogue":
      return convertTextNode(node, "dialogue", markerConfigs, inlineConfigs);
    case "action":
      return convertTextNode(node, "action", markerConfigs, inlineConfigs);
    case "parenthetical":
      return convertTextNode(node, "parenthetical", markerConfigs, inlineConfigs);
    case "transition":
      return convertTextNode(node, "transition", markerConfigs, inlineConfigs);
    case "centered":
      return convertTextNode(node, "centered", markerConfigs, inlineConfigs);

    case "blank":
      return {
        kind: "blank",
        span: span(node),
        style: mergeStyle(node.rangeStyle as Record<string, string>),
      };

    case "layer":
      return convertLayer(node, markerConfigs, inlineConfigs, depth);

    case "range":
      return convertRange(node, markerConfigs, inlineConfigs, depth);

    case "note":
      return null;

    default:
      if (node.text) {
        return {
          kind: "unknown",
          span: span(node),
          text: String(node.text),
        };
      }
      // recurse into root/container nodes
      if (node.children && node.children.length > 0) {
        // flatten container children (e.g. root, speech, dual_dialogue)
        return null; // caller handles via convertNodes on children
      }
      return null;
  }
}

function convertNodes(
  nodes: AstNode[],
  markerConfigs: MarkerConfig[],
  inlineConfigs: MarkerConfig[],
  depth: number
): RenderBlock[] {
  const out: RenderBlock[] = [];
  for (const node of nodes) {
    // speech / dual_dialogue: flatten children directly
    if (node.type === "speech" || node.type === "root") {
      out.push(...convertNodes(node.children ?? [], markerConfigs, inlineConfigs, depth));
      continue;
    }
    if (node.type === "dual_dialogue") {
      out.push(...convertNodes(node.left as AstNode[] ?? [], markerConfigs, inlineConfigs, depth));
      out.push(...convertNodes(node.right as AstNode[] ?? [], markerConfigs, inlineConfigs, depth));
      continue;
    }
    const block = convertNode(node, markerConfigs, inlineConfigs, depth);
    if (block) out.push(block);
  }
  return out;
}

// ─── public API ───────────────────────────────────────────────────────────────

/**
 * Convert an engine AstNode tree into a flat-ish RenderBlock[] list.
 *
 * - No React, no DOM.
 * - Inline text is pre-tokenised into InlineRun[][] so consumers don't re-parse.
 * - Range nodes carry startBlock/endBlock/children for nested rendering.
 * - `markerConfigs` used for config-level style lookup and inline parsing.
 *
 * @param root        Engine AstNode (type="root" or any subtree root).
 * @param markerConfigs  Full marker config array (block + inline).
 */
export function toRenderBlocks(
  root: AstNode,
  markerConfigs: MarkerConfig[] = []
): RenderBlock[] {
  const inlineConfigs = markerConfigs.filter(
    (c) => c.matchMode === "enclosure" || c.matchMode === "inline" ||
           (!c.matchMode && !c.isBlock && Boolean(c.end))
  );
  const nodes = root.type === "root" ? (root.children ?? []) : [root];
  return convertNodes(nodes, markerConfigs, inlineConfigs, 0);
}
