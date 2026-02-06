
import { calculateScriptStats } from './src/lib/statistics/index.js';

// Mock AST
const mockAST = {
  children: [
    { type: 'scene_heading', text: 'INT. TEST - DAY' },
    { type: 'action', text: 'A man walks in.' },
    { type: 'character', text: 'JOHN' },
    { type: 'speech', character: 'JOHN', text: 'Hello world.' },
    { type: 'sfx', text: 'BOOM' }
  ]
};

console.log("Running Statistics Verification...");
const stats = calculateScriptStats(mockAST);

console.log("Stats:", JSON.stringify(stats, null, 2));

// Assertions
if (stats.counts.scenes !== 1) console.error("FAIL: Scene count mismatch");
if (stats.counts.dialogueLines !== 1) console.error("FAIL: Dialogue line mismatch");
if (stats.sentences.sfx.length !== 1) console.error("FAIL: SFX mismatch");
if (stats.timeframeDistribution.INT !== 1) console.error("FAIL: Timeframe mismatch");

console.log("Verification Complete.");
