/**
 * Ported from src/lib/importPipeline/directASTBuilder.ts
 * Changes: replaced parseInline import from Parsimmon version to engine inlineParser.
 * Class API, method signatures, and AST shape are identical to the original.
 */

import { parseInline } from "./inlineParser";
import { buildFlexiblePattern } from "./inlineParser";
import { isBlockLike, isInlineLike } from "../marker-theme/markerRules";
import { defaultMarkerConfigs } from "../marker-theme/defaultRules";
import { normalizeMarkerConfigsSchema } from "../marker-theme/normalize";
import type { MarkerConfig, AstNode } from "../document/astTypes";

const isBlankLine = (line: string) => line.trim() === "";

interface RangeGroup {
  startSymbol: string;
  endSymbol: string;
  style: Record<string, string> | undefined;
  marker: MarkerConfig;
}

export class DirectASTBuilder {
  configs: MarkerConfig[];
  blockMarkers: MarkerConfig[];
  inlineMarkers: MarkerConfig[];
  rangeGroups: Record<string, RangeGroup>;

  constructor(markerConfigs: MarkerConfig[] = []) {
    this.configs = markerConfigs.map((c) => ({ ...c }));
    this.blockMarkers = this.configs.filter((c) => isBlockLike(c));
    this.inlineMarkers = this.configs.filter((c) => isInlineLike(c));
    this.rangeGroups = {};
    for (const marker of this.configs) {
      if (marker.matchMode === "range" && marker.start && marker.end) {
        this.rangeGroups[marker.id] = {
          startSymbol: marker.start,
          endSymbol: marker.end,
          style: marker.style,
          marker,
        };
      }
    }
  }

  _normalizeWidthAndCase(value: unknown) {
    return String(value ?? "")
      .replace(/[\uFF01-\uFF5E]/g, (char) =>
        String.fromCharCode(char.charCodeAt(0) - 0xfee0)
      )
      .replace(/\u3000/g, " ")
      .toLowerCase();
  }

  parse(text: string): AstNode {
    const lines = text.split("\n");
    const ast: AstNode = { type: "root", children: [] as AstNode[] };
    const rangeDepth = new Map<string, number>();

    const getActiveRanges = () =>
      Array.from(rangeDepth.entries())
        .filter(([, depth]) => depth > 0)
        .map(([groupId]) => groupId);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const node = this._parseLine(line, i);
      if (!node) continue;

      const rangeInfo = this._checkRangeMarker(node, line);

      if (rangeInfo) {
        const currentDepth = rangeDepth.get(rangeInfo.groupId) || 0;
        if (rangeInfo.role === "start") {
          rangeDepth.set(rangeInfo.groupId, currentDepth + 1);
          node.rangeDepth = currentDepth + 1;
        } else if (rangeInfo.role === "end") {
          rangeDepth.set(rangeInfo.groupId, Math.max(0, currentDepth - 1));
          node.rangeDepth = currentDepth;
        } else if (rangeInfo.role === "pause") {
          node.rangeDepth = currentDepth;
        }
      }

      const activeRanges = getActiveRanges();
      if (activeRanges.length > 0 && !rangeInfo) {
        node.inRange = activeRanges;
        node.rangeDepths = {} as Record<string, number>;
        const nodeRangeDepths = node.rangeDepths as Record<string, number>;
        activeRanges.forEach((groupId) => {
          nodeRangeDepths[groupId] = rangeDepth.get(groupId)!;
        });
        const rangeStyles = activeRanges
          .map((groupId) => this.rangeGroups[groupId]?.style)
          .filter(Boolean) as Record<string, string>[];
        if (rangeStyles.length > 0) {
          node.rangeStyle = Object.assign({}, ...rangeStyles);
        }
      }

      (ast.children as AstNode[]).push(node);
    }

