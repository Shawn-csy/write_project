import { parseScreenplay } from "./screenplayAST";
import { toRenderBlocks } from "@write/script-engine";
import type { RenderBlock, InlineRun, LayerBlock, RangeBlock } from "@write/script-engine";
import type { MarkerConfig } from "../types/script";
import { resolveMarkerColorToken } from "./markerStyleResolver";

export interface GoogleDocsRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
}

export interface GoogleDocsBlock {
  runs: GoogleDocsRun[];
}

export interface GoogleDocsHitRow {
  line: number;
  type: string;
  markerId: string;
  layerType: string;
  text: string;
  styleColorRaw: string;
  styleColorParsed: string;
  styleBoldRaw: string;
  styleItalicRaw: string;
}

const CHARACTER_COLOR_SEQUENCE = [
  "#8B5E3C",
  "#5A6FA8",
  "#B06A82",
  "#5F7C8A",
  "#6F8F72",
  "#7E8A4A",
  "#3E8B8B",
  "#5F9EA0",
  "#7A88D1",
  "#9B6BC6",
  "#8C847A",
  "#4B5563",
];

const normalizeCharacterKey = (name = "") => String(name).trim().toLowerCase();

const parseColor = (value: unknown): string | undefined => {
  const raw = String(value || "").trim();
  if (!raw) return undefined;
  const mappedToken = resolveMarkerColorToken(raw);
  if (mappedToken) return mappedToken;
  if (/^#[0-9a-f]{6}$/i.test(raw)) return raw.toUpperCase();
  const rgb = raw.match(/^rgb\(([^)]+)\)$/i);
  if (!rgb) return undefined;
  const nums = rgb[1].split(",").slice(0, 3).map((n) => Math.max(0, Math.min(255, Number(n.trim()) || 0)));
  if (nums.length !== 3) return undefined;
  return `#${nums.map((v) => v.toString(16).padStart(2, "0")).join("")}`.toUpperCase();
};

const styleFromCss = (style?: Record<string, unknown>): Omit<GoogleDocsRun, "text"> => {
  const src = style || {};
  const fontWeight = String(src["fontWeight"] ?? src["font-weight"] ?? "").toLowerCase();
  const textDecoration = String(src["textDecoration"] ?? src["text-decoration"] ?? src["text-decoration-line"] ?? "").toLowerCase();
  const fontStyle = String(src["fontStyle"] ?? src["font-style"] ?? "").toLowerCase();
  return {
    bold: fontWeight === "bold" || Number(fontWeight) >= 600,
    italic: fontStyle === "italic",
    underline: textDecoration.includes("underline"),
    color: parseColor(src["color"]),
  };
};

const mergeStyle = (base: Omit<GoogleDocsRun, "text">, override: Omit<GoogleDocsRun, "text">): Omit<GoogleDocsRun, "text"> => ({
  bold: override.bold || base.bold || false,
  italic: override.italic || base.italic || false,
  underline: override.underline || base.underline || false,
  color: override.color || base.color,
});

const makeContinuityPrefix = (depth: number): string => {
  if (!Number.isFinite(depth) || depth <= 0) return "";
  return `${Array.from({ length: depth }).map(() => "│").join(" ")} `;
};

const withContinuityPrefix = (runs: GoogleDocsRun[], depth: number): GoogleDocsRun[] => {
  const prefix = makeContinuityPrefix(depth);
  if (!prefix) return runs;
  if (!runs.length) return [{ text: prefix }];
  const first = runs[0];
  return [{ ...first, text: `${prefix}${first.text}` }, ...runs.slice(1)];
};

// Convert engine InlineRun[] → GoogleDocsRun[], applying base style
const inlineRunsToDocRuns = (
  runs: InlineRun[],
  baseStyle: Omit<GoogleDocsRun, "text"> = {}
): GoogleDocsRun[] =>
  runs.map((r) => {
    const s = styleFromCss(r.style as Record<string, unknown> | undefined || {});
    return { text: r.text, ...mergeStyle(baseStyle, s) };
  });

