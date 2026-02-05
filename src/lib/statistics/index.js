
import { ScriptAnalyzer } from './ScriptAnalyzer.js';
import { BasicStatsMetric } from './metrics/BasicStatsMetric.js';
import { CharacterAndDurationMetric } from './metrics/CharacterAndDurationMetric.js';
import { MarkerStatsMetric } from './metrics/MarkerStatsMetric.js';
import { RangeStatsMetric } from './metrics/RangeStatsMetric.js';
 

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
  const results = analyzer.analyze(
      { children: Array.isArray(nodes) ? nodes : (nodes.children || []) }, 
      { markerConfigs, statsConfig: options.statsConfig }
  );

  // 3. Post-Process / Merge for backward compatibility
  const sentences = {
      dialogue: results.sentences?.dialogue || [],
      action: results.actionLines || [], // Collect Action lines
      sceneHeadings: results.locations || [],
      sfx: results.sentences?.sfx || []
  };
  
  // Calculate Total Cues from Custom Layers
  let totalCues = 0;
  if (results.customLayers) {
      Object.values(results.customLayers).forEach(items => {
          if (Array.isArray(items)) totalCues += items.length;
      });
  }

  const finalDefaults = {
      durationMinutes: 0,
      locations: results.locations || [],
      sentences,
      counts: {
          ...(results.counts || {}),
          cues: totalCues, // Inject calculated cue count
          // If 0 dialogue detected, assume action lines are the "lines" (Pure Marker Mode)
          dialogueLines: (results.counts?.dialogueLines > 0) 
              ? results.counts.dialogueLines 
              : (sentences.action?.length || 0) 
      },
      characterStats: results.characterStats || [],
      timeframeDistribution: results.timeframeDistribution || {},
      customLayers: results.customLayers || {},
      dialogueRatio: results.dialogueRatio || 0,
      actionRatio: results.actionRatio || 0,
      totalBlocks: 0,
      // 新增：區間統計
      rangeStats: results.rangeStats || {},
      customDurationSeconds: results.customDurationSeconds || 0,
      pauseSeconds: results.pauseSeconds || 0,
      pauseItems: results.pauseItems || []
  };
  
  // Calculate Duration
  const dialogueChars = finalDefaults.counts.dialogueChars || 0;
  const actionChars = finalDefaults.counts.actionChars || 0;
  const customDurationSeconds = results.customDurationSeconds || 0;
  const customMinutes = customDurationSeconds / 60;
  
  // Use divisor from config or defaults
  const divisor = (options.statsConfig && options.statsConfig.wordCountDivisor) 
      ? options.statsConfig.wordCountDivisor 
      : (options.wordCountMode === 'all' ? 250 : 200);

  finalDefaults.durationMinutes = (dialogueChars / divisor) + customMinutes;

  // Estimates
  finalDefaults.estimates = {
      pure: (dialogueChars / divisor) + customMinutes,
      all: ((dialogueChars + actionChars) / divisor) + customMinutes // consistent divisor for now, or make 'all' configurable if needed
  };

  return finalDefaults;
}
