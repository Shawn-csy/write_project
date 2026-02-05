import { describe, it, expect } from 'vitest';
import { calculateScriptStats } from './statistics.js';
import { parseScreenplay } from './screenplayAST.js';

describe('Statistics', () => {
    const sampleScript = "Title: Test\n\nINT. ROOM - DAY\n\nBOB\nHello world.";

    describe('calculateScriptStats', () => {
        it('should calculate basic stats from AST', () => {
            const { ast } = parseScreenplay(sampleScript);
            const stats = calculateScriptStats(ast);
            
            expect(stats.counts.scenes).toBe(1);
            expect(stats.counts.nodes).toBeGreaterThan(0);
            expect(stats.characterStats).toHaveLength(1);
            expect(stats.characterStats[0].name).toBe('BOB');
            expect(stats.characterStats[0].count).toBe(1);
        });

        it('should calculate timeframe distribution', () => {
            const script = "INT. OFFICE - DAY\n\nEXT. STREET - NIGHT";
            const { ast } = parseScreenplay(script);
            const stats = calculateScriptStats(ast);
            
            expect(stats.timeframeDistribution.INT).toBe(1);
            expect(stats.timeframeDistribution.EXT).toBe(1);
        });
    });


});