    ast.children = this._collapseRanges(ast.children ?? []);
    return ast;
  }

  _collapseRanges(nodes: AstNode[]): AstNode[] {
    const rootChildren: AstNode[] = [];
    const stack: AstNode[] = [];

    const findTopmostOpenRangeIndex = (groupId: string) => {
      for (let idx = stack.length - 1; idx >= 0; idx--) {
        if (stack[idx].rangeGroupId === groupId) return idx;
      }
      return -1;
    };

    for (const node of nodes) {
      const parent = stack.length > 0 ? stack[stack.length - 1] : null;

      if (node.type === "layer" && node.rangeRole === "pause") {
        const groupId = node.rangeGroupId as string;
        const openIndex = findTopmostOpenRangeIndex(groupId);
        if (openIndex !== -1) {
          (stack[openIndex].children as AstNode[]).push(node);
        } else if (parent) {
          (parent.children as AstNode[]).push(node);
        } else {
          rootChildren.push(node);
        }
        continue;
      }

      if (node.type === "layer" && node.rangeRole === "start") {
        const rangeNode: AstNode = {
          type: "range",
          layerType: node.layerType,
          rangeGroupId: node.rangeGroupId,
          startNode: node,
          endNode: null,
          children: [] as AstNode[],
          style: node.style,
          rangeDepth: stack.length + 1,
        };
        if (parent) {
          (parent.children as AstNode[]).push(rangeNode);
        } else {
          rootChildren.push(rangeNode);
        }
        stack.push(rangeNode);
        continue;
      }

      if (node.type === "layer" && node.rangeRole === "end") {
        if (parent && parent.rangeGroupId === node.rangeGroupId) {
          parent.endNode = node;
          stack.pop();
        } else if (parent) {
          (parent.children as AstNode[]).push(node);
        } else {
          rootChildren.push(node);
        }
        continue;
      }

      if (parent) {
        (parent.children as AstNode[]).push(node);
      } else {
        rootChildren.push(node);
      }
    }

    return rootChildren;
  }

  _checkRangeMarker(node: AstNode, line: string) {
    if (node.rangeGroupId && node.rangeRole) {
      return { groupId: node.rangeGroupId, role: node.rangeRole };
    }
    const trimmed = line.trim();
    for (const [groupId, group] of Object.entries(this.rangeGroups)) {
      const caseInsensitive = Boolean(group?.marker?.caseInsensitive);
      if (group.startSymbol && this._startsWithToken(trimmed, group.startSymbol, caseInsensitive)) {
        return { groupId, role: "start" };
      }
      if (group.endSymbol && this._startsWithToken(trimmed, group.endSymbol, caseInsensitive)) {
        return { groupId, role: "end" };
      }
    }
    return null;
  }

  _parseLine(line: string, lineNumber: number): AstNode | null {
    const trimmed = line.trim();

    if (isBlankLine(line)) {
      return { type: "blank", lineStart: lineNumber + 1, lineEnd: lineNumber + 1, raw: line };
    }

    const markerNode = this._matchBlockMarker(trimmed, lineNumber);
    if (markerNode) return markerNode;

    return {
      type: "action",
      text: trimmed,
      inline: this._parseInlineContent(trimmed),
      lineStart: lineNumber + 1,
      lineEnd: lineNumber + 1,
      raw: line,
    };
  }

  _matchBlockMarker(line: string, lineNumber: number): AstNode | null {
    const sortedMarkers = [...this.blockMarkers].sort((a, b) => {
      const pA = Number.isFinite(a?.priority) ? (a.priority ?? 0) : 0;
      const pB = Number.isFinite(b?.priority) ? (b.priority ?? 0) : 0;
      if (pA !== pB) return pB - pA;
      return (b.start?.length || 0) - (a.start?.length || 0);
    });

    for (const marker of sortedMarkers) {
      if (marker.matchMode !== "regex" && !marker.start) continue;
      const caseInsensitive = Boolean(marker.caseInsensitive);
      const startToken = marker.start || "";
      const fullStart = startToken ? this._toFullWidthToken(startToken) : "";
      const fullEnd = marker.end ? this._toFullWidthToken(marker.end) : null;

      const matchedStart = startToken ? this._matchLeadingToken(line, startToken, caseInsensitive) : null;
      const matchedFullStart = fullStart ? this._matchLeadingToken(line, fullStart, caseInsensitive) : null;
      const matchedStartToken = matchedStart || matchedFullStart;

      if (marker.matchMode === "range") {
        if (marker.end) {
          const matchedEnd = this._matchLeadingToken(line, marker.end, caseInsensitive);
          const matchedFullEnd = fullEnd ? this._matchLeadingToken(line, fullEnd, caseInsensitive) : null;
          const matchedEndToken = matchedEnd || matchedFullEnd;
          if (matchedEndToken) {
            const content = line.slice(matchedEndToken.length).trim();
            return {
              type: "layer",
              rangeGroupId: marker.rangeGroupId || marker.id,
              rangeRole: "end",
              layerType: marker.id,
              text: content,
              label: marker.label,
              inline: this._parseInlineContent(content),
              inlineLabel: this._parseInlineContent(content),
              lineStart: lineNumber + 1,
              lineEnd: lineNumber + 1,
              raw: line,
              style: marker.style,
              children: [],
            };
          }
        }

        if (marker.pause) {
          const pauseToken = String(marker.pause);
          const fullPause = this._toFullWidthToken(pauseToken);
          const matchedPause = this._matchLeadingToken(line, pauseToken, caseInsensitive);
          const matchedFullPause = this._matchLeadingToken(line, fullPause, caseInsensitive);
          const matchedPauseToken = matchedPause || matchedFullPause;
          if (matchedPauseToken) {
            const content = line.slice(matchedPauseToken.length).trim();
            return {
              type: "layer",
              layerType: marker.id,
              rangeGroupId: marker.rangeGroupId || marker.id,
              rangeRole: "pause",
              text: content,
              label: marker.pauseLabel ?? "暫停",
              inline: this._parseInlineContent(content),
              inlineLabel: this._parseInlineContent(content),
              lineStart: lineNumber + 1,
              lineEnd: lineNumber + 1,
              raw: line,
              style: marker.style,
              children: [],
            };
          }
        }

        if (matchedStartToken) {
          const content = line.slice(matchedStartToken.length).trim();
          return {
            type: "layer",
            layerType: marker.id,
            rangeGroupId: marker.rangeGroupId || marker.id,
            rangeRole: (marker.rangeRole as "start" | "end" | "pause") || "start",
            text: content,
            label: marker.label,
            inline: this._parseInlineContent(content),
            inlineLabel: this._parseInlineContent(content),
            lineStart: lineNumber + 1,
            lineEnd: lineNumber + 1,
            raw: line,
            style: marker.style,
            children: [],
          };
        }
        continue;
      }

      if (marker.matchMode === "regex" && marker.regex) {
        const regex = this._toRegex(marker.regex);
        const match = regex ? line.match(regex) : null;
        if (!match) continue;
        const full = String(match[0] || line).trim();
        const parsed = this._buildParsedNode(marker, full, line, lineNumber, match);
        if (parsed) return parsed;
        return this._buildLayerNode(marker, full, line, lineNumber);
      }

      if (marker.matchMode === "prefix" && matchedStartToken) {
        const content = line.slice(matchedStartToken.length).trim();
        const parsed = this._buildParsedNode(marker, content, line, lineNumber, null);
        if (parsed) return parsed;
        return this._buildLayerNode(marker, content, line, lineNumber);
      }

      if (marker.matchMode === "enclosure" && matchedStartToken) {
        const endsWithNormal = marker.end ? this._endsWithToken(line, marker.end, caseInsensitive) : true;
        const endsWithFull = marker.end && fullEnd ? this._endsWithToken(line, fullEnd, caseInsensitive) : false;
        const matchedEnd = endsWithNormal ? marker.end : endsWithFull ? fullEnd : null;
        if (matchedEnd || !marker.end) {
          let content = line.slice(matchedStartToken.length);
          if (matchedEnd) content = content.slice(0, -matchedEnd.length);
          content = content.trim();
          const parsed = this._buildParsedNode(marker, content, line, lineNumber, null);
          if (parsed) return parsed;
          return this._buildLayerNode(marker, content, line, lineNumber);
        }
      }
    }

    return null;
  }

  _toFullWidthToken(token: string): string {
    // Build a flexible pattern then extract a single fullwidth representation.
    // For directASTBuilder matching purposes we need an actual string, not a regex.
    // Use the same logic as the original: replace ASCII punct/letters to fullwidth.
    return token.replace(/[\x21-\x7E]/g, (c) => {
      const code = c.charCodeAt(0);
      return String.fromCharCode(code + 0xfee0);
    });
  }

  _startsWithToken(text: string, token: string, _caseInsensitive = false): boolean {
    if (!token) return false;
    return this._normalizeWidthAndCase(text.slice(0, token.length)) === this._normalizeWidthAndCase(token);
  }

  _endsWithToken(text: string, token: string, _caseInsensitive = false): boolean {
    if (!token) return false;
    return this._normalizeWidthAndCase(text.slice(-token.length)) === this._normalizeWidthAndCase(token);
  }

  _matchLeadingToken(text: string, token: string, _caseInsensitive = false): string | null {
    if (!token) return null;
    const head = String(text).slice(0, token.length);
    return this._normalizeWidthAndCase(head) === this._normalizeWidthAndCase(token) ? head : null;
  }

  _toRegex(pattern: unknown): RegExp | null {
    if (!pattern) return null;
    if (pattern instanceof RegExp) return pattern;
    const raw = String(pattern).trim();
    if (!raw) return null;
    const literal = raw.match(/^\/([\s\S]*)\/([a-z]*)$/i);
    if (literal) {
      try { return new RegExp(literal[1], literal[2]); } catch { return null; }
    }
    try { return new RegExp(raw); } catch { return null; }
  }

  _resolveMapField(
    template: unknown,
    content: string,
    match: RegExpMatchArray | null,
    fallback = ""
  ): string {
    if (template === undefined || template === null || template === "") return fallback;
    const raw = String(template);
    if (raw === "$text") return content;
    const idxMatch = raw.match(/^\$(\d+)$/);
    if (idxMatch) {
      const idx = Number.parseInt(idxMatch[1], 10);
      const captured = match?.[idx];
      return captured === undefined || captured === null ? fallback : String(captured).trim();
    }
    return raw;
  }

  _applyMappedCast(value: unknown, castType: unknown): unknown {
    if (!castType) return value;
    if (Array.isArray(castType)) {
      return castType.reduce((acc, item) => this._applyMappedCast(acc, item), value);
    }
    let castSpec = castType;
    if (typeof castType === "string") {
      if (castType.startsWith("split:")) {
        castSpec = { type: "split", separator: castType.slice("split:".length) };
      } else {
        castSpec = { type: castType };
      }
    }
    if (!castSpec || typeof castSpec !== "object") return value;
    const cs = castSpec as { type?: unknown; separator?: unknown; sep?: unknown; trim?: unknown; filterEmpty?: unknown };
    const cast = String(cs.type || "").trim().toLowerCase();
    if (!cast) return value;
    if (cast === "int") {
      const parsed = Number.parseInt(String(value), 10);
      return Number.isNaN(parsed) ? value : parsed;
    }
    if (cast === "float") {
      const parsed = Number.parseFloat(String(value));
      return Number.isNaN(parsed) ? value : parsed;
    }
    if (cast === "trim") return String(value).trim();
    if (cast === "trim_colon_suffix") return String(value).replace(/[：:]\s*$/, "").trim();
    if (cast === "bool") {
      if (typeof value === "boolean") return value;
      const norm = String(value).trim().toLowerCase();
      if (["true", "1", "yes", "y", "on", "是", "好", "可", "需要"].includes(norm)) return true;
      if (["false", "0", "no", "n", "off", "否", "不", "不可", "不需要"].includes(norm)) return false;
      return value;
    }
    if (cast === "split") {
      if (Array.isArray(value)) return value;
      const text = value === null || value === undefined ? "" : String(value);
      const separator = cs.separator ?? cs.sep ?? null;
      const trimItems = cs.trim !== false;
      const filterEmpty = cs.filterEmpty !== false;
      let items = typeof separator === "string" && separator.length > 0
        ? text.split(separator)
        : text.split(/[,\n，]/);
      if (trimItems) items = items.map((item) => String(item).trim());
      if (filterEmpty) items = items.filter(Boolean);
      return items;
    }
    return value;
  }

  _buildParsedNode(
    marker: MarkerConfig & { parseAs?: string; mapFields?: Record<string, unknown>; mapCasts?: Record<string, unknown> },
    content: string,
    rawLine: string,
    lineNumber: number,
    match: RegExpMatchArray | null
  ): AstNode | null {
    if (!marker?.parseAs) return null;
    const node: AstNode = {
      type: marker.parseAs,
      markerType: marker.type,
      markerId: marker.id,
      lineStart: lineNumber + 1,
      lineEnd: lineNumber + 1,
      raw: rawLine,
    };
    const mapFields = marker.mapFields || {};
    const mapCasts = marker.mapCasts || {};
    const mappedText = this._resolveMapField(mapFields.text, content, match, content);
    node.text = String(this._applyMappedCast(mappedText, mapCasts.text) ?? "");
    Object.entries(mapFields).forEach(([key, tpl]) => {
      if (key === "text") return;
      const rawValue = this._resolveMapField(tpl, content, match, "");
      node[key] = this._applyMappedCast(rawValue, mapCasts[key]);
    });
    if (node.type === "scene_heading") {
      const idSource = node.text || content || rawLine;
      node.id = this._slugify(String(idSource));
    }
    return node;
  }

  _buildLayerNode(marker: MarkerConfig, content: string, rawLine: string, lineNumber: number): AstNode {
    return {
      type: "layer",
      layerType: marker.id,
      markerType: marker.type,
      text: content,
      label: marker.label,
      inline: this._parseInlineContent(content),
      inlineLabel: this._parseInlineContent(content),
      lineStart: lineNumber + 1,
      lineEnd: lineNumber + 1,
      raw: rawLine,
      style: marker.style,
      children: [],
    };
  }

  _parseInlineContent(text: string) {
    if (!text) return [];
    return parseInline(text, this.inlineMarkers);
  }

  _slugify(text = ""): string {
    return (
      text
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-") || "scene"
    );
  }
}

export const buildAST = (text: string, markerConfigs?: unknown): AstNode => {
  const hasExplicitConfigs = markerConfigs !== undefined && markerConfigs !== null;
  const effectiveConfigs = hasExplicitConfigs
    ? normalizeMarkerConfigsSchema(markerConfigs)
    : normalizeMarkerConfigsSchema(defaultMarkerConfigs);
  const builder = new DirectASTBuilder(effectiveConfigs);
  return builder.parse(text);
};
