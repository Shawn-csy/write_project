import { describe, it, expect } from 'vitest';
import { parseScreenplay } from './screenplayAST.js';

describe('ScreenplayAST', () => {
    it('should parse a basic script with title and body', () => {
        const text = "Title: Test\nAuthor: Any\n\n\nINT. ROOM - DAY\n\nHello.";
        const result = parseScreenplay(text);
        
        expect(result.titleLines).toContain("Title: Test");
        expect(result.ast.type).toBe('root');
        
        const scene = result.ast.children.find(n => n.type === 'scene_heading');
        expect(scene).toBeDefined();
    });

    it('should correctly process block markers', () => {
        const text = "/e\nFeeling happy\n/e";
        const markerConfigs = [
            {
                id: 'emotion',
                label: 'Emotion',
                start: '/e',
                end: '/e',
                isBlock: true,
                matchMode: 'enclosure'
            }
        ];
        
        const result = parseScreenplay(text, markerConfigs);
        // console.log("AST:", JSON.stringify(result.ast, null, 2));
        const layer = result.ast.children.find(n => n.type === 'layer');
        
        expect(layer).toBeDefined();
        expect(layer.layerType).toBe('emotion');
    });

    it('should identify CJK characters as speakers', () => {
        const text = "小明\n你好嗎？";
        const result = parseScreenplay(text);
        
        const speech = result.ast.children.find(n => n.type === 'speech');
        expect(speech).toBeDefined();
        expect(speech.character).toBe('小明');
    });

    it('should handle forced character names with @', () => {
        const text = "@BOT\nI am a bot.";
        const result = parseScreenplay(text);
        
        const speech = result.ast.children.find(n => n.type === 'speech');
        expect(speech).toBeDefined();
        expect(speech.character).toBe('BOT');
    });

    it('should parse inline styles correctly', () => {
        const text = "Hello //world//";
        const markerConfigs = [
            {
                id: 'italic',
                start: '//',
                end: '//',
                isBlock: false,
                matchMode: 'enclosure'
            }
        ];
        
        const result = parseScreenplay(text, markerConfigs);
        const action = result.ast.children.find(n => n.type === 'action');
        
        const highlighted = action.inline.find(i => i.type === 'highlight');
        expect(highlighted).toBeDefined();
        expect(highlighted.content).toBe('world');
    });

    it('should handle parentheticals, transitions, and centered text', () => {
        const text = "BOB\n(smiling)\nHello.\n\nCUT TO:\n\n> CENTERED <";
        const result = parseScreenplay(text);
        
        const speech = result.ast.children.find(n => n.type === 'speech');
        const parenthetical = speech ? speech.children.find(n => n.type === 'parenthetical') : null;
        const transition = result.ast.children.find(n => n.type === 'transition');
        const centered = result.ast.children.find(n => n.type === 'centered');
        
        expect(parenthetical).toBeDefined();
        expect(transition).toBeDefined();
        expect(centered).toBeDefined();
    });

    it('should optimize dual dialogue layers', () => {
        const text = "BOB\nHello.\n\n/d\nALICE\nHi!\n/d";
        const markerConfigs = [
            { id: 'dual', start: '/d', end: '/d', isBlock: true, layerType: 'dual' }
        ];
        const result = parseScreenplay(text, markerConfigs);
        
        // Find dual_dialogue container
        const dual = result.ast.children.find(n => n.type === 'dual_dialogue');
        expect(dual).toBeDefined();
        // It should merge BOB (speech) and ALICE (new speech from dual block)
        expect(dual.children.length).toBeGreaterThanOrEqual(1);
    });
});
