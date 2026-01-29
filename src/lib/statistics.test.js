import { describe, it, expect } from 'vitest';
import { calculateScriptStats, calculateScriptStatsFromText } from './statistics.js';
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

    describe('calculateScriptStatsFromText', () => {
        it('should calculate stats directly from text', () => {
            const stats = calculateScriptStatsFromText(sampleScript);
            
            expect(stats.counts.dialogueLines).toBe(3);
            expect(stats.counts.dialogueChars).toBeGreaterThan(0);
        });

        it('should handle custom markers', () => {
            const script = "Title: Test\n\n/e\nFeeling sad\n/e";
            const configs = [
                { id: 'emotion', start: '/e', end: '/e', isBlock: true }
            ];
            const stats = calculateScriptStatsFromText(script, configs);
            
            expect(stats.markers.emotion).toBeDefined();
            expect(stats.markers.emotion.count).toBe(1);
            expect(stats.markers.emotion.items[0].text).toBe('Feeling sad');
        });

        it('should calculate pause seconds', () => {
            const script = "/p 5.5";
            const configs = [
                { id: 'pause', start: '/p', isBlock: false, matchMode: 'prefix' }
            ];
            const stats = calculateScriptStatsFromText(script, configs);
            
            expect(stats.pauseSeconds).toBe(5.5);
            expect(stats.pauseItems).toHaveLength(1);
        });

        it('should handle regex matchMode', () => {
            const script = "ISSUE #123";
            const configs = [
                { id: 'issue', regex: 'ISSUE #(\\d+)', matchMode: 'regex' }
            ];
            const stats = calculateScriptStatsFromText(script, configs);
            
            expect(stats.markers.issue.count).toBe(1);
            expect(stats.markers.issue.items[0].text).toBe('123');
        });

        it('should handle multiple enclosures on one line', () => {
            const script = "Hello [[world]] and [[everyone]]";
            const configs = [
                { id: 'note', start: '[[', end: ']]', matchMode: 'enclosure' }
            ];
            const stats = calculateScriptStatsFromText(script, configs);
            
            expect(stats.markers.note.count).toBe(2);
            expect(stats.markers.note.items[0].text).toBe('world');
            expect(stats.markers.note.items[1].text).toBe('everyone');
        });

        it('should handle single-line block markers', () => {
            const script = "{SECRET CONTENT}";
            const configs = [
                { id: 'secret', start: '{', end: '}', isBlock: true, matchMode: 'enclosure' }
            ];
            const stats = calculateScriptStatsFromText(script, configs);
            
            expect(stats.markers.secret.count).toBe(1);
            expect(stats.markers.secret.items[0].text).toBe('SECRET CONTENT');
        });
    });
});
