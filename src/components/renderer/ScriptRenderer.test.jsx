import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ScriptRenderer } from './ScriptRenderer';
import { parseScreenplay } from '../../lib/screenplayAST';

describe('ScriptRenderer Styles', () => {
    const renderWithAST = (text, configs = []) => {
        const { ast } = parseScreenplay(text, configs);
        return render(
            <ScriptRenderer 
                ast={ast} 
                markerConfigs={configs} 
                themePalette={["160 84% 39%"]} 
                colorCache={{ current: new Map() }}
            />
        );
    };

    it('should apply custom styles to inline markers', () => {
        const text = "Hello [[WORLD]]";
        const configs = [
            { id: 'highlight', start: '[[', end: ']]', matchMode: 'enclosure', style: { color: 'red', fontWeight: 'bold' } }
        ];
        
        renderWithAST(text, configs);
        
        const span = screen.getByText('WORLD');
        expect(span).toBeDefined();
        // Vitest/JSDOM might use style object or string
        expect(span.style.color).toBe('red');
        expect(span.style.fontWeight).toBe('bold');
    });

    it('should respect showDelimiters config for inline markers', () => {
        const text = "Hello [[WORLD]]";
        const configs = [
            { id: 'h', start: '[[', end: ']]', matchMode: 'enclosure', showDelimiters: true }
        ];
        
        const { rerender } = renderWithAST(text, configs);
        expect(screen.queryByText('[[WORLD]]')).toBeDefined();

        // Rerender with showDelimiters: false
        const configsNoDelim = [{ ...configs[0], showDelimiters: false }];
        const { ast } = parseScreenplay(text, configsNoDelim);
        rerender(
            <ScriptRenderer 
                ast={ast} 
                markerConfigs={configsNoDelim} 
                themePalette={["160 84% 39%"]} 
                colorCache={{ current: new Map() }}
            />
        );
        expect(screen.queryByText('WORLD')).toBeDefined();
        expect(screen.queryByText('[[WORLD]]')).toBeNull();
    });

    it('should apply styles to layer nodes (block markers)', () => {
        const text = "/d\nBOB\nHello\n/d";
        const configs = [
            { id: 'dual-block', start: '/d', end: '/d', isBlock: true, style: { backgroundColor: 'rgb(211, 211, 211)' } }
        ];
        
        const { container } = renderWithAST(text, configs);
        
        // Find by custom class
        const layer = container.querySelector('.layer-node');
        if (!layer) {
            console.log("HTML:", container.innerHTML);
        }
        expect(layer).not.toBeNull();
        expect(layer.style.backgroundColor).toBe('rgb(211, 211, 211)');
    });

    it('should use custom templates in renderers', () => {
        const text = "ISSUE #123";
        const configs = [
            { 
                id: 'issue', 
                regex: 'ISSUE #(\\d+)', 
                matchMode: 'regex', 
                renderer: { template: 'Ticket: {{content}}' },
                style: { textDecoration: 'underline' }
            }
        ];
        
        renderWithAST(text, configs);
        const span = screen.getByText('Ticket: 123');
        expect(span).toBeDefined();
        expect(span.style.textDecoration).toBe('underline');
    });

    it('should dim non-keywords when dimIfNotKeyword is true', () => {
        const text = "this is it"; // Match at start
        const configs = [
            { 
                id: 'mark', 
                regex: 'this', 
                matchMode: 'regex', 
                keywords: ['IMPORTANT'], 
                dimIfNotKeyword: true 
            }
        ];
        
        renderWithAST(text, configs);
        const span = screen.getByText('this');
        expect(span.className).toContain('opacity-60');
    });
});
