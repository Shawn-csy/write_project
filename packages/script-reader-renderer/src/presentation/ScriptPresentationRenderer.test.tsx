import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ScriptPresentationRenderer } from './ScriptPresentationRenderer';

describe('ScriptPresentationRenderer', () => {
  it('renders columns mode by default from AST input', () => {
    const ast = {
      children: [
        { type: 'layer', layerType: 'rule-se-single', text: '關門聲', lineStart: 1, lineEnd: 1 },
        { type: 'character', text: '小雨', lineStart: 2, lineEnd: 2 },
        { type: 'dialogue', text: '你來了。', lineStart: 3, lineEnd: 3 },
      ],
    };

    render(<ScriptPresentationRenderer ast={ast} mode="columns" />);

    expect(screen.getAllByText('音效').length).toBeGreaterThan(0);
    expect(screen.getAllByText('主對白').length).toBeGreaterThan(0);
    expect(screen.getAllByText('關門聲').length).toBeGreaterThan(0);
    expect(screen.getAllByText('你來了。').length).toBeGreaterThan(0);
  });

  it('keeps v2 row underlines off by default', () => {
    const ast = {
      children: [
        { type: 'dialogue', text: '第一行。', lineStart: 1, lineEnd: 1 },
        { type: 'dialogue', text: '第二行。', lineStart: 2, lineEnd: 2 },
      ],
    };

    const { container } = render(<ScriptPresentationRenderer ast={ast} mode="columns" />);

    const lineGuideContainer = container.querySelector('[data-line-underlines]');
    expect(lineGuideContainer?.getAttribute('data-line-underlines')).toBe('false');
    expect(lineGuideContainer?.className || '').not.toContain('divide-y');
  });

  it('enables v2 row underlines only when requested', () => {
    const ast = {
      children: [
        { type: 'dialogue', text: '第一行。', lineStart: 1, lineEnd: 1 },
        { type: 'dialogue', text: '第二行。', lineStart: 2, lineEnd: 2 },
      ],
    };

    const { container } = render(<ScriptPresentationRenderer ast={ast} mode="columns" showLineUnderline />);

    const lineGuideContainer = container.querySelector('[data-line-underlines]');
    expect(lineGuideContainer?.getAttribute('data-line-underlines')).toBe('true');
    expect(lineGuideContainer?.className || '').toContain('divide-y');
  });

  it('renders timeline mode rows', () => {
    const ast = {
      children: [
        { type: 'character', text: '阿哲', lineStart: 1, lineEnd: 1 },
        { type: 'dialogue', text: '收到。', lineStart: 2, lineEnd: 2 },
      ],
    };

    render(<ScriptPresentationRenderer ast={ast} mode="timeline" />);

    expect(screen.getAllByText('主對白').length).toBeGreaterThan(0);
    expect(screen.getByText('收到。')).toBeInTheDocument();
  });

  // Capability matrix: showLineUnderline unsupported in timeline and linear modes.
  // These tests lock the unsupported contract so regressions are caught.
  it('timeline mode does not render data-line-underlines attribute (unsupported)', () => {
    const ast = {
      children: [
        { type: 'dialogue', text: '第一行。', lineStart: 1, lineEnd: 1 },
      ],
    };
    const { container } = render(
      <ScriptPresentationRenderer ast={ast} mode="timeline" showLineUnderline />
    );
    expect(container.querySelector('[data-line-underlines]')).toBeNull();
  });

  it('linear mode does not render data-line-underlines attribute (unsupported)', () => {
    const ast = {
      children: [
        { type: 'dialogue', text: '第一行。', lineStart: 1, lineEnd: 1 },
      ],
    };
    const { container } = render(
      <ScriptPresentationRenderer ast={ast} mode="linear" showLineUnderline />
    );
    expect(container.querySelector('[data-line-underlines]')).toBeNull();
  });

  it('renders linear mode for mobile auto presentation', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query === '(max-width: 767px)',
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    })) as typeof window.matchMedia;

    try {
      const ast = {
        children: [
          { type: 'layer', layerType: 'rule-se-single', text: '門聲', lineStart: 1, lineEnd: 1 },
          { type: 'dialogue', text: '收到。', lineStart: 2, lineEnd: 2 },
        ],
      };

      const { container } = render(<ScriptPresentationRenderer ast={ast} mode="auto" />);

      expect(container.querySelector('[data-presentation-mode="linear"]')).toBeTruthy();
      expect(container.querySelector('[data-presentation-mode="columns"]')).toBeNull();
      expect(screen.queryByText('音效')).not.toBeInTheDocument();
      expect(screen.getByText('門聲')).toBeInTheDocument();
      expect(screen.getByText('收到。')).toBeInTheDocument();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
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
    const { container } = render(<ScriptPresentationRenderer ast={ast} markerConfigs={markerConfigs} mode="columns" />);

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
    const { container } = render(<ScriptPresentationRenderer ast={ast} markerConfigs={markerConfigs} mode="columns" />);

    expect(container.querySelector('[data-marker-id="dialogue"]')).toBeNull();
    expect(screen.getAllByText('#D 仍然是台詞內容。').length).toBeGreaterThan(0);
  });
});
