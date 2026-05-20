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
            <article style="background-color:#ffeeaa;">
              <p><span style="color:#123456;font-weight:700;">台詞</span><span style="font-style:italic;">補充</span></p>
            </article>
          </div>
          <div data-track-id="sfx"></div>
        </div>
      </div>
    `);

    expect(out?.columns).toEqual(['行號', '主對白', '音效']);
    expect(out?.rows).toEqual([['7', '台詞補充', '']]);
    expect(out?.cellStyles?.[0][1]).toEqual({ backgroundColor: '#FFEEAA' });
    expect(out?.cellRuns?.[0][1]).toEqual([
      { text: '台詞', bold: true, italic: false, underline: false, color: '#123456' },
      { text: '補充', bold: false, italic: true, underline: false, color: '#000000' },
    ]);
  });
});
