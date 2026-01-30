/**
 * Stage 2: MarkerDiscoverer
 * 
 * 職責：
 * - 自動偵測文件中使用的標記模式
 * - 輸出符合 markerConfigs 格式的建議設定
 * - 偵測與現有規則的衝突
 */

import { 
  KNOWN_PREFIX_PATTERNS, 
  KNOWN_ENCLOSURE_PATTERNS,
  CHARACTER_PATTERNS,
  CHAPTER_PATTERNS,
  isBlankLine
} from './constants.js';

/**
 * 偵測結果
 * @typedef {Object} DiscoveryResult
 * @property {Array<DiscoveredMarker>} discoveredMarkers - 偵測到的標記
 * @property {Array<Conflict>} conflicts - 與現有規則的衝突
 * @property {Array<Ambiguity>} ambiguities - 模糊不清的項目
 */

/**
 * 偵測到的標記（符合 markerConfig 格式）
 * @typedef {Object} DiscoveredMarker
 * @property {string} id - 唯一識別碼
 * @property {string} label - 顯示名稱
 * @property {string} start - 開始符號
 * @property {string} end - 結束符號（prefix 模式為空）
 * @property {boolean} isBlock - 是否為區塊標記
 * @property {string} type - 'prefix' | 'enclosure' | 'block'
 * @property {string} matchMode - 'prefix' | 'enclosure' | 'regex'
 * @property {Object} style - 樣式設定
 * @property {Object} _discovery - 偵測 metadata
 */

export class MarkerDiscoverer {
  constructor(existingConfigs = []) {
    this.existingConfigs = existingConfigs;
  }

  /**
   * 偵測文本中的標記
   * @param {string} text - 要分析的文本
   * @returns {DiscoveryResult}
   */
  discover(text) {
    const lines = text.split('\n');
    
    const prefixResults = this._discoverPrefixPatterns(lines);
    const enclosureResults = this._discoverEnclosurePatterns(lines);
    
    // 合併結果
    const allDiscovered = [...prefixResults, ...enclosureResults];
    
    // 過濾低信心度的結果（閾值降低為 0.3，讓更多標記被發現）
    const filteredMarkers = allDiscovered.filter(m => m._discovery.confidence >= 0.3);
    
    // 檢查衝突
    const conflicts = this._detectConflicts(filteredMarkers);
    
    // 找出模糊項目
    const ambiguities = this._detectAmbiguities(lines, filteredMarkers);
    
    return {
      discoveredMarkers: filteredMarkers,
      conflicts,
      ambiguities
    };
  }

  /**
   * 偵測 Prefix 模式標記
   * @private
   */
  _discoverPrefixPatterns(lines) {
    const discovered = [];
    const patternCounts = new Map();
    const patternExamples = new Map();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (isBlankLine(lines[i])) continue;
      
      for (const known of KNOWN_PREFIX_PATTERNS) {
        // 檢查行是否以該 pattern 開頭
        if (line.startsWith(known.pattern)) {
          const key = known.pattern;
          patternCounts.set(key, (patternCounts.get(key) || 0) + 1);
          
          if (!patternExamples.has(key)) {
            patternExamples.set(key, []);
          }
          const examples = patternExamples.get(key);
          if (examples.length < 5) {
            examples.push({ line: i + 1, text: line });
          }
        }
      }
    }
    
    // 轉換為 markerConfig 格式
    for (const known of KNOWN_PREFIX_PATTERNS) {
      const count = patternCounts.get(known.pattern) || 0;
      if (count === 0) continue;
      
      const examples = patternExamples.get(known.pattern) || [];
      const confidence = this._calculatePrefixConfidence(count, lines.length);
      
      discovered.push({
        id: `discovered_${known.type}_${known.pattern.replace(/[^a-zA-Z0-9]/g, '')}`,
        label: `${known.label} (${known.pattern})`,
        start: known.pattern,
        end: '',
        isBlock: true,
        type: known.type,
        matchMode: 'prefix',
        style: this._suggestStyle(known.type),
        _discovery: {
          confidence,
          occurrences: count,
          examples,
          knownPattern: known
        }
      });
    }
    
