
import { ScriptAnalyzer } from './ScriptAnalyzer.js';
import { BasicStatsMetric } from './metrics/BasicStatsMetric.js';
import { CharacterAndDurationMetric } from './metrics/CharacterAndDurationMetric.js';
import { MarkerStatsMetric } from './metrics/MarkerStatsMetric.js';
import { RangeStatsMetric } from './metrics/RangeStatsMetric.js';
import { calculateScriptStatsFromText } from '../statistics_text_parser_legacy.js';

export { calculateScriptStatsFromText } from '../statistics_text_parser_legacy.js'; 

/**
 * Calculates script statistics based on the AST using the new Analyzer architecture.
 * @param {Array} nodes - The root nodes of the parsed AST.
 * @param {Array} markerConfigs - Optional configs.
 * @param {Object} options - { wordCountMode: 'pure' | 'all' }
 * @returns {Object} The calculated statistics.
 */
export function calculateScriptStats(nodes, markerConfigs = [], options = {}) {
  // 1. Setup Metrics
  const basicMetric = new BasicStatsMetric();
  const charMetric = new CharacterAndDurationMetric({
      dialogueSpeed: 200,
      actionSpeed: 300 
  });
  const markerMetric = new MarkerStatsMetric();
  const rangeMetric = new RangeStatsMetric();

  // 2. Run Analyzer
  const analyzer = new ScriptAnalyzer([basicMetric, charMetric, markerMetric, rangeMetric]);
  const results = analyzer.analyze({ children: Array.isArray(nodes) ? nodes : (nodes.children || []) }, { markerConfigs });

  // 3. Post-Process / Merge for backward compatibility
  const sentences = {
      dialogue: results.sentences?.dialogue || {},
      action: [],
      sceneHeadings: results.locations || [],
      sfx: results.sentences?.sfx || []
  };
  
  const finalDefaults = {
      durationMinutes: 0,
      locations: results.locations || [],
      sentences,
      counts: results.counts || {},
      characterStats: results.characterStats || [],
      timeframeDistribution: results.timeframeDistribution || {},
      customLayers: results.customLayers || {},
      dialogueRatio: results.dialogueRatio || 0,
      actionRatio: results.actionRatio || 0,
      totalBlocks: 0,
      // 新增：區間統計
      rangeStats: results.rangeStats || {}
  };
  
  // Calculate Duration
  const dialogueChars = finalDefaults.counts.dialogueChars || 0;
  const actionChars = finalDefaults.counts.actionChars || 0;
  const customDurationSeconds = results.customDurationSeconds || 0;
  const customMinutes = customDurationSeconds / 60;
  
  if (options.wordCountMode === 'all') {
      finalDefaults.durationMinutes = ((dialogueChars + actionChars) / 250) + customMinutes;
  } else {
      finalDefaults.durationMinutes = (dialogueChars / 200) + customMinutes;
  }

  // Estimates
  finalDefaults.estimates = {
      pure: (dialogueChars / 200) + customMinutes,
      all: ((dialogueChars + actionChars) / 300) + customMinutes
  };

  return finalDefaults;
}
