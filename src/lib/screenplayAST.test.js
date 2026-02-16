import { describe, it, expect } from 'vitest';
import { parseScreenplay } from './screenplayAST.js';

describe('ScreenplayAST (Pure Marker Mode)', () => {
    it('should parse a basic script with title and body', () => {
        const text = "Title: Test\nAuthor: Any\n\n\nINT. ROOM - DAY\n\nHello.";
        const result = parseScreenplay(text);
        
        expect(result.titleLines).toContain("Title: Test");
        expect(result.ast.type).toBe('root');
        
        // scene_heading 需要符合 CHAPTER_PATTERNS
        // "INT. ROOM - DAY" 不符合中文章節格式，會被當作 action
        const action = result.ast.children.find(n => n.type === 'action');
        expect(action).toBeDefined();
    });

    it('should correctly process block markers as layer', () => {
        const text = "/e Feeling happy";
        const markerConfigs = [
            {
                id: 'emotion',
                label: 'Emotion',
                start: '/e',
                isBlock: true,
                matchMode: 'prefix'
            }
        ];
        
        const result = parseScreenplay(text, markerConfigs);
        const layer = result.ast.children.find(n => n.type === 'layer');
        
        expect(layer).toBeDefined();
        expect(layer.layerType).toBe('emotion');
        expect(layer.text).toBe('Feeling happy');
    });

    it('should NOT detect characters automatically in pure marker mode', () => {
        const text = "小明\n你好嗎？";
        const result = parseScreenplay(text);
        
        // 純 Marker 模式：不會自動偵測角色，全部都是 action
        const actions = result.ast.children.filter(n => n.type === 'action');
        expect(actions.length).toBe(2);
        expect(actions[0].text).toBe('小明');
    });

    it('should treat @ prefix as action in pure marker mode', () => {
        const text = "@BOT\nI am a bot.";
        const result = parseScreenplay(text);
        
        // 純 Marker 模式：@BOT 是 action
        const actions = result.ast.children.filter(n => n.type === 'action');
        expect(actions.length).toBeGreaterThan(0);
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

    it('should detect Chinese chapter formats as scene_heading', () => {
        const text = "第一章 開場\n\n這是內容";
        const result = parseScreenplay(text);
        
        const scene = result.ast.children.find(n => n.type === 'scene_heading');
        expect(scene).toBeDefined();
        expect(scene.text).toContain('第一章');
    });

    it('should detect numbered chapter formats as scene_heading', () => {
        const text = "01. 標題\n\n內容";
        const result = parseScreenplay(text);
        
        const scene = result.ast.children.find(n => n.type === 'scene_heading');
        expect(scene).toBeDefined();
        expect(scene.number).toBe(1);
    });

    it('should handle blank lines', () => {
        const text = "第一行\n\n第三行";
        const result = parseScreenplay(text);
        
        const blank = result.ast.children.find(n => n.type === 'blank');
        expect(blank).toBeDefined();
    });

    it('should provide scene list from scene_headings', () => {
        const text = "01. 第一場\n內容\n02. 第二場\n更多內容";
        const result = parseScreenplay(text);
        
        expect(result.scenes.length).toBe(2);
        expect(result.scenes[0].label).toContain('第一場');
    });

    it('should keep AST line numbers aligned to original text when title page exists', () => {
        const text = "Title: 測試\nAuthor: A\n\n第一行正文\n第二行正文";
        const result = parseScreenplay(text);

        const firstAction = result.ast.children.find(n => n.type === 'action');
        expect(firstAction).toBeDefined();
        expect(firstAction.lineStart).toBe(4);
    });
});