// Convert engine RenderBlock tree → GoogleDocsBlock[], with continuity depth
const renderBlocksToDocBlocks = (
  blocks: RenderBlock[],
  characterColors: Map<string, string>,
  depth = 0
): GoogleDocsBlock[] => {
  const out: GoogleDocsBlock[] = [];

  for (const block of blocks) {
    const baseStyle = styleFromCss((block.style as Record<string, unknown>) || {});

    switch (block.kind) {
      case "scene_heading": {
        const s = mergeStyle({ bold: true }, baseStyle);
        out.push({ runs: withContinuityPrefix([{ text: block.text, ...s }], depth) });
        break;
      }

      case "character": {
        const key = normalizeCharacterKey(block.text);
        if (key && !characterColors.has(key)) {
          characterColors.set(key, CHARACTER_COLOR_SEQUENCE[characterColors.size % CHARACTER_COLOR_SEQUENCE.length]);
        }
        const roleColor = key ? characterColors.get(key) : undefined;
        const s = mergeStyle({ bold: true }, baseStyle);
        if (roleColor) s.color = roleColor;
        out.push({ runs: withContinuityPrefix([{ text: block.text, ...s }], depth) });
        break;
      }

      case "dialogue":
      case "action":
      case "parenthetical":
      case "transition":
      case "centered": {
        for (const lineRuns of block.lines) {
          const docRuns = inlineRunsToDocRuns(lineRuns, baseStyle);
          const lineOut = docRuns.length > 0 ? docRuns : [{ text: "" }];
          out.push({ runs: withContinuityPrefix(lineOut, depth) });
        }
        break;
      }

      case "blank":
        out.push({ runs: [{ text: "" }] });
        break;

      case "layer": {
        const labelDocRuns = inlineRunsToDocRuns((block as LayerBlock).labelRuns, baseStyle);
        if (labelDocRuns.length > 0) {
          out.push({ runs: withContinuityPrefix(labelDocRuns, depth) });
        }
        if ((block as LayerBlock).children && (block as LayerBlock).children!.length > 0) {
          out.push(...renderBlocksToDocBlocks((block as LayerBlock).children!, characterColors, depth));
        }
        break;
      }

      case "range": {
        const rb = block as RangeBlock;
        const nextDepth = depth + 1;
        if (rb.startBlock) {
          out.push(...renderBlocksToDocBlocks([rb.startBlock], characterColors, nextDepth));
        }
        out.push(...renderBlocksToDocBlocks(rb.children, characterColors, nextDepth));
        if (rb.endBlock) {
          out.push(...renderBlocksToDocBlocks([rb.endBlock], characterColors, nextDepth));
        }
        break;
      }

      case "unknown":
        if (block.text) out.push({ runs: withContinuityPrefix([{ text: block.text, ...baseStyle }], depth) });
        break;
    }
  }

  return out;
};

export const buildGoogleDocsBlocksFromScript = (content: string, markerConfigs: MarkerConfig[] = []): GoogleDocsBlock[] => {
  const safeMarkerConfigs = Array.isArray(markerConfigs) ? markerConfigs : [];
  const { ast } = parseScreenplay(content || "", safeMarkerConfigs);
  const renderBlocks = toRenderBlocks(ast, safeMarkerConfigs);
  const characterColors = new Map<string, string>();
  const blocks = renderBlocksToDocBlocks(renderBlocks, characterColors);
  return blocks.length > 0 ? blocks : [{ runs: [{ text: content || "" }] }];
};

const normalizeCssColorToHex = (color = ""): string | undefined => {
  return parseColor(color);
};

const styleFromComputed = (computed: CSSStyleDeclaration): Omit<GoogleDocsRun, "text"> => {
  const weight = String(computed.fontWeight || "").toLowerCase();
  const style = String(computed.fontStyle || "").toLowerCase();
  const deco = String(computed.textDecorationLine || computed.textDecoration || "").toLowerCase();
  return {
    bold: weight === "bold" || Number(weight) >= 600,
    italic: style === "italic",
    underline: deco.includes("underline"),
    color: normalizeCssColorToHex(String(computed.color || "")),
  };
};

