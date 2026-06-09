import { parseScreenplay } from "./screenplayAST";
import { parseInline } from "@write/script-engine";
import type { MarkerConfig } from "../types/script";
import { isInlineLike } from "./markerRules";
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

const splitLines = (text: string) => String(text || "").split("\n");

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

const pushTextLine = (blocks: GoogleDocsBlock[], text: string, style: Omit<GoogleDocsRun, "text"> = {}, continuityDepth = 0) => {
  blocks.push({ runs: withContinuityPrefix([{ text, ...style }], continuityDepth) });
};

const pushInlineLines = (
  blocks: GoogleDocsBlock[],
  text: string,
  inlineConfigs: MarkerConfig[],
  baseStyle: Omit<GoogleDocsRun, "text"> = {},
  continuityDepth = 0
) => {
  const lines = splitLines(text);
  lines.forEach((line) => {
    const nodes = (parseInline(line, inlineConfigs) as unknown as Array<Record<string, unknown>>) || [];
    const runs: GoogleDocsRun[] = [];
    nodes.forEach((node) => {
      const type = String(node?.type || "");
      const content = String(node?.content ?? "");
      if (!content) return;
      if (type === "text") {
        runs.push({ text: content, ...baseStyle });
        return;
      }
      const id = String(node?.id || "");
      const inlineCfg = inlineConfigs.find((cfg) => String(cfg?.id || "") === id);
      const inlineStyle = styleFromCss((inlineCfg?.style as Record<string, unknown>) || {});
      let displayText = content;
      const tpl = String((inlineCfg as any)?.renderer?.template || "");
      if (tpl) {
        displayText = tpl.replace("{{content}}", content);
      } else if ((inlineCfg as any)?.start && (inlineCfg as any)?.end && (inlineCfg as any)?.showDelimiters) {
        displayText = `${String((inlineCfg as any).start)}${content}${String((inlineCfg as any).end)}`;
      }
      runs.push({ text: displayText, ...mergeStyle(baseStyle, inlineStyle) });
    });
    const lineRuns = runs.length > 0 ? runs : [{ text: line, ...baseStyle }];
    blocks.push({ runs: withContinuityPrefix(lineRuns, continuityDepth) });
  });
};

const buildRunsFromInlineNodes = (
  nodes: Array<Record<string, unknown>>,
  inlineConfigs: MarkerConfig[],
  baseStyle: Omit<GoogleDocsRun, "text"> = {}
): GoogleDocsRun[] => {
  const runs: GoogleDocsRun[] = [];
  nodes.forEach((node) => {
    const type = String(node?.type || "");
    const content = String(node?.content ?? "");
    if (!content) return;
    if (type === "text") {
      runs.push({ text: content, ...baseStyle });
      return;
    }
    const id = String(node?.id || "");
    const inlineCfg = inlineConfigs.find((cfg) => String(cfg?.id || "") === id);
    const inlineStyle = styleFromCss((inlineCfg?.style as Record<string, unknown>) || {});
    let displayText = content;
    const tpl = String((inlineCfg as any)?.renderer?.template || "");
    if (tpl) {
      displayText = tpl.replace("{{content}}", content);
    } else if ((inlineCfg as any)?.start && (inlineCfg as any)?.end && (inlineCfg as any)?.showDelimiters) {
      displayText = `${String((inlineCfg as any).start)}${content}${String((inlineCfg as any).end)}`;
    }
    runs.push({ text: displayText, ...mergeStyle(baseStyle, inlineStyle) });
  });
  return runs;
};

