import { ScriptAnalyzer } from './ScriptAnalyzer';
import type { AstNode, MarkerConfig } from './ScriptAnalyzer';
import { BasicStatsMetric } from './metrics/BasicStatsMetric';
import { CharacterAndDurationMetric } from './metrics/CharacterAndDurationMetric';
import { MarkerStatsMetric } from './metrics/MarkerStatsMetric';
import { RangeStatsMetric } from './metrics/RangeStatsMetric';

type AstLike = AstNode | AstNode[];
type StatsConfig = { wordCountDivisor?: number; excludePunctuation?: boolean };
type CalculateOptions = {
  wordCountMode?: string;
  statsConfig?: StatsConfig;
};

export type CharacterStatItem = {
  lineCount: number;
  count: number;
  wordCount: number;
  speakingScenesCount: number;
  [key: string]: unknown;
};

type StatsResult = {
  locations?: unknown[];
  dialogueByCharacter?: Record<string, string[]>;
  dialogueOrdered?: { text: string; line: number | null }[];
  actionLines?: unknown[];
  sentences?: { dialogue?: unknown[]; sfx?: unknown[] };
  customLayers?: Record<string, unknown[]>;
  characterStats?: Array<{ lineCount?: unknown; count?: unknown; wordCount?: unknown; speakingScenesCount?: unknown; [key: string]: unknown }>;
  counts?: Record<string, number>;
  timeframeDistribution?: Record<string, number>;
  dialogueRatio?: number;
  actionRatio?: number;
  rangeStats?: Record<string, unknown>;
  customDurationSeconds?: number;
  pauseSeconds?: number;
  pauseItems?: unknown[];
};

export interface ScriptStatsOutput {
  durationMinutes: number;
  locations: unknown[];
  sentences: {
    dialogue: { text: string; line: number | null }[];
    action: unknown[];
    sceneHeadings: unknown[];
    sfx: unknown[];
  };
  counts: Record<string, number>;
  characterStats: CharacterStatItem[];
  timeframeDistribution: Record<string, number>;
  customLayers: Record<string, unknown[]>;
  dialogueRatio: number;
  actionRatio: number;
  totalBlocks: number;
  rangeStats: Record<string, unknown>;
  customDurationSeconds: number;
  pauseSeconds: number;
  pauseItems: unknown[];
  estimates: { pure: number; all: number };
  dialogueByCharacter: Record<string, string[]>;
}

/**
 * Calculates script statistics based on the AST using the new Analyzer architecture.
 * @param {Array} nodes - The root nodes of the parsed AST.
 * @param {Array} markerConfigs - Optional configs.
 * @param {Object} options - { wordCountMode: 'pure' | 'all' }
 * @returns {Object} The calculated statistics.
 */
export function calculateScriptStats(
  nodes: AstLike,
  markerConfigs: MarkerConfig[] = [],
  options: CalculateOptions = {}
): ScriptStatsOutput {
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
  const astInput: AstNode = Array.isArray(nodes)
    ? { type: 'root', children: nodes }
    : { type: 'root', children: (nodes as AstNode).children || [] };
  const results = analyzer.analyze(
      astInput,
      { markerConfigs, statsConfig: options.statsConfig as Record<string, unknown> }
  ) as StatsResult;

  // 3. Post-Process / Merge for backward compatibility
  const sentences = {
      dialogue: results.dialogueOrdered || [],
      action: results.actionLines || [], // Collect Action lines
      sceneHeadings: results.locations || [],
      sfx: results.sentences?.sfx || []
  };
  
  // Calculate Total Cues from Custom Layers
  let totalCues = 0;
  if (results.customLayers) {
      Object.values(results.customLayers).forEach((items) => {
          if (Array.isArray(items)) totalCues += items.length;
      });
  }

  const toFiniteNumber = (value: unknown, fallback = 0): number => {
      const n = Number(value);
      return Number.isFinite(n) ? n : fallback;
  };
  const normalizedCharacterStats: CharacterStatItem[] = (results.characterStats || []).map((item) => {
      const lineCount = toFiniteNumber(item?.lineCount ?? item?.count, 0);
      const wordCount = toFiniteNumber(item?.wordCount, 0);
      const speakingScenesCount = toFiniteNumber(item?.speakingScenesCount, 0);
      return {
          ...item,
          lineCount,
          wordCount,
          speakingScenesCount,
          count: lineCount,
      };
  });

  const finalDefaults: ScriptStatsOutput = {
      estimates: { pure: 0, all: 0 },
      durationMinutes: 0,
      locations: results.locations || [],
      sentences,
      counts: {
          ...(results.counts || {}),
          cues: totalCues, // Inject calculated cue count
          // If 0 dialogue detected, assume action lines are the "lines" (Pure Marker Mode)
          dialogueLines: ((results.counts?.dialogueLines ?? 0) > 0)
              ? Number(results.counts?.dialogueLines ?? 0)
              : (sentences.action?.length || 0) 
      },
      characterStats: normalizedCharacterStats,
      timeframeDistribution: (results.timeframeDistribution || {}) as Record<string, number>,
      customLayers: results.customLayers || {},
      dialogueRatio: results.dialogueRatio || 0,
      actionRatio: results.actionRatio || 0,
      totalBlocks: 0,
      // 新增：區間統計
      rangeStats: results.rangeStats || {},
      customDurationSeconds: results.customDurationSeconds || 0,
      pauseSeconds: results.pauseSeconds || 0,
      pauseItems: results.pauseItems || [],
      dialogueByCharacter: results.dialogueByCharacter || {},
  };
  
  // Calculate Duration
  const dialogueChars = finalDefaults.counts.dialogueChars || 0;
  const actionChars = finalDefaults.counts.actionChars || 0;
  const customDurationSeconds = results.customDurationSeconds || 0;
  const customMinutes = customDurationSeconds / 60;
  
  // divisor: explicit config > mode default (all=250, pure=200)
  const configDivisor = options.statsConfig?.wordCountDivisor;
  const pureDivisor = configDivisor ?? 200;
  const allDivisor = configDivisor ?? 250;

  const pureEstimate = (dialogueChars / pureDivisor) + customMinutes;
  const allEstimate = ((dialogueChars + actionChars) / allDivisor) + customMinutes;

  finalDefaults.durationMinutes = options.wordCountMode === "all" ? allEstimate : pureEstimate;
  finalDefaults.estimates = { pure: pureEstimate, all: allEstimate };

  return finalDefaults;
}
