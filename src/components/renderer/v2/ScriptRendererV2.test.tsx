import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScriptRendererV2 } from './ScriptRendererV2';

describe('ScriptRendererV2', () => {
  it('renders columns mode by default from AST input', () => {
    const ast = {
      children: [
        { type: 'layer', layerType: 'rule-se-single', text: '關門聲', lineStart: 1, lineEnd: 1 },
        { type: 'character', text: '小雨', lineStart: 2, lineEnd: 2 },
        { type: 'dialogue', text: '你來了。', lineStart: 3, lineEnd: 3 },
      ],
    };

    render(<ScriptRendererV2 ast={ast} mode="columns" />);

    expect(screen.getAllByText('音效').length).toBeGreaterThan(0);
    expect(screen.getAllByText('主對白').length).toBeGreaterThan(0);
    expect(screen.getByText('關門聲')).toBeInTheDocument();
    expect(screen.getByText('你來了。')).toBeInTheDocument();
  });

  it('renders timeline mode rows', () => {
    const ast = {
      children: [
        { type: 'character', text: '阿哲', lineStart: 1, lineEnd: 1 },
        { type: 'dialogue', text: '收到。', lineStart: 2, lineEnd: 2 },
      ],
    };

    render(<ScriptRendererV2 ast={ast} mode="timeline" />);

    expect(screen.getAllByText('主對白').length).toBeGreaterThan(0);
    expect(screen.getByText('收到。')).toBeInTheDocument();
  });

  it('renders inline marker styling inside v2 event text', () => {
    const ast = {
      children: [
        { type: 'dialogue', text: '(低聲) 你好。', lineStart: 1, lineEnd: 1 },
      ],
    };
    const markerConfigs = [
      {
        id: 'tone',
        label: '語氣',
        type: 'inline',
        matchMode: 'enclosure',
        start: '(',
        end: ')',
        style: { fontStyle: 'italic' },
      },
    ];
    const { container } = render(<ScriptRendererV2 ast={ast} markerConfigs={markerConfigs} mode="columns" />);

    expect(container.querySelector('[data-marker-id="tone"]')).toBeTruthy();
  });

  it('does not let block marker rules parse v2 event text as inline markers', () => {
    const ast = {
      children: [
        { type: 'dialogue', text: '#D 仍然是台詞內容。', lineStart: 1, lineEnd: 1 },
      ],
    };
    const markerConfigs = [
      {
        id: 'dialogue',
        label: '對白',
        type: 'block',
        start: '#D',
        matchMode: 'prefix',
      },
    ];
    const { container } = render(<ScriptRendererV2 ast={ast} markerConfigs={markerConfigs} mode="columns" />);

    expect(container.querySelector('[data-marker-id="dialogue"]')).toBeNull();
    expect(screen.getByText('#D 仍然是台詞內容。')).toBeInTheDocument();
  });
});
