/**
 * Stage 3: DirectASTBuilder
 * 
 * 職責：
 * - 繞過 Fountain.js，直接從清洗後的文本建構 AST
 * - 利用已確認的 markerConfigs 進行解析
 * - 整合現有的 parseInline 邏輯
 */

import { parseInline } from '../parsers/inlineParser.js';
import { toFullWidth } from '../parsers/parserGenerators.js';
import { isBlockLike, isInlineLike } from '../markerRules.js';
import { defaultMarkerConfigs } from '../../constants/defaultMarkerRules.js';
import { normalizeMarkerConfigsSchema } from '../markerThemeCodec.js';

// ... (skip lines)


import { isBlankLine } from './constants.js';

/**
 * AST 節點類型 (純 Marker 模式)
 * @typedef {'root'|'scene_heading'|'action'|'layer'|'blank'|'character'|'dialogue'|'parenthetical'|'range'} NodeType
 */

/**
 * AST 節點
 * @typedef {Object} ASTNode
 * @property {NodeType} type - 節點類型
 * @property {string} [text] - 文本內容
 * @property {Array} [inline] - 行內解析結果
 * @property {number} lineStart - 起始行號
 * @property {number} [lineEnd] - 結束行號
 * @property {string} raw - 原始文本
 */

export class DirectASTBuilder {
  constructor(markerConfigs = []) {
    this.configs = markerConfigs.map((c) => ({ ...c }));
    
    // 分離 block 和 inline markers（共用規則）
    this.blockMarkers = this.configs.filter((c) => isBlockLike(c));
    this.inlineMarkers = this.configs.filter((c) => isInlineLike(c));
    
    // 建立 range markers 對照表
    // 格式：matchMode='range' + start + end，使用 marker.id 作為 groupId
    this.rangeGroups = {};
    for (const marker of this.configs) {
      if (marker.matchMode === 'range' && marker.start && marker.end) {
        this.rangeGroups[marker.id] = {
          startSymbol: marker.start,
          endSymbol: marker.end,
          style: marker.style,
          marker: marker
        };
      }
    }
  }

