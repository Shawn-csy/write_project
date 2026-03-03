import { describe, it, expect } from 'vitest';
import { calculateScriptStats } from './statistics.js';
import { parseScreenplay } from './screenplayAST.js';

const testMarkerConfigs = [
    {
        id: 'scene',
        start: '#S',
        matchMode: 'prefix',
        isBlock: true,
        type: 'block',
        parseAs: 'scene_heading',
        mapFields: { text: '$text' },
    },
    {
        id: 'character',
        start: '#C',
        matchMode: 'prefix',
        isBlock: true,
        type: 'block',
        parseAs: 'character',
        mapFields: { text: '$text' },
        mapCasts: { text: 'trim_colon_suffix' },
    },
    {
        id: 'dialogue',
        start: '#D',
        matchMode: 'prefix',
        isBlock: true,
        type: 'block',
        parseAs: 'dialogue',
        mapFields: { text: '$text' },
    },
];

describe('Statistics', () => {
    const sampleScript = "Title: Test\n\n#S INT. ROOM - DAY\n#C BOB\n#D Hello world.";

    describe('calculateScriptStats', () => {
        it('should calculate basic stats from AST', () => {
            const { ast } = parseScreenplay(sampleScript, testMarkerConfigs);
            const stats = calculateScriptStats(ast);
            
            expect(stats.counts.scenes).toBe(1);
            expect(stats.counts.nodes).toBeGreaterThan(0);
            expect(stats.characterStats).toHaveLength(1);
            expect(stats.characterStats[0].name).toBe('BOB');
            expect(stats.characterStats[0].count).toBe(1);
        });

        it('should calculate timeframe distribution', () => {
            const script = "#S INT. OFFICE - DAY\n#S EXT. STREET - NIGHT";
            const { ast } = parseScreenplay(script, testMarkerConfigs);
            const stats = calculateScriptStats(ast);
            
            expect(stats.timeframeDistribution.INT).toBe(1);
            expect(stats.timeframeDistribution.EXT).toBe(1);
        });
    });


});
