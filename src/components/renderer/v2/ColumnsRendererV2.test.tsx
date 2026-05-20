import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ColumnsRendererV2 } from './ColumnsRendererV2';
import type { OrchestratedDocument } from '../../../lib/v2';

const makeDoc = (): OrchestratedDocument => ({
  version: 2,
  layoutConfig: {
    version: 1,
    renderMode: 'columns',
    fallbackTrackId: 'main',
    tracks: [
      { id: 'sfx', name: '音效', role: 'sfx', order: 10, enabled: true, desktopWidth: 0.2 },
      { id: 'main', name: '主對白', role: 'dialogue', order: 20, enabled: true, desktopWidth: 0.6 },
      { id: 'secondary', name: '副對白', role: 'dialogue', order: 30, enabled: true, desktopWidth: 0.2 },
    ],
    routingRules: [],
  },
  lanes: [
    { trackId: 'sfx', events: [{ id: 'e1', kind: 'sfx', text: '門聲', lineSpan: { start: 1, end: 1 } }] },
    { trackId: 'main', events: [{ id: 'e2', kind: 'speech', text: '你好', lineSpan: { start: 2, end: 2 } }] },
    { trackId: 'secondary', events: [] },
  ],
  unassignedEvents: [],
});

describe('ColumnsRendererV2', () => {
  it('renders tracks and emits dynamic desktop column template var', () => {
    const doc = makeDoc();
    const { container } = render(<ColumnsRendererV2 doc={doc} />);

    expect(screen.getAllByText('音效').length).toBeGreaterThan(0);
    expect(screen.getAllByText('主對白').length).toBeGreaterThan(0);

    const grid = container.firstElementChild as HTMLElement;
    expect(grid).toBeTruthy();
    expect(grid.style.getPropertyValue('--v2-track-columns')).toContain('minmax(0,');
  });

  it('aligns events by source line rows instead of stacking each track independently', () => {
    const doc = makeDoc();
    const { container } = render(<ColumnsRendererV2 doc={doc} />);

    const rows = container.querySelectorAll('[data-v2-line-row]');
    expect(rows.length).toBe(2);
    expect(rows[0].getAttribute('data-v2-line-row')).toBe('1');
    expect(rows[1].getAttribute('data-v2-line-row')).toBe('2');
    expect(rows[0].querySelector('[data-track-id="sfx"]')?.getAttribute('data-has-events')).toBe('true');
    expect(rows[0].querySelector('[data-track-id="main"]')?.getAttribute('data-has-events')).toBe('false');
    expect(rows[1].querySelector('[data-track-id="sfx"]')?.getAttribute('data-has-events')).toBe('false');
    expect(rows[1].querySelector('[data-track-id="main"]')?.getAttribute('data-has-events')).toBe('true');
  });

  it('preserves empty source lines between routed events', () => {
    const doc = makeDoc();
    doc.lanes[1].events[0].lineSpan = { start: 4, end: 4 };

    const { container } = render(<ColumnsRendererV2 doc={doc} />);

    const rows = container.querySelectorAll('[data-v2-line-row]');
    expect(Array.from(rows).map((row) => row.getAttribute('data-v2-line-row'))).toEqual(['1', '2', '3', '4']);
    expect(rows[1].querySelector('[data-track-id="sfx"]')?.getAttribute('data-has-events')).toBe('false');
    expect(rows[1].querySelector('[data-track-id="main"]')?.getAttribute('data-has-events')).toBe('false');
    expect(rows[2].querySelector('[data-track-id="sfx"]')?.getAttribute('data-has-events')).toBe('false');
    expect(rows[2].querySelector('[data-track-id="main"]')?.getAttribute('data-has-events')).toBe('false');
    expect(rows[3].querySelector('[data-track-id="main"]')?.getAttribute('data-has-events')).toBe('true');
  });

  it('can group adjacent dialogue tracks into the same row', () => {
    const doc = makeDoc();
    doc.layoutConfig.rowGrouping = 'adjacent_dialogue';
    doc.lanes[0].events = [];
    doc.lanes[1].events = [{ id: 'a', kind: 'speech', text: '你好', lineSpan: { start: 1, end: 1 } }];
    doc.lanes[2].events = [{ id: 'b', kind: 'speech', text: '我在', lineSpan: { start: 2, end: 2 } }];

    const { container } = render(<ColumnsRendererV2 doc={doc} />);

    const rows = container.querySelectorAll('[data-v2-line-row]');
    expect(rows.length).toBe(1);
    expect(rows[0].getAttribute('data-v2-line-row')).toBe('1');
    expect(rows[0].querySelector('[data-track-id="main"]')?.textContent).toContain('你好');
    expect(rows[0].querySelector('[data-track-id="secondary"]')?.textContent).toContain('我在');
  });
});
