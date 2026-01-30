/**
 * Stage 1: TextPreprocessor
 * 
 * 職責：
 * - 將被複製貼上後格式亂掉的文本「接」回正確的行
 * - 統一全形/半形符號
 * - 保留原始資訊以便回溯
 */

import { 
  JOIN_RULES, 
  SYMBOL_NORMALIZATION, 
  PRESERVE_FULLWIDTH,
  isBlankLine 
} from './constants.js';

/**
 * 預處理結果
 * @typedef {Object} PreprocessResult
 * @property {string} cleanedText - 處理後的文本
 * @property {string} originalText - 原始文本
 * @property {Array<TransformLogEntry>} transformLog - 變換紀錄
 * @property {Array<ManualReviewItem>} manualReviewNeeded - 需要人工確認的項目
 */

/**
 * 變換紀錄
 * @typedef {Object} TransformLogEntry
 * @property {number} originalLine - 原始行號
 * @property {number} resultLine - 結果行號
 * @property {string} type - 'join' | 'normalize' | 'preserve'
 * @property {string} from - 原始內容
 * @property {string} to - 轉換後內容
 * @property {string} confidence - 'high' | 'medium' | 'low'
 * @property {string} [ruleName] - 套用的規則名稱
 */

/**
 * 需要人工確認的項目
 * @typedef {Object} ManualReviewItem
 * @property {number} line - 行號
 * @property {string} reason - 原因描述
 * @property {string} content - 該行內容
 */

export class TextPreprocessor {
  constructor(options = {}) {
    this.options = {
      // 是否自動接行
      autoJoin: true,
      // 是否正規化符號
      normalizeSymbols: true,
      // 只處理高確信度
      conservativeMode: true,
      // 自訂接行規則
      customJoinRules: [],
      ...options
    };
  }

  /**
   * 預處理文本
   * @param {string} text - 原始文本
   * @returns {PreprocessResult}
   */
  preprocess(text) {
    const originalText = text;
    const lines = text.split('\n');
    const transformLog = [];
    const manualReviewNeeded = [];
    
    // Step 1: 符號正規化（逐行）
    let normalizedLines = lines;
    if (this.options.normalizeSymbols) {
      const result = this._normalizeSymbols(lines);
      normalizedLines = result.lines;
      transformLog.push(...result.log);
    }
    
    // Step 2: 接行處理
    let joinedLines = normalizedLines;
    if (this.options.autoJoin) {
      const result = this._joinLines(normalizedLines);
      joinedLines = result.lines;
      transformLog.push(...result.log);
      manualReviewNeeded.push(...result.review);
    }
    
    // Step 3: 空行處置 (Visual Blank)
    // 將真正的空行替換為 <blank> 標記，以便後續流程保留
    // 但不替換檔案開頭或結尾的空行，僅替換中間的
    const joinedText = joinedLines.join('\n');
    const finalLines = joinedText.split('\n');
    const blankedLines = finalLines.map(line => {
      // 如果是空行或只包含空白字符，轉為 <blank>
      if (!line.trim()) return '<blank>';
      return line;
    });
    const cleanedText = blankedLines.join('\n');
    
    return {
      cleanedText,
      originalText,
      transformLog,
      manualReviewNeeded
    };
  }

  /**
   * 符號正規化
   * @private
   */
  _normalizeSymbols(lines) {
    const log = [];
    const result = lines.map((line, idx) => {
      let normalized = line;
      
      for (const [from, to] of Object.entries(SYMBOL_NORMALIZATION)) {
        if (normalized.includes(from)) {
          const newLine = normalized.replaceAll(from, to);
          log.push({
            originalLine: idx + 1,
            resultLine: idx + 1,
            type: 'normalize',
            from: from,
            to: to,
            confidence: 'high'
          });
          normalized = newLine;
        }
      }
      
      return normalized;
    });
    
    return { lines: result, log };
  }

