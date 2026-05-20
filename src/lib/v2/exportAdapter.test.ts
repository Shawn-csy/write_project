import { describe, expect, it } from 'vitest';
import { buildV2TableExport, buildV2TableExportFromRenderedHtml } from './exportAdapter';
import { cloneDefaultLayoutConfig } from './defaultLayoutConfig';
import type { OrchestratedDocument } from './types';

describe('buildV2TableExport', () => {
  it('includes unassigned events as a dedicated column', () => {
    const layoutConfig = cloneDefaultLayoutConfig();
    const doc: OrchestratedDocument = {
      version: 2,
      layoutConfig,
      lanes: [
        {
          trackId: 'main',
          events: [
            {
              id: 'e1',
              kind: 'speech',
              text: '主軌內容',
              lineSpan: { start: 1, end: 1 },
            },
          ],
        },
      ],
      unassignedEvents: [
        {
          id: 'u1',
          kind: 'custom',
          text: '未分配內容',
          lineSpan: { start: 1, end: 1 },
        },
      ],
    };

    const out = buildV2TableExport(doc);

    expect(out.columns).toContain('未分配');
    expect(out.rows).toHaveLength(1);
    const row = out.rows[0];
    const rowRecord = Object.fromEntries(out.columns.map((col, idx) => [col, row[idx]]));
    const mainTrackName = layoutConfig.tracks.find((track) => track.id === 'main')?.name;
    expect(rowRecord['行號']).toBe('1');
    expect(rowRecord[String(mainTrackName)]).toBe('主軌內容');
    expect(rowRecord['未分配']).toBe('未分配內容');
    const mainTrackColIdx = out.columns.indexOf(String(mainTrackName));
    expect(mainTrackColIdx).toBeGreaterThan(0);
    expect(out.cellStyles).toBeUndefined();
  });

  it('uses adjacent dialogue grouping in fallback table export', () => {
    const layoutConfig = cloneDefaultLayoutConfig();
    layoutConfig.rowGrouping = 'adjacent_dialogue';
    const doc: OrchestratedDocument = {
      version: 2,
      layoutConfig,
      lanes: [
        { trackId: 'sfx', events: [] },
        {
          trackId: 'main',
          events: [{ id: 'a', kind: 'speech', text: '你好', lineSpan: { start: 1, end: 1 } }],
        },
        {
          trackId: 'secondary',
          events: [{ id: 'b', kind: 'speech', text: '我在', lineSpan: { start: 2, end: 2 } }],
        },
      ],
      unassignedEvents: [],
    };

    const out = buildV2TableExport(doc);
    const mainTrackName = layoutConfig.tracks.find((track) => track.id === 'main')?.name || '';
    const secondaryTrackName = layoutConfig.tracks.find((track) => track.id === 'secondary')?.name || '';
    const rowRecord = Object.fromEntries(out.columns.map((col, idx) => [col, out.rows[0][idx]]));

    expect(out.rows).toHaveLength(1);
    expect(rowRecord['行號']).toBe('1');
    expect(rowRecord[mainTrackName]).toBe('你好');
    expect(rowRecord[secondaryTrackName]).toBe('我在');
  });

  it('builds styled table cells from rendered v2 HTML', () => {
    const out = buildV2TableExportFromRenderedHtml(`
      <div data-v2-presentation="columns">
        <div class="sticky">
          <div></div>
          <div data-track-id="main">主對白</div>
          <div data-track-id="sfx">音效</div>
        </div>
        <div data-v2-line-row="7">
          <div>7</div>
          <div data-track-id="main">
            <article style="background-color:#ffeeaa;padding:6px 12px;">
              <p><span style="color:#123456;font-weight:700;">台詞</span><span style="font-style:italic;">補充</span></p>
            </article>
          </div>
          <div data-track-id="sfx"></div>
        </div>
      </div>
    `);

    expect(out?.columns).toEqual(['行號', '主對白', '音效']);
    expect(out?.rows).toEqual([['7', '台詞補充', '']]);
    expect(out?.tableLayout?.columnWidths).toEqual([28, 1, 1]);
    expect(out?.tableLayout?.defaultCellStyle).toEqual({
      paddingTop: 6,
      paddingRight: 12,
      paddingBottom: 6,
      paddingLeft: 12,
    });
    expect(out?.cellStyles?.[0][1]).toEqual({
      backgroundColor: '#FFEEAA',
      paddingTop: 6,
      paddingRight: 12,
      paddingBottom: 6,
      paddingLeft: 12,
    });
    expect(out?.cellRuns?.[0][1]).toEqual([
      { text: '台詞', bold: true, italic: false, underline: false, color: '#123456' },
      { text: '補充', bold: false, italic: true, underline: false, color: '#000000' },
    ]);
  });
});