    return discovered;
  }

  /**
   * 偵測 Enclosure 模式標記
   * @private
   */
  _discoverEnclosurePatterns(lines) {
    const discovered = [];
    const patternCounts = new Map();
    const patternExamples = new Map();
    
    const fullText = lines.join('\n');
    
    for (const known of KNOWN_ENCLOSURE_PATTERNS) {
      const key = `${known.start}...${known.end}`;
      
      // 計算出現次數
      let count = 0;
      const examples = [];
      
      // 簡單的計數方式：每次找到成對的就計數
      let searchStart = 0;
      while (searchStart < fullText.length) {
        const startIdx = fullText.indexOf(known.start, searchStart);
        if (startIdx === -1) break;
        
        const endIdx = fullText.indexOf(known.end, startIdx + known.start.length);
        if (endIdx === -1) break;
        
        count++;
        
        if (examples.length < 5) {
          const content = fullText.substring(startIdx, endIdx + known.end.length);
          const lineNum = fullText.substring(0, startIdx).split('\n').length;
          examples.push({ line: lineNum, text: content.substring(0, 50) });
        }
        
        searchStart = endIdx + known.end.length;
      }
      
      if (count === 0) continue;
      
      const confidence = this._calculateEnclosureConfidence(count, lines.length, known);
      
      discovered.push({
        id: `discovered_${known.type}`,
        label: `${known.label} (${known.start}...${known.end})`,
        start: known.start,
        end: known.end,
        isBlock: false,
        type: known.type,
        matchMode: 'enclosure',
        style: this._suggestStyle(known.type),
        _discovery: {
          confidence,
          occurrences: count,
          examples,
          knownPattern: known
        }
      });
    }
    
    return discovered;
  }

  /**
   * 計算 Prefix 模式信心度
   * @private
   */
  _calculatePrefixConfidence(count, totalLines) {
    // 基礎信心度：出現次數越多越可信
    // 出現 1 次也給予基礎信心度，方便使用者確認
    if (count === 1) return 0.4;
    if (count < 5) return 0.6;
    if (count < 10) return 0.8;
    return 0.95;
  }

  /**
   * 計算 Enclosure 模式信心度
   * @private
   */
  _calculateEnclosureConfidence(count, totalLines, known) {
    // 括號類型需要更多出現次數才可信
    // 因為括號可能只是普通標點
    if (known.type === 'paren' || known.type === 'paren_half') {
      if (count < 3) return 0.35;
      if (count < 10) return 0.55;
      if (count < 20) return 0.65;
      return 0.75;
    }
    
    // 其他特殊符號
    if (count === 1) return 0.35;
    if (count < 5) return 0.7;
    return 0.9;
  }

  /**
   * 根據類型建議樣式
   * @private
   */
  _suggestStyle(type) {
    const styleMap = {
      'sfx': { fontWeight: 'bold', color: '#eab308' },
      'sfx_continuous_start': { fontWeight: 'bold', color: '#22c55e' },
      'sfx_continuous_mid': { color: '#22c55e' },
      'sfx_continuous_end': { fontWeight: 'bold', color: '#ef4444' },
      'position': { color: '#3b82f6', fontStyle: 'italic' },
      'bg_start': { color: '#8b5cf6' },
      'bg_mid': { color: '#8b5cf6' },
      'bg_end': { color: '#8b5cf6' },
      'section_start': { color: '#94a3b8', fontWeight: 'bold' },
      'section_end': { color: '#94a3b8' },
      'note': { color: '#f59e0b', fontStyle: 'italic' },
      'paren': { color: '#f97316' },
      'paren_half': { color: '#f97316' },
      'post': { color: '#94a3b8', fontStyle: 'italic' },
      'sound': { fontWeight: 'bold', color: '#eab308' },
      'section': { borderLeft: '4px solid #94a3b8' },
      'duration': { color: '#06b6d4' },
    };
    
    return styleMap[type] || { color: '#64748b' };
  }

  /**
   * 偵測與現有規則的衝突
   * @private
   */
  _detectConflicts(discoveredMarkers) {
    const conflicts = [];
    
    for (const discovered of discoveredMarkers) {
      for (const existing of this.existingConfigs) {
        // 檢查 start 符號衝突
        if (discovered.start === existing.start) {
          conflicts.push({
            description: `偵測到的 "${discovered.start}" 與現有規則 "${existing.label}" 衝突`,
            existingRule: existing.id,
            discoveredPattern: discovered.start,
            discoveredId: discovered.id
          });
        }
        
        // 檢查 enclosure 衝突
        if (discovered.end && existing.end && 
            discovered.start === existing.start && 
            discovered.end === existing.end) {
          conflicts.push({
            description: `偵測到的 "${discovered.start}...${discovered.end}" 與現有規則 "${existing.label}" 完全相同`,
            existingRule: existing.id,
            discoveredPattern: `${discovered.start}...${discovered.end}`,
            discoveredId: discovered.id
          });
        }
      }
    }
    
    return conflicts;
  }

  /**
   * 偵測模糊不清的項目
   * @private
   */
  _detectAmbiguities(lines, discoveredMarkers) {
    const ambiguities = [];
    
    // 檢查行首的特殊符號但未被識別的
    const unknownPatterns = new Map();
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (isBlankLine(lines[i])) continue;
      
      // 檢查是否以特殊符號開頭但未被 KNOWN_PREFIX_PATTERNS 涵蓋
      const specialStart = line.match(/^([#@><\/\\▼▲☆＊*]+)/);
      if (specialStart) {
        const pattern = specialStart[1];
        const isKnown = KNOWN_PREFIX_PATTERNS.some(k => pattern.startsWith(k.pattern));
        
        if (!isKnown && pattern.length > 0) {
          if (!unknownPatterns.has(pattern)) {
            unknownPatterns.set(pattern, []);
          }
          unknownPatterns.get(pattern).push(i + 1);
        }
      }
    }
    
    for (const [pattern, lineNums] of unknownPatterns) {
      if (lineNums.length >= 2) {
        ambiguities.push({
          description: `無法確定 "${pattern}" 開頭是否為獨立標記`,
          pattern,
          lines: lineNums.slice(0, 10)
        });
      }
    }
    
    return ambiguities;
  }

  /**
   * 將偵測結果轉換為可直接使用的 markerConfig
   * 移除 _discovery metadata
   * @param {DiscoveredMarker} discovered 
   * @returns {Object} markerConfig
   */
  static toMarkerConfig(discovered) {
    const { _discovery, ...config } = discovered;
    // 生成一個更友善的 id
    config.id = config.id.replace('discovered_', '');
    return config;
  }
}

/**
 * 快速偵測函數
 * @param {string} text - 要分析的文本
 * @param {Array} existingConfigs - 現有的 marker configs
 * @returns {DiscoveryResult}
 */
export const discoverMarkers = (text, existingConfigs = []) => {
  const discoverer = new MarkerDiscoverer(existingConfigs);
  return discoverer.discover(text);
};