  /**
   * 接行處理
   * @private
   */
  _joinLines(lines) {
    const log = [];
    const review = [];
    const result = [];
    
    // 合併所有規則
    const allRules = [
      ...JOIN_RULES.HIGH_CONFIDENCE,
      ...(this.options.conservativeMode ? [] : JOIN_RULES.MEDIUM_CONFIDENCE),
      ...this.options.customJoinRules
    ];
    
    let i = 0;
    let resultLineNum = 0;
    
    while (i < lines.length) {
      const currentLine = lines[i];
      const nextLine = lines[i + 1];
      
      // 檢查是否需要接行
      let joined = false;
      
      if (nextLine !== undefined && !isBlankLine(currentLine)) {
        for (const rule of allRules) {
          if (this._shouldJoin(currentLine, nextLine, rule)) {
            // 執行接行
            const joinedLine = `${currentLine} ${nextLine.trim()}`;
            result.push(joinedLine);
            
            log.push({
              originalLine: i + 1,
              resultLine: resultLineNum + 1,
              type: 'join',
              from: `${currentLine}\\n${nextLine}`,
              to: joinedLine,
              confidence: 'high',
              ruleName: rule.name
            });
            
            joined = true;
            i += 2; // 跳過已接的下一行
            resultLineNum++;
            break;
          }
        }
      }
      
      if (!joined) {
        result.push(currentLine);
        resultLineNum++;
        i++;
      }
    }
    
    return { lines: result, log, review };
  }

  /**
   * 判斷是否應該接行
   * @private
   */
  _shouldJoin(currentLine, nextLine, rule) {
    const trimmedCurrent = currentLine.trim();
    const trimmedNext = nextLine.trim();
    
    // 檢查當前行是否符合規則的 pattern
    if (!rule.pattern.test(trimmedCurrent)) {
      return false;
    }
    
    // 下一行不能是空行
    if (isBlankLine(nextLine)) {
      return false;
    }
    
    // 檢查下一行是否符合 nextLinePattern
    if (rule.nextLinePattern && !rule.nextLinePattern.test(trimmedNext)) {
      return false;
    }
    
    return true;
  }

  /**
   * 取得接行預覽
   * 用於 UI 顯示，讓使用者確認哪些行會被接
   * @param {string} text - 原始文本
   * @returns {Array<{line: number, type: 'auto'|'suggest'|'preserve', preview: string}>}
   */
  getJoinPreview(text) {
    const lines = text.split('\n');
    const preview = [];
    
    const allRules = [
      ...JOIN_RULES.HIGH_CONFIDENCE,
      ...JOIN_RULES.MEDIUM_CONFIDENCE,
      ...JOIN_RULES.LOW_CONFIDENCE
    ];
    
    let i = 0;
    while (i < lines.length) {
      const currentLine = lines[i];
      const nextLine = lines[i + 1];
      
      let matched = false;
      
      if (nextLine !== undefined && !isBlankLine(currentLine)) {
        for (const rule of allRules) {
          if (this._shouldJoin(currentLine, nextLine, rule)) {
            const isHighConfidence = JOIN_RULES.HIGH_CONFIDENCE.includes(rule);
            
            preview.push({
              line: i + 1,
              type: isHighConfidence ? 'auto' : 'suggest',
              originalLines: [currentLine, nextLine],
              preview: `${currentLine} ${nextLine.trim()}`,
              ruleName: rule.name,
              description: rule.description
            });
            
            matched = true;
            i += 2;
            break;
          }
        }
      }
      
      if (!matched) {
        preview.push({
          line: i + 1,
          type: 'preserve',
          originalLines: [currentLine],
          preview: currentLine
        });
        i++;
      }
    }
    
    return preview;
  }
}

/**
 * 快速預處理函數
 * @param {string} text - 原始文本
 * @param {Object} options - 選項
 * @returns {PreprocessResult}
 */
export const preprocess = (text, options = {}) => {
  const preprocessor = new TextPreprocessor(options);
  return preprocessor.preprocess(text);
};
