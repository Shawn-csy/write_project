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
  CHARACTER_PATTERNS, 
  CHAPTER_PATTERNS, 
  isBlankLine 
} from './constants.js';

/**
 * AST 節點類型
 * @typedef {'screenplay'|'chapter'|'character'|'dialogue'|'action'|'marker'|'blank'} NodeType
 */

/**
 * AST 節點
 * @typedef {Object} ASTNode
 * @property {NodeType} type - 節點類型
 * @property {string} [content] - 文本內容
 * @property {Array} [children] - 子節點（inline 解析結果）
 * @property {number} lineNumber - 原始行號
 * @property {string} raw - 原始文本
 * @property {Object} [metadata] - 額外資訊
 */

export class DirectASTBuilder {
  constructor(markerConfigs = []) {
    this.configs = markerConfigs;
    
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
      type: 'screenplay', 
      children: [],
      metadata: {
        totalLines: lines.length,
        parsedAt: new Date().toISOString()
      }
    };
    
    const context = {
      currentChapter: null,
      currentCharacter: null,
      inDialogueBlock: false
    };
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const node = this._parseLine(line, i, context);
      
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
  _parseLine(line, lineNumber, context) {
    const trimmed = line.trim();
    
    // 空行處理
    if (isBlankLine(line)) {
      return { 
        type: 'blank', 
        lineNumber: lineNumber + 1,
        raw: line
      };
    }
    
    // 1. 優先匹配章節標題
    const chapterMatch = this._matchChapter(trimmed);
    if (chapterMatch) {
      return {
        type: 'chapter',
        content: chapterMatch.content,
        title: chapterMatch.title,
        number: chapterMatch.number,
        lineNumber: lineNumber + 1,
        raw: line
      };
    }
    
    // 2. 匹配 block markers (prefix 模式)
    const markerNode = this._matchBlockMarker(trimmed, lineNumber);
    if (markerNode) {
      return markerNode;
    }
    
    // 3. 判斷是否為角色名
    if (this._looksLikeCharacter(trimmed, context)) {
      return {
        type: 'character',
        name: trimmed,
        lineNumber: lineNumber + 1,
        raw: line
      };
    }
    
    // 4. 在角色名之後的文本 → 對話
    if (context.currentCharacter) {
      return {
        type: 'dialogue',
        content: trimmed,
        character: context.currentCharacter.name,
        children: this._parseInlineContent(trimmed),
        lineNumber: lineNumber + 1,
        raw: line
      };
    }
    
    // 5. 預設：動作/描述
    return {
      type: 'action',
      content: trimmed,
      children: this._parseInlineContent(trimmed),
      lineNumber: lineNumber + 1,
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
          type: 'marker',
          markerId: marker.id,
          markerLabel: marker.label,
          markerType: marker.type,
          content: content,
          children: this._parseInlineContent(content),
          lineNumber: lineNumber + 1,
          raw: line,
          style: marker.style
        };
      }
      
      // Enclosure 模式（block 級別）
      if (marker.matchMode === 'enclosure' && marker.end) {
        if (line.startsWith(marker.start) && line.endsWith(marker.end)) {
          const content = line.slice(marker.start.length, -marker.end.length).trim();
          return {
            type: 'marker',
            markerId: marker.id,
            markerLabel: marker.label,
            markerType: marker.type,
            content: content,
            children: this._parseInlineContent(content),
            lineNumber: lineNumber + 1,
            raw: line,
            style: marker.style
          };
        }
      }
    }
    
    return null;
  }

  /**
   * 判斷是否看起來像角色名
   * @private
   */
  _looksLikeCharacter(line, context) {
    // 如果已經在對話中且不是空行後，可能不是角色名
    if (context.inDialogueBlock) {
      return false;
    }
    
    // 角色名通常是：
    // 1. 2-4 個中文字
    // 2. 後面可能有括號
    // 3. 不包含特殊標記符號
    
    // 排除以標記符號開頭的行
    if (/^[#@><\/\\▼▲☆＊*（(【《]/.test(line)) {
      return false;
    }
    
    // 檢查是否符合角色名模式
    for (const pattern of CHARACTER_PATTERNS) {
      if (pattern.test(line)) {
        return true;
      }
    }
    
    return false;
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
   * 更新上下文
   * @private
   */
  _updateContext(node, context) {
    switch (node.type) {
      case 'chapter':
        context.currentChapter = node;
        context.currentCharacter = null;
        context.inDialogueBlock = false;
        break;
        
      case 'character':
        context.currentCharacter = node;
        context.inDialogueBlock = true;
        break;
        
      case 'blank':
        // 空行重置角色上下文
        context.currentCharacter = null;
        context.inDialogueBlock = false;
        break;
        
      case 'dialogue':
        // 保持在對話塊中
        context.inDialogueBlock = true;
        break;
        
      case 'marker':
      case 'action':
        // 這些不影響角色上下文
        break;
    }
  }

  /**
   * 將 AST 轉換為 Fountain 格式文本
   * @param {ASTNode} ast - AST 根節點
   * @returns {string} Fountain 格式文本
   */

  toFountain(ast) {
    const lines = [];
    let lastType = null;

    
    for (const node of ast.children) {
      switch (node.type) {
        case 'chapter':
          lines.push('');
          lines.push(`# ${node.content}`);
          lines.push('');
          lastType = 'chapter';
          break;
          
        case 'character':
          lines.push('');
          lines.push(node.name.toUpperCase());
          lastType = 'character';
          break;
          
        case 'dialogue':
          lines.push(node.content);
          lastType = 'dialogue';
          break;
          
        case 'action':
          lines.push('');
          lines.push(node.content);
          lastType = 'action';
          break;
          
        case 'marker':
          // 特殊處理 <blank> 標記
          if (node.markerType === 'visual_blank') {
            // 如果上一個節點是角色、對話或括號動作，則插入零寬度空格
            // 這樣在 Fountain 中會被視為對話的一部分，不會斷開
            if (lastType === 'character' || lastType === 'dialogue' || lastType === 'parenthetical') {
              lines.push('\u200B'); // Zero Width Space
              lastType = 'dialogue'; // 維持對話上下文
            } else {
              lines.push(''); // 一般空行
              lastType = 'blank';
            }
          } else if (node.markerType === 'prefix') {
            lines.push(`[${node.markerLabel}: ${node.content}]`);
            lastType = 'action';
          } else {
            lines.push(node.raw);
            lastType = 'action';
          }
          break;
          
        case 'blank':
          lines.push('');
          lastType = 'blank';
          break;
      }
    }
    
    return lines.join('\n');
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
