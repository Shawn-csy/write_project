/**
 * screenplayAST.js - 純 Marker 模式
 * 
 * 使用 DirectASTBuilder 直接解析文本，不依賴 fountain-js
 */

import { splitTitleAndBody, extractTitleEntries } from './parsers/titlePageParser.js';
import { DirectASTBuilder } from './importPipeline/directASTBuilder.js';

/**
 * 解析劇本文本
 * @param {string} text - 原始文本
 * @param {Array} markerConfigs - marker 設定
 * @returns {{ titleLines: string, titleEntries: Array, ast: Object, scenes: Array }}
 */
export const parseScreenplay = (text = "", markerConfigs = []) => {
  const { titleLines, bodyText } = splitTitleAndBody(text);
  
  // 使用 DirectASTBuilder 解析（純 Marker 模式）
  const builder = new DirectASTBuilder(markerConfigs);
  const ast = builder.parse(bodyText || '');
  
  // 提取場景列表
  const scenes = ast.children
    .filter(n => n.type === 'scene_heading')
    .map(n => ({ id: n.id, label: n.text }));

  return {
    titleLines,
    titleEntries: extractTitleEntries(titleLines),
    ast,
    scenes
  };
};

// 保留舊的 export 名稱以維持相容性（如果有其他地方使用）
export const buildScriptAST = (tokens, markerConfigs = []) => {
  console.warn('buildScriptAST is deprecated in pure marker mode. Use parseScreenplay instead.');
  return { type: 'root', children: [] };
};