  _normalizeWidthAndCase(value) {
    // Fold fullwidth ASCII symbols/letters/numbers to halfwidth, then lowercase.
    return String(value ?? "")
      .replace(/[\uFF01-\uFF5E]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xFEE0))
      .replace(/\u3000/g, " ")
      .toLowerCase();
  }

  /**
   * 從文本建構 AST
   * @param {string} text - 清洗後的文本
   * @returns {ASTNode} 根節點
   */
  parse(text) {
    const lines = text.split('\n');
    const ast = { 
      type: 'root', 
      children: []
    };
    
    // Range 區間狀態追蹤
    // 使用 Map<groupId, depth> 支援巢狀區間
    const rangeDepth = new Map();
    
    // 取得當前活躍的區間列表（深度 > 0）
    const getActiveRanges = () => {
      return Array.from(rangeDepth.entries())
        .filter(([, depth]) => depth > 0)
        .map(([groupId]) => groupId);
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const node = this._parseLine(line, i);
      
      if (node) {
        // 檢查是否為 range 開始/結束標記
        const rangeInfo = this._checkRangeMarker(node, line);
        
        if (rangeInfo) {
          const currentDepth = rangeDepth.get(rangeInfo.groupId) || 0;
          
          if (rangeInfo.role === 'start') {
            // 開始標記：深度 +1
            rangeDepth.set(rangeInfo.groupId, currentDepth + 1);
            node.rangeDepth = currentDepth + 1;
          } else if (rangeInfo.role === 'end') {
            // 結束標記：深度 -1
            rangeDepth.set(rangeInfo.groupId, Math.max(0, currentDepth - 1));
            node.rangeDepth = currentDepth; // 結束時的深度是關閉前的深度
          } else if (rangeInfo.role === 'pause') {
            // Pause 只影響單行，不改變區間深度
            node.rangeDepth = currentDepth;
          }
        }
        
        // 標記節點所屬的區間（不包含開始/結束標記本身）
        const activeRanges = getActiveRanges();
        if (activeRanges.length > 0 && !rangeInfo) {
          node.inRange = activeRanges;
          // 記錄每個區間的當前深度
          node.rangeDepths = {};
          activeRanges.forEach(groupId => {
            node.rangeDepths[groupId] = rangeDepth.get(groupId);
          });
          // 取得區間樣式
          const rangeStyles = node.inRange
            .map(groupId => this.rangeGroups[groupId]?.style)
            .filter(Boolean);
          if (rangeStyles.length > 0) {
            node.rangeStyle = Object.assign({}, ...rangeStyles);
          }
        }
        
        ast.children.push(node);
      }
    }
    
    // 將扁平的 range 標記轉換為巢狀結構
    ast.children = this._collapseRanges(ast.children);
    
    return ast;
  }

  /**
   * 將扁平的 range 標記轉換為巢狀結構
   * @private
   */
  _collapseRanges(nodes) {
    const rootChildren = [];
    // 堆疊：儲存當前開啟的 range 節點
    const stack = [];
    const findTopmostOpenRangeIndex = (groupId) => {
      for (let idx = stack.length - 1; idx >= 0; idx--) {
        if (stack[idx].rangeGroupId === groupId) return idx;
      }
      return -1;
    };
    
    for (const node of nodes) {
      const parent = stack.length > 0 ? stack[stack.length - 1] : null;
      
      // 0. 處理 Range 暫停 (Pause) -> Toggle (Close if open, Open if closed)
      if (node.type === 'layer' && node.rangeRole === 'pause') {
          const groupId = node.rangeGroupId;
          const openIndex = findTopmostOpenRangeIndex(groupId);
          if (openIndex !== -1) {
              // Pause 是 range 內單行控制點，不切斷區間
              stack[openIndex].children.push(node);
          } else if (parent) {
              parent.children.push(node);
          } else {
              rootChildren.push(node);
          }
          continue;
      }

      // 1. 處理 Range 開始標記
      if (node.type === 'layer' && node.rangeRole === 'start') {
        const rangeNode = {
          type: 'range',
          layerType: node.layerType, // rangeGroupId
          rangeGroupId: node.rangeGroupId,
          startNode: node,
          endNode: null, // 尚未遇到結束標記
          children: [],
          style: node.style,
          rangeDepth: stack.length + 1 // 記錄深度
        };
        
        // 加入父節點或根列表
        if (parent) {
          parent.children.push(rangeNode);
        } else {
          rootChildren.push(rangeNode);
        }
        
        // 推入堆疊，成為新的父節點
        stack.push(rangeNode);
        continue;
      }
      
      // 2. 處理 Range 結束標記
      if (node.type === 'layer' && node.rangeRole === 'end') {
        if (parent && parent.rangeGroupId === node.rangeGroupId) {
          // 匹配當前區間：設定結束節點並彈出堆疊
          parent.endNode = node;
          stack.pop();
        } else {
          // 不匹配（可能是交錯或孤立的結束標記），視為普通節點處理
          if (parent) {
            parent.children.push(node);
          } else {
            rootChildren.push(node);
          }
        }
        continue;
      }
      
      // 3. 普通內容節點
      if (parent) {
        parent.children.push(node);
      } else {
        rootChildren.push(node);
      }
    }
    
    // 如果堆疊不為空（有未關閉的 range），它們會保留在 AST 中，但 endNode 為 null
    
    return rootChildren;
  }

  /**
   * 檢查是否為 range 標記
   * @private
   */
  _checkRangeMarker(node, line) {
    // 1. 優先檢查節點本身是否已經識別出 range 屬性 (由 _matchBlockMarker 解析)
    if (node.rangeGroupId && node.rangeRole) {
      return { 
        groupId: node.rangeGroupId, 
        role: node.rangeRole 
      };
    }

    const trimmed = line.trim();
    
    for (const [groupId, group] of Object.entries(this.rangeGroups)) {
      const caseInsensitive = Boolean(group?.marker?.caseInsensitive);
      // 新格式：使用 startSymbol 和 endSymbol
      if (group.startSymbol && this._startsWithToken(trimmed, group.startSymbol, caseInsensitive)) {
        return { groupId, role: 'start' };
      }
      if (group.endSymbol && this._startsWithToken(trimmed, group.endSymbol, caseInsensitive)) {
        return { groupId, role: 'end' };
      }
    }
    return null;
  }

  /**
   * 解析單行
   * @private
   */
  _parseLine(line, lineNumber) {
    const trimmed = line.trim();
    
    // 空行處理
    if (isBlankLine(line)) {
      return { 
        type: 'blank', 
        lineStart: lineNumber + 1,
        lineEnd: lineNumber + 1,
        raw: line
      };
    }
    
    // 1. 匹配 block markers（包含 prefix / range / regex）
    const markerNode = this._matchBlockMarker(trimmed, lineNumber);
    if (markerNode) {
      return markerNode;
    }
    
    // 2. 預設：所有未匹配的內容都是 action（動作/描述）
    return {
      type: 'action',
      text: trimmed,
      inline: this._parseInlineContent(trimmed),
      lineStart: lineNumber + 1,
      lineEnd: lineNumber + 1,
      raw: line
    };
  }

  /**
   * 嘗試將當前行匹配為任意類型的 Block Marker
   * @private
   */
  _matchBlockMarker(line, lineNumber) {
    const sortedMarkers = [...this.blockMarkers].sort(
      (a, b) => {
        const pA = Number.isFinite(a?.priority) ? a.priority : 0;
        const pB = Number.isFinite(b?.priority) ? b.priority : 0;
        if (pA !== pB) return pB - pA;
        return (b.start?.length || 0) - (a.start?.length || 0);
      }
    );

    for (const marker of sortedMarkers) {
      if (marker.matchMode !== 'regex' && !marker.start) continue;
      const caseInsensitive = Boolean(marker.caseInsensitive);

      const startToken = marker.start || '';
      const fullStart = startToken ? toFullWidth(startToken) : '';
      const fullEnd = marker.end ? toFullWidth(marker.end) : null;
      
      const matchedStart = startToken ? this._matchLeadingToken(line, startToken, caseInsensitive) : null;
      const matchedFullStart = fullStart ? this._matchLeadingToken(line, fullStart, caseInsensitive) : null;
      const matchedStartToken = matchedStart || matchedFullStart;

      if (marker.matchMode === 'range') {
         // 先檢查結束符號 (End Check)
         if (marker.end) {
             const matchedEnd = this._matchLeadingToken(line, marker.end, caseInsensitive); // 注意：Range End 是獨佔一行，所以也是 startsWith
             const matchedFullEnd = fullEnd ? this._matchLeadingToken(line, fullEnd, caseInsensitive) : null;
             const matchedEndToken = matchedEnd || matchedFullEnd;

             if (matchedEndToken) {
                 const content = line.slice(matchedEndToken.length).trim();
                 return {
                     type: 'layer',
                     rangeGroupId: marker.rangeGroupId || marker.id,
                     rangeRole: 'end',
                     layerType: marker.id,
                     // ... properties
                     text: content,
                     label: marker.label,
                     inline: this._parseInlineContent(content),
                     inlineLabel: this._parseInlineContent(content),
                     lineStart: lineNumber + 1,
                     lineEnd: lineNumber + 1,
                     raw: line,
                     style: marker.style,
                     children: [] 
                 };
             }
         }
          
          // Pause Check
          if (marker.pause) {
             const fullPause = toFullWidth(marker.pause);
             const matchedPause = this._matchLeadingToken(line, marker.pause, caseInsensitive);
             const matchedFullPause = this._matchLeadingToken(line, fullPause, caseInsensitive);
             const matchedPauseToken = matchedPause || matchedFullPause;

             if (matchedPauseToken) {
                 const content = line.slice(matchedPauseToken.length).trim();
                 return {
                     type: 'layer',
                     layerType: marker.id,
                     rangeGroupId: marker.rangeGroupId || marker.id,
                     rangeRole: 'pause',
                     text: content,
                     label: marker.pauseLabel ?? '暫停',
                     inline: this._parseInlineContent(content),
                     inlineLabel: this._parseInlineContent(content),
                     lineStart: lineNumber + 1,
                     lineEnd: lineNumber + 1,
                     raw: line,
                     style: marker.style,
                     children: []
                 };
             }
          }
          
          // Start Check (using matchedStart computed above)
         if (matchedStartToken) {
             const content = line.slice(matchedStartToken.length).trim();
             return {
                 type: 'layer',
                 layerType: marker.id,
                 rangeGroupId: marker.rangeGroupId || marker.id,
                 rangeRole: marker.rangeRole || 'start',
                 // ... properties
                 text: content,
                 label: marker.label,
                 inline: this._parseInlineContent(content),
                 inlineLabel: this._parseInlineContent(content),
                 lineStart: lineNumber + 1,
                 lineEnd: lineNumber + 1,
                 raw: line,
                 style: marker.style,
                 children: []
             };
         }
         continue;
      }

      // regex 模式（Block）
      if (marker.matchMode === 'regex' && marker.regex) {
        const regex = this._toRegex(marker.regex);
        const match = regex ? line.match(regex) : null;
        if (!match) continue;

        const full = String(match[0] || line).trim();
        const parsed = this._buildParsedNode(marker, full, line, lineNumber, match);
        if (parsed) return parsed;
        return this._buildLayerNode(marker, full, line, lineNumber);
      }
      
      // prefix 模式
      if (marker.matchMode === 'prefix' && matchedStartToken) {
        const content = line.slice(matchedStartToken.length).trim();
        const parsed = this._buildParsedNode(marker, content, line, lineNumber, null);
        if (parsed) return parsed;
        return this._buildLayerNode(marker, content, line, lineNumber);
      }

      // enclosure 模式 (Block Enclosure - 單行)
      if (marker.matchMode === 'enclosure' && matchedStartToken) {
          // Check End
          const endsWithNormal = marker.end ? this._endsWithToken(line, marker.end, caseInsensitive) : true;
          const endsWithFull = (marker.end && fullEnd) ? this._endsWithToken(line, fullEnd, caseInsensitive) : false;
          const matchedEnd = endsWithNormal ? marker.end : (endsWithFull ? fullEnd : null);
          
          if (matchedEnd || !marker.end) {
              let content = line.slice(matchedStartToken.length);
              if (matchedEnd) {
                  content = content.slice(0, -matchedEnd.length);
              }
              content = content.trim();

              const parsed = this._buildParsedNode(marker, content, line, lineNumber, null);
              if (parsed) return parsed;
              return this._buildLayerNode(marker, content, line, lineNumber);
          }
      }
    }
    
    return null;
  }

  _startsWithToken(text, token, caseInsensitive = false) {
    if (!token) return false;
    const head = String(text).slice(0, token.length);
    return this._normalizeWidthAndCase(head) === this._normalizeWidthAndCase(token);
  }

  _endsWithToken(text, token, caseInsensitive = false) {
    if (!token) return false;
    const tail = String(text).slice(-token.length);
    return this._normalizeWidthAndCase(tail) === this._normalizeWidthAndCase(token);
  }

  _matchLeadingToken(text, token, caseInsensitive = false) {
    if (!token) return null;
    const head = String(text).slice(0, token.length);
    return this._normalizeWidthAndCase(head) === this._normalizeWidthAndCase(token) ? head : null;
  }

  _toRegex(pattern) {
    if (!pattern) return null;
    if (pattern instanceof RegExp) return pattern;
    const raw = String(pattern).trim();
    if (!raw) return null;
    // Support literal forms like `/^\\d+\\.\\s+(.+)$/i` from user-entered configs.
    const literal = raw.match(/^\/([\s\S]*)\/([a-z]*)$/i);
    if (literal) {
      try {
        return new RegExp(literal[1], literal[2]);
      } catch {
        return null;
      }
    }
    try {
      return new RegExp(raw);
    } catch {
      return null;
    }
  }

  _resolveMapField(template, content, match, fallback = '') {
    if (template === undefined || template === null || template === '') return fallback;
    const raw = String(template);
    if (raw === '$text') return content;
    const idxMatch = raw.match(/^\$(\d+)$/);
    if (idxMatch) {
      const idx = Number.parseInt(idxMatch[1], 10);
      const captured = match?.[idx];
      return captured === undefined || captured === null ? fallback : String(captured).trim();
    }
    return raw;
  }

  _applyMappedCast(value, castType) {
    if (!castType) return value;
    if (Array.isArray(castType)) {
      return castType.reduce((acc, item) => this._applyMappedCast(acc, item), value);
    }

    let castSpec = castType;
    if (typeof castType === 'string') {
      if (castType.startsWith('split:')) {
        castSpec = { type: 'split', separator: castType.slice('split:'.length) };
      } else {
        castSpec = { type: castType };
      }
    }
    if (!castSpec || typeof castSpec !== 'object') return value;

    const cast = String(castSpec.type || '').trim().toLowerCase();
    if (!cast) return value;

    if (cast === 'int') {
      const parsed = Number.parseInt(String(value), 10);
      return Number.isNaN(parsed) ? value : parsed;
    }
    if (cast === 'float') {
      const parsed = Number.parseFloat(String(value));
      return Number.isNaN(parsed) ? value : parsed;
    }
    if (cast === 'trim') {
      return String(value).trim();
    }
    if (cast === 'trim_colon_suffix') {
      return String(value).replace(/[：:]\s*$/, '').trim();
    }
    if (cast === 'bool') {
      if (typeof value === 'boolean') return value;
      const norm = String(value).trim().toLowerCase();
      if (['true', '1', 'yes', 'y', 'on', '是', '好', '可', '需要'].includes(norm)) return true;
      if (['false', '0', 'no', 'n', 'off', '否', '不', '不可', '不需要'].includes(norm)) return false;
      return value;
    }
    if (cast === 'split') {
      if (Array.isArray(value)) return value;
      const text = value === null || value === undefined ? '' : String(value);
      const separator = castSpec.separator ?? castSpec.sep ?? null;
      const trimItems = castSpec.trim !== false;
      const filterEmpty = castSpec.filterEmpty !== false;
      let items;
      if (typeof separator === 'string' && separator.length > 0) {
        items = text.split(separator);
      } else {
        items = text.split(/[,\n，]/);
      }
      if (trimItems) items = items.map((item) => String(item).trim());
      if (filterEmpty) items = items.filter(Boolean);
      return items;
    }

    return value;
  }

  _buildParsedNode(marker, content, rawLine, lineNumber, match) {
    if (!marker?.parseAs) return null;
    const node = {
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
    node.text = this._applyMappedCast(mappedText, mapCasts.text);

    Object.entries(mapFields).forEach(([key, tpl]) => {
      if (key === 'text') return;
      const rawValue = this._resolveMapField(tpl, content, match, '');
      node[key] = this._applyMappedCast(rawValue, mapCasts[key]);
    });

    // Scene heading nodes need a stable id for TOC navigation.
    if (node.type === 'scene_heading') {
      const idSource = node.text || content || rawLine;
      node.id = this._slugify(String(idSource));
    }
    return node;
  }

  _buildLayerNode(marker, content, rawLine, lineNumber) {
    return {
      type: 'layer',
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
      children: []
    };
  }


  /**
   * 解析行內內容
   * @private
   */
  _parseInlineContent(text) {
    if (!text) return [];
    return parseInline(text, this.inlineMarkers);
  }

  /**
   * 生成 URL-friendly 的 ID
   * @private
   */
  _slugify(text = '') {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-') || 'scene';
  }
}

/**
 * 快速建構 AST 函數
 * @param {string} text - 清洗後的文本
 * @param {Array} markerConfigs - marker 設定
 * @returns {ASTNode} AST 根節點
 */
export const buildAST = (text, markerConfigs) => {
  const hasExplicitConfigs = markerConfigs !== undefined && markerConfigs !== null;
  const effectiveConfigs = hasExplicitConfigs
    ? normalizeMarkerConfigsSchema(markerConfigs)
    : normalizeMarkerConfigsSchema(defaultMarkerConfigs);
  const builder = new DirectASTBuilder(effectiveConfigs);
  return builder.parse(text);
};
