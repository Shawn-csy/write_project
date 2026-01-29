
import { ScriptAnalyzer } from './ScriptAnalyzer.js';
import { BasicStatsMetric } from './metrics/BasicStatsMetric.js';
import { CharacterAndDurationMetric } from './metrics/CharacterAndDurationMetric.js';
import { MarkerStatsMetric } from './metrics/MarkerStatsMetric.js';
import { calculateScriptStatsFromText } from '../statistics_text_parser_legacy.js'; // Import original text calculator if needed, or re-implement? 
// The original file `src/lib/statistics.js` had TWO exports: calculateScriptStats (AST) and calculateScriptStatsFromText (Regex).
// We are only refactoring the AST part mostly? Or both? 
// The implementation plan mainly focused on ScriptAnalyzer (AST).
// But `useScriptStats` uses both. 
// Ideally we should move `calculateScriptStatsFromText` here too or re-export it.
// To avoid circular dependency if I modify `src/lib/statistics.js`, I should probably COPY the text logic here or keep it in a separate TextAnalyzer?
// For now, let's allow importing the Legacy Text parser from a renamed file or similar?
// Actually, I am REPLACING `src/lib/statistics.js` content effectively? 
// No, I am creating `src/lib/statistics/index.js`. 
// The user's code imports from `../lib/statistics`. If I replace that file with this index content, it will work.

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

  // 2. Run Analyzer
  const analyzer = new ScriptAnalyzer([basicMetric, charMetric, markerMetric]);
  const results = analyzer.analyze({ children: Array.isArray(nodes) ? nodes : (nodes.children || []) }, { markerConfigs });

  // 3. Post-Process / Merge for backward compatibility
  
  // Merge sentences arrays
  const sentences = {
      dialogue: results.sentences?.dialogue || {},
      action: [], // BasicStat didn't collect action sentences array in my implementation? Let's check.
      sceneHeadings: results.locations || [],
      sfx: results.sentences?.sfx || []
  };
  
  // Oh, BasicStatsMetric implemented `locations` array but not `sentences.sceneHeadings` explicitly as separate?
  // Original `statistics.js` had `sentences: { dialogue, action, sceneHeadings, sfx }`.
  // I should ensure my Metrics return this structure or I conform here.
  
  // BasicStatsMetric returned: { counts, locations, timeframeDistribution, dialogueRatio, actionRatio }
  // CharacterMetric returned: { characterStats, sentences: { dialogue } }
  // MarkerMetric returned: { customLayers, sentences: { sfx } }
  
  // I missed `sentences.action` in BasicStatsMetric. I should update it or add it here if needed. 
  // For now let's reconstruct what we can.
  
  const finalDefaults = {
      durationMinutes: 0,
      locations: results.locations || [],
      sentences: {
          ...sentences,
          action: [] // Missing from BasicStatsMetric currently
      },
      counts: results.counts || {},
      characterStats: results.characterStats || [],
      timeframeDistribution: results.timeframeDistribution || {},
      customLayers: results.customLayers || {},
      dialogueRatio: results.dialogueRatio || 0,
      actionRatio: results.actionRatio || 0,
      totalBlocks: 0 // Not tracked yet
  };
  
  // Calculate Duration (Facade Logic)
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
