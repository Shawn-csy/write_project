
import { describe, it, expect } from 'vitest';
import { calculateScriptStats } from '../index.js';

describe('ScriptAnalyzer', () => {
    it('should correctly count scenes and basic elements', () => {
        const mockAST = [
            { type: 'scene_heading', text: 'INT. HOUSE - DAY' },
            { type: 'action', text: 'A hero walks in.' },
            { type: 'speech', character: 'HERO', text: 'I am here.' }
        ];

        const stats = calculateScriptStats(mockAST);
        
        expect(stats.counts.scenes).toBe(1);
        expect(stats.counts.nodes).toBe(3);
        expect(stats.locations).toContain('INT. HOUSE - DAY');
        expect(stats.counts.dialogueLines).toBe(1);
        expect(stats.counts.dialogueChars).toBeGreaterThan(0);
    });

    it('should calculate character statistics', () => {
        const mockAST = [
            { type: 'speech', character: 'ALICE', text: 'Hi.' },
            { type: 'speech', character: 'BOB', text: 'Hello.' },
            { type: 'speech', character: 'ALICE', text: 'How are you?' }
        ];

        const stats = calculateScriptStats(mockAST);
        
        expect(stats.characterStats).toHaveLength(2);
        expect(stats.characterStats[0].name).toBe('ALICE');
        expect(stats.characterStats[0].count).toBe(2);
        expect(stats.characterStats[1].name).toBe('BOB');
        expect(stats.characterStats[1].count).toBe(1);
    });

    it('should handle custom markers', () => {
        const markerConfigs = [{ id: 'blue_mark', name: 'Blue Mark' }];
        const mockAST = [
             { type: 'layer', layerType: 'blue_mark', text: 'Secret Note' }
        ];

        const stats = calculateScriptStats(mockAST, markerConfigs);
        
        expect(stats.customLayers['blue_mark']).toBeDefined();
        // Depending on implementation, layer content is either text property or children
        // The mock AST here is simple. The implementation uses recursive text.
        // Let's verify our mock is minimal enough. ScriptAnalyzer handles recursive text.
    });
    
    it('should calculate duration estimates', () => {
         const mockAST = [
            { type: 'speech', character: 'A', text: 'A long speech to take time. '.repeat(10) } 
        ];
        const stats = calculateScriptStats(mockAST);
        expect(stats.durationMinutes).toBeGreaterThan(0);
        expect(stats.estimates.pure).toBeGreaterThan(0);
        expect(stats.estimates.all).toBeGreaterThan(0);
    });
});
