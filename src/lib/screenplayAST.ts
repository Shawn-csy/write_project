/**
 * screenplayAST.js - 純 Marker 模式
 * 
 * 使用 DirectASTBuilder 直接解析文本，不依賴 fountain-js
 */

import { splitTitleAndBody, extractTitleEntries } from './parsers/titlePageParser';
import { DirectASTBuilder } from './importPipeline/directASTBuilder';
import { defaultMarkerConfigs } from '../constants/defaultMarkerRules';
import { normalizeMarkerConfigsSchema } from './markerThemeCodec';

/**
 * 解析劇本文本
 * @param {string} text - 原始文本
 * @param {import("../hooks/useScriptManager.types").MarkerConfig[]} [markerConfigs] - marker 設定
 * @returns {{
 *   titleLines: string;
 *   titleEntries: import("../hooks/useScriptManager.types").ParsedTitleEntry[];
 *   ast: import("../hooks/useScriptManager.types").ScriptAst;
 *   scenes: import("../hooks/useScriptManager.types").ParsedScene[];
 * }}
 */
export const parseScreenplay = (text = "", markerConfigs?: unknown) => {
  const { titleLines, bodyText, bodyStartLine = 1 } = splitTitleAndBody(text);
  const hasExplicitConfigs = markerConfigs !== undefined && markerConfigs !== null;
  const effectiveConfigs = hasExplicitConfigs
    ? normalizeMarkerConfigsSchema(markerConfigs)
    : normalizeMarkerConfigsSchema(defaultMarkerConfigs);
  
  // 使用 DirectASTBuilder 解析（純 Marker 模式）
  const builder = new DirectASTBuilder(effectiveConfigs);
  const ast = builder.parse(bodyText || '');
  const lineOffset = Math.max(0, bodyStartLine - 1);
  if (lineOffset > 0) {
    applyLineOffset(ast, lineOffset);
  }
  
  // 提取場景列表
  const scenes = (ast.children ?? [])
    .filter(n => n.type === 'scene_heading')
    .map(n => ({ id: String(n.id ?? ""), label: String(n.text ?? "") }));

  return {
    titleLines,
    titleEntries: extractTitleEntries(titleLines),
    ast,
    scenes
  };
};

const applyLineOffset = (node: Record<string, unknown>, offset: number): void => {
  if (!node || typeof node !== 'object') return;

  if (Number.isFinite(node.lineStart)) node.lineStart = (node.lineStart as number) + offset;
  if (Number.isFinite(node.lineEnd)) node.lineEnd = (node.lineEnd as number) + offset;
  if (Number.isFinite(node.endLine)) node.endLine = (node.endLine as number) + offset;

  if (Array.isArray(node.children)) {
    node.children.forEach((child) => applyLineOffset(child as Record<string, unknown>, offset));
  }
  if (Array.isArray(node.left)) {
    node.left.forEach((child) => applyLineOffset(child as Record<string, unknown>, offset));
  }
  if (Array.isArray(node.right)) {
    node.right.forEach((child) => applyLineOffset(child as Record<string, unknown>, offset));
  }
};

// 保留舊的 export 名稱以維持相容性（如果有其他地方使用）
export const buildScriptAST = (tokens: unknown, markerConfigs: unknown[] = []) => {
  console.warn('buildScriptAST is deprecated in pure marker mode. Use parseScreenplay instead.');
  return { type: 'root', children: [] };
};