const mergeConsecutiveRuns = (runs: GoogleDocsRun[]): GoogleDocsRun[] => {
  if (runs.length <= 1) return runs;
  const merged: GoogleDocsRun[] = [];
  for (const run of runs) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      prev.bold === run.bold &&
      prev.italic === run.italic &&
      prev.underline === run.underline &&
      (prev.color || "") === (run.color || "")
    ) {
      prev.text += run.text;
    } else {
      merged.push({ ...run });
    }
  }
  return merged;
};

const trimEdgeWhitespaceRuns = (runs: GoogleDocsRun[]): GoogleDocsRun[] => {
  if (runs.length === 0) return runs;
  const out = runs.map((r) => ({ ...r }));
  while (out.length > 0 && /^\s*$/.test(String(out[0].text || ""))) out.shift();
  while (out.length > 0 && /^\s*$/.test(String(out[out.length - 1].text || ""))) out.pop();
  if (out.length > 0) {
    out[0].text = String(out[0].text || "").replace(/^\s+/, "");
    out[out.length - 1].text = String(out[out.length - 1].text || "").replace(/\s+$/, "");
  }
  return out;
};

const getContinuityDepth = (el: Element | null): number => {
  let depth = 0;
  let cur: Element | null = el;
  while (cur) {
    const cls = String(cur.className || "");
    const isRangeScope = cur.classList?.contains("range-node");
    const isContinuousLayer = cls.includes("continuous-layer");
    if (isRangeScope || isContinuousLayer) depth += 1;
    cur = cur.parentElement;
  }
  return depth;
};

const collectLineElements = (root: ParentNode): Element[] => {
  const scope = root as Element | Document;
  const candidates = [
    ...Array.from(scope.querySelectorAll?.(".script-line") || []),
    ...Array.from(scope.querySelectorAll?.(".layer-label > span") || []),
    ...Array.from(scope.querySelectorAll?.(".layer-footer > span") || []),
    ...Array.from(scope.querySelectorAll?.("[data-line-start]") || []),
  ];
  const picked: Element[] = [];
  const seen = new Set<Element>();
  candidates.forEach((el) => {
    if (seen.has(el)) return;
    if (!el.classList.contains("script-line") && el.querySelector(".script-line")) return;
    const text = String(el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text && !el.querySelector("br")) return;
    seen.add(el);
    picked.push(el);
  });
  return picked;
};

export const buildGoogleDocsBlocksFromRenderedHtml = (renderedHtml: string): GoogleDocsBlock[] => {
  const html = String(renderedHtml || "").trim();
  if (!html || typeof window === "undefined" || typeof document === "undefined") return [];

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-99999px";
  host.style.top = "0";
  host.style.width = "900px";
  host.style.pointerEvents = "none";
  host.style.opacity = "0";
  host.innerHTML = html;
  document.body.appendChild(host);

  try {
    const topLevelLines = collectLineElements(host);

    const blocks: GoogleDocsBlock[] = [];

    const walkTextNodes = (node: Node, runs: GoogleDocsRun[]) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent || "";
        if (!text) return;
        const parent = node.parentElement || host;
        const computed = window.getComputedStyle(parent);
        const style = styleFromComputed(computed);
        runs.push({ text, ...style });
        return;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return;
      const element = node as Element;
      if (element.tagName.toLowerCase() === "br") {
        runs.push({ text: "\n" });
        return;
      }
      Array.from(element.childNodes).forEach((child) => walkTextNodes(child, runs));
    };

    topLevelLines.forEach((line) => {
      const runs: GoogleDocsRun[] = [];
      Array.from(line.childNodes).forEach((node) => walkTextNodes(node, runs));
      const compact = trimEdgeWhitespaceRuns(
        mergeConsecutiveRuns(runs).filter((run) => run.text.length > 0)
      );
      const normalizedRuns = compact.length > 0 ? compact : [{ text: "" }];
      const depth = getContinuityDepth(line);
      const prefix = makeContinuityPrefix(depth);
      if (prefix) {
        const first = normalizedRuns[0];
        const prefixedFirst = first ? { ...first, text: `${prefix}${first.text}` } : { text: prefix };
        blocks.push({ runs: [prefixedFirst, ...normalizedRuns.slice(1)] });
      } else {
        blocks.push({ runs: normalizedRuns });
      }
    });

    return blocks;
  } finally {
    document.body.removeChild(host);
  }
};