const traverseNodes = (
  nodes: Array<Record<string, unknown>>,
  markerConfigs: MarkerConfig[],
  inlineConfigs: MarkerConfig[],
  blocks: GoogleDocsBlock[],
  characterColors: Map<string, string>,
  inheritedStyle: Omit<GoogleDocsRun, "text"> = {},
  continuityDepth = 0
) => {
  const findCfg = (node: Record<string, unknown>) => {
    const markerId = String(node?.markerId || "");
    if (markerId) {
      const found = markerConfigs.find((cfg) => String(cfg?.id || "") === markerId);
      if (found) return found;
    }
    const layerType = String(node?.layerType || "");
    if (layerType) {
      const found = markerConfigs.find((cfg) => String(cfg?.id || "") === layerType);
      if (found) return found;
    }
    return undefined;
  };

  nodes.forEach((node) => {
    const type = String(node?.type || "");
    const text = String(node?.text || "");
    const cfg = findCfg(node);
    const cfgStyle = styleFromCss((cfg?.style as Record<string, unknown>) || {});
    const nodeRangeStyle = styleFromCss((node?.rangeStyle as Record<string, unknown>) || {});
    const effectiveStyle = mergeStyle(mergeStyle(inheritedStyle, cfgStyle), nodeRangeStyle);

    if (type === "root" || type === "range" || type === "layer") {
      if (type === "range") {
        const nextDepth = continuityDepth + 1;
        const startNode = (node?.startNode as Record<string, unknown>) || null;
        const endNode = (node?.endNode as Record<string, unknown>) || null;
        if (startNode) {
          traverseNodes([startNode], markerConfigs, inlineConfigs, blocks, characterColors, effectiveStyle, nextDepth);
        }
        traverseNodes(
          (node?.children as Array<Record<string, unknown>>) || [],
          markerConfigs,
          inlineConfigs,
          blocks,
          characterColors,
          effectiveStyle,
          nextDepth
        );
        if (endNode) {
          traverseNodes([endNode], markerConfigs, inlineConfigs, blocks, characterColors, effectiveStyle, nextDepth);
        }
        return;
      }
      if (type === "layer") {
        const template = String((cfg as any)?.renderer?.template || "");
        const labelInline = Array.isArray(node?.inlineLabel) ? (node.inlineLabel as Array<Record<string, unknown>>) : [];
        const labelText = String(node?.text || node?.label || "");
        if (labelInline.length > 0) {
          const labelRuns = buildRunsFromInlineNodes(labelInline, inlineConfigs, effectiveStyle);
          if (template && labelRuns.length > 0) {
            const contentText = labelRuns.map((r) => r.text).join("");
            const merged = template.replace("{{content}}", contentText);
            blocks.push({ runs: withContinuityPrefix([{ text: merged, ...effectiveStyle }], continuityDepth) });
          } else {
            blocks.push({ runs: withContinuityPrefix(labelRuns, continuityDepth) });
          }
        } else if (labelText) {
          const display = template ? template.replace("{{content}}", labelText) : labelText;
          blocks.push({ runs: withContinuityPrefix([{ text: display, ...effectiveStyle }], continuityDepth) });
        }
      }
      traverseNodes(
        (node?.children as Array<Record<string, unknown>>) || [],
        markerConfigs,
        inlineConfigs,
        blocks,
        characterColors,
        effectiveStyle,
        continuityDepth
      );
      return;
    }
    if (type === "dual_dialogue") {
      traverseNodes((node?.left as Array<Record<string, unknown>>) || [], markerConfigs, inlineConfigs, blocks, characterColors, effectiveStyle, continuityDepth);
      traverseNodes((node?.right as Array<Record<string, unknown>>) || [], markerConfigs, inlineConfigs, blocks, characterColors, effectiveStyle, continuityDepth);
      return;
    }
    if (type === "speech") {
      traverseNodes((node?.children as Array<Record<string, unknown>>) || [], markerConfigs, inlineConfigs, blocks, characterColors, effectiveStyle, continuityDepth);
      return;
    }
    if (type === "blank" || type === "whitespace") {
      blocks.push({ runs: [{ text: "" }] });
      return;
    }
    if (type === "character") {
      const key = normalizeCharacterKey(text);
      if (key && !characterColors.has(key)) {
        characterColors.set(key, CHARACTER_COLOR_SEQUENCE[characterColors.size % CHARACTER_COLOR_SEQUENCE.length]);
      }
      const roleColor = key ? characterColors.get(key) : undefined;
      pushTextLine(blocks, text, mergeStyle({ bold: true }, { ...effectiveStyle, color: roleColor || effectiveStyle.color }), continuityDepth);
      return;
    }
    if (type === "scene_heading") {
      pushTextLine(blocks, text, mergeStyle({ bold: true }, effectiveStyle), continuityDepth);
      return;
    }
    if (type === "action" || type === "dialogue" || type === "parenthetical" || type === "transition" || type === "centered") {
      pushInlineLines(blocks, text, inlineConfigs, effectiveStyle, continuityDepth);
      return;
    }
    if (type === "note") return;
    if (text) pushTextLine(blocks, text, effectiveStyle, continuityDepth);
  });
};

export const buildGoogleDocsBlocksFromScript = (content: string, markerConfigs: MarkerConfig[] = []): GoogleDocsBlock[] => {
  const safeMarkerConfigs = Array.isArray(markerConfigs) ? markerConfigs : [];
  const parsed = parseScreenplay(content || "", safeMarkerConfigs) as { ast?: { children?: Array<Record<string, unknown>> } };
  const nodes = parsed?.ast?.children || [];
  const inlineConfigs = safeMarkerConfigs.filter((cfg) => isInlineLike(cfg));
  const blocks: GoogleDocsBlock[] = [];
  const characterColors = new Map<string, string>();
  traverseNodes(nodes, safeMarkerConfigs, inlineConfigs, blocks, characterColors);
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
