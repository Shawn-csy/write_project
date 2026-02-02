/**
 * Stage 3: DirectASTBuilder
 * 
 * 職責：
 * - 繞過 Fountain.js，直接從清洗後的文本建構 AST
 * - 利用已確認的 markerConfigs 進行解析
 * - 整合現有的 parseInline 邏輯
 */

import { parseInline } from '../parsers/inlineParser.js';
import { 
  CHAPTER_PATTERNS, 
  isBlankLine 
} from './constants.js';

/**
 * AST 節點類型 (純 Marker 模式)
 * @typedef {'root'|'scene_heading'|'action'|'layer'|'blank'} NodeType
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
    // 正規化配置：自動推斷 matchMode
    this.configs = markerConfigs.map(c => ({
      ...c,
      // 如果沒有 matchMode，根據是否有 end 來推斷
      matchMode: c.matchMode || (c.end ? 'enclosure' : 'prefix')
    }));
    
    // 分離 block 和 inline markers
    this.blockMarkers = this.configs.filter(c => c.isBlock || c.type === 'prefix');
    this.inlineMarkers = this.configs.filter(c => !c.isBlock && c.type !== 'prefix');
    
    // 建立 prefix 快速查找表
    this.prefixMap = new Map();
    for (const marker of this.blockMarkers) {
      if (marker.start && marker.matchMode === 'prefix') {
        this.prefixMap.set(marker.start, marker);
      }
    }
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
    
    const context = {
      currentChapter: null,
      currentCharacter: null,
      inDialogueBlock: false
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1]; // 傳遞下一行供角色偵測
      const node = this._parseLine(line, i, context, nextLine);
      
      if (node) {
        this._updateContext(node, context);
        ast.children.push(node);
      }
    }
    
    return ast;
  }

  /**
   * 解析單行
   * @private
   */
  _parseLine(line, lineNumber, context, nextLine) {
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
    
    // 1. 優先匹配章節標題
    const chapterMatch = this._matchChapter(trimmed);
    if (chapterMatch) {
      return {
        type: 'scene_heading',
        text: chapterMatch.content,
        title: chapterMatch.title,
        number: chapterMatch.number,
        id: this._slugify(chapterMatch.content),
        lineStart: lineNumber + 1,
        lineEnd: lineNumber + 1,
        raw: line
      };
    }
    
    // 2. 匹配 block markers (prefix 模式)
    const markerNode = this._matchBlockMarker(trimmed, lineNumber);
    if (markerNode) {
      return markerNode;
    }
    
    // 3. 預設：所有未匹配的內容都是 action（動作/描述）
    // 純 Marker 模式：不進行角色偵測
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
   * 匹配章節標題
   * @private
   */
  _matchChapter(line) {
    for (const pattern of CHAPTER_PATTERNS) {
      const match = line.match(pattern);
      if (match) {
        // 嘗試提取章節編號和標題
        const numMatch = line.match(/^(\d+)\.\s*(.+)$/);
        if (numMatch) {
          return {
            content: line,
            number: parseInt(numMatch[1], 10),
            title: numMatch[2]
          };
        }
        
        const zhMatch = line.match(/^第([一二三四五六七八九十百]+)[章節幕場]\s*(.*)$/);
        if (zhMatch) {
          return {
            content: line,
            number: zhMatch[1],
            title: zhMatch[2] || ''
          };
        }
        
        return {
          content: line,
          number: null,
          title: line
        };
      }
    }
    return null;
  }

  /**
   * 匹配 block markers
   * @private
   */
  _matchBlockMarker(line, lineNumber) {
    // 按 start 長度排序（較長的優先匹配）
    const sortedMarkers = [...this.blockMarkers].sort(
      (a, b) => (b.start?.length || 0) - (a.start?.length || 0)
    );
    
    for (const marker of sortedMarkers) {
      if (!marker.start) continue;
      
      if (marker.matchMode === 'prefix' && line.startsWith(marker.start)) {
        const content = line.slice(marker.start.length).trim();
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
          raw: line,
          style: marker.style,
          children: []
        };
      }
      
      // Enclosure 模式（block 級別）
      if (marker.matchMode === 'enclosure' && marker.end) {
        if (line.startsWith(marker.start) && line.endsWith(marker.end)) {
          const content = line.slice(marker.start.length, -marker.end.length).trim();
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
            raw: line,
            style: marker.style,
            children: []
          };
        }
      }
    }
    
    return null;
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
   * 更新上下文（純 Marker 模式簡化版）
   * @private
   */
  _updateContext(node, context) {
    if (node.type === 'scene_heading') {
      context.currentChapter = node;
    } else if (node.type === 'blank') {
      // 空行可以重置一些狀態（如果需要的話）
    }
    // 純 Marker 模式不需要追蹤角色/對話狀態
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
export const buildAST = (text, markerConfigs = []) => {
  const builder = new DirectASTBuilder(markerConfigs);
  return builder.parse(text);
};
