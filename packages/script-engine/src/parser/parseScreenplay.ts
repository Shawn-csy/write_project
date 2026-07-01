/**
 * Top-level screenplay parse function.
 * Mirrors src/lib/screenplayAST.ts parseScreenplay() — same return shape.
 */

import { splitTitleAndBody, extractTitleEntries } from "./titlePageParser";
import { DirectASTBuilder } from "./directASTBuilder";
import { defaultMarkerConfigs } from "../marker-theme/defaultRules";
import { normalizeMarkerConfigsSchema } from "../marker-theme/normalize";
import { extractToc } from "../document/toc";
import type { AstNode, TitleEntry, ScriptDocument } from "../document/astTypes";

const applyLineOffset = (node: Record<string, unknown>, offset: number, visited = new Set<unknown>()): void => {
  if (!node || typeof node !== "object") return;
  if (visited.has(node)) return;
  visited.add(node);
  if (Number.isFinite(node.lineStart)) node.lineStart = (node.lineStart as number) + offset;
  if (Number.isFinite(node.lineEnd)) node.lineEnd = (node.lineEnd as number) + offset;
  if (Number.isFinite(node.endLine)) node.endLine = (node.endLine as number) + offset;
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => applyLineOffset(child as Record<string, unknown>, offset, visited));
  }
  if (node.startNode && typeof node.startNode === "object") {
    applyLineOffset(node.startNode as Record<string, unknown>, offset, visited);
  }
  if (node.endNode && typeof node.endNode === "object") {
    applyLineOffset(node.endNode as Record<string, unknown>, offset, visited);
  }
};

/**
 * Parse screenplay text with given marker configs.
 * Returns a ScriptDocument — superset of what the old Vite screenplayAST returned.
 *
 * Backward compat: the old return shape { titleLines, titleEntries, ast, scenes }
 * is fully present in ScriptDocument.
 */
export const parseScreenplay = (
  text = "",
  markerConfigs?: unknown
): ScriptDocument => {
  const { titleLines, bodyText, bodyStartLine = 1 } = splitTitleAndBody(text);
  const hasExplicitConfigs = markerConfigs !== undefined && markerConfigs !== null;
  const effectiveConfigs = hasExplicitConfigs
    ? normalizeMarkerConfigsSchema(markerConfigs)
    : normalizeMarkerConfigsSchema(defaultMarkerConfigs);

  const builder = new DirectASTBuilder(effectiveConfigs);
  const ast = builder.parse(bodyText || "");

  const lineOffset = Math.max(0, bodyStartLine - 1);
  if (lineOffset > 0) {
    applyLineOffset(ast as unknown as Record<string, unknown>, lineOffset);
  }

  const toc = extractToc(ast);
  const scenes = toc.map((e) => ({ id: e.id, label: e.label }));
  const titleEntries: TitleEntry[] = extractTitleEntries(titleLines);
  const markersUsed = builder.getMarkersUsed().map(({ markerId, count }) => ({ markerId, count }));

  return {
    titlePage: titleLines,
    titleEntries,
    ast,
    toc,
    scenes,
    markersUsed,
  };
};
