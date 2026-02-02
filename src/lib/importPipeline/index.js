/**
 * 三階段式腳本匯入處理系統
 * 
 * 主要匯出入口
 */

// Stage 1: 文本預處理
export { TextPreprocessor, preprocess } from './textPreprocessor.js';

// Stage 2: 標記發現
export { MarkerDiscoverer, discoverMarkers } from './markerDiscoverer.js';

// Stage 3: AST 建構
export { DirectASTBuilder, buildAST } from './directASTBuilder.js';

// 共用常數
export {
  JOIN_RULES,
  SYMBOL_NORMALIZATION,
  PRESERVE_FULLWIDTH,
  KNOWN_PREFIX_PATTERNS,
  KNOWN_ENCLOSURE_PATTERNS,
  CHARACTER_PATTERNS,
  CHAPTER_PATTERNS,
  isBlankLine
} from './constants.js';

/**
 * 完整的三階段處理流程（純 Marker 模式）
 * 
 * @param {string} rawText - 原始文本
 * @param {Object} options - 選項
 * @param {Array} options.existingConfigs - 現有的 marker configs
 * @param {boolean} options.autoApplyDiscovered - 是否自動套用發現的標記（預設 false）
 * @returns {Object} 處理結果
 */
export const processScript = (rawText, options = {}) => {
  const { existingConfigs = [], autoApplyDiscovered = false } = options;
  
  // Stage 1: 預處理
  const preprocessor = new TextPreprocessor();
  const preprocessResult = preprocessor.preprocess(rawText);
  
  // Stage 2: 標記發現
  const discoverer = new MarkerDiscoverer(existingConfigs);
  const discoveryResult = discoverer.discover(preprocessResult.cleanedText);
  
  // 合併 marker configs
  const finalConfigs = [...existingConfigs];
  if (autoApplyDiscovered) {
    for (const discovered of discoveryResult.discoveredMarkers) {
      const config = MarkerDiscoverer.toMarkerConfig(discovered);
      // 檢查是否已存在
      if (!finalConfigs.some(c => c.id === config.id)) {
        finalConfigs.push(config);
      }
    }
  }
  
  // Stage 3: 建構 AST
  const builder = new DirectASTBuilder(finalConfigs);
  const ast = builder.parse(preprocessResult.cleanedText);
  
  return {
    // 各階段結果
    preprocess: preprocessResult,
    discovery: discoveryResult,
    ast,
    
    // 使用的 configs
    usedConfigs: finalConfigs
  };
};