export const buildGoogleDocsBlocksFromDom = (root?: ParentNode | null): GoogleDocsBlock[] => {
  if (typeof window === "undefined" || typeof document === "undefined") return [];
  const scope: ParentNode = root || document;
  const scriptLines = collectLineElements(scope);
  if (scriptLines.length === 0) return [];

  const blocks: GoogleDocsBlock[] = [];
  const walkTextNodes = (node: Node, runs: GoogleDocsRun[]) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || "";
      if (!text) return;
      const parent = node.parentElement || null;
      if (!parent) return;
      const computed = window.getComputedStyle(parent);
      const style = styleFromComputed(computed);
      runs.push({ text, ...style });
      return;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const element = node as Element;
    if (element.tagName.toLowerCase() === "br") {
      runs.push({ text: "\n" });
      return;
    }
    Array.from(element.childNodes).forEach((child) => walkTextNodes(child, runs));
  };

  scriptLines.forEach((line) => {
    const runs: GoogleDocsRun[] = [];
    Array.from(line.childNodes).forEach((node) => walkTextNodes(node, runs));
    const compact = trimEdgeWhitespaceRuns(
      mergeConsecutiveRuns(runs).filter((run) => run.text.length > 0)
    );
    const normalizedRuns = compact.length > 0 ? compact : [{ text: "" }];
    const depth = getContinuityDepth(line);
    const prefix = makeContinuityPrefix(depth);
    if (prefix) {
      const first = normalizedRuns[0];
      const prefixedFirst = first ? { ...first, text: `${prefix}${first.text}` } : { text: prefix };
      blocks.push({ runs: [prefixedFirst, ...normalizedRuns.slice(1)] });
    } else {
      blocks.push({ runs: normalizedRuns });
    }
  });
  return blocks;
};

export const buildGoogleDocsHitReport = (content: string, markerConfigs: MarkerConfig[] = []): GoogleDocsHitRow[] => {
  const safeMarkerConfigs = Array.isArray(markerConfigs) ? markerConfigs : [];
  const parsed = parseScreenplay(content || "", safeMarkerConfigs) as { ast?: { children?: Array<Record<string, unknown>> } };
  const nodes = parsed?.ast?.children || [];
  const rows: GoogleDocsHitRow[] = [];

  const findCfg = (node: Record<string, unknown>) => {
    const markerId = String(node?.markerId || "");
    if (markerId) {
      const byMarker = safeMarkerConfigs.find((cfg) => String(cfg?.id || "") === markerId);
      if (byMarker) return byMarker;
    }
    const layerType = String(node?.layerType || "");
    if (layerType) {
      const byLayer = safeMarkerConfigs.find((cfg) => String(cfg?.id || "") === layerType);
      if (byLayer) return byLayer;
    }
    return undefined;
  };

  const walk = (list: Array<Record<string, unknown>>) => {
    list.forEach((node) => {
      const type = String(node?.type || "");
      const text = String(node?.text || node?.label || "");
      const cfg = findCfg(node);
      const style = (cfg?.style as Record<string, unknown>) || {};
      const colorRaw = String(style["color"] ?? "");
      const parsedColor = parseColor(colorRaw) || "";
      const line = Number(node?.lineStart || node?.line || 0);
      if (text || cfg) {
        rows.push({
          line,
          type,
          markerId: String(node?.markerId || ""),
          layerType: String(node?.layerType || ""),
          text: text.slice(0, 80),
          styleColorRaw: colorRaw,
          styleColorParsed: parsedColor,
          styleBoldRaw: String(style["fontWeight"] ?? style["font-weight"] ?? ""),
          styleItalicRaw: String(style["fontStyle"] ?? style["font-style"] ?? ""),
        });
      }
      if (Array.isArray(node?.children)) walk(node.children as Array<Record<string, unknown>>);
      if (Array.isArray(node?.left)) walk(node.left as Array<Record<string, unknown>>);
      if (Array.isArray(node?.right)) walk(node.right as Array<Record<string, unknown>>);
    });
  };

  walk(nodes);
  return rows;
};
