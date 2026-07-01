import { describe, expect, it } from 'vitest';
import { parseScreenplay } from '@write/script-engine';
import { buildPresentationDocumentFromAst } from './astAdapter';
import { cloneDefaultLayoutConfig } from './defaultLayoutConfig';
import { applyMarkerSemanticRoutes } from './markerSemantics';
import { orchestrateDocument } from './orchestrator';
import { buildGroupedRows } from './rowGrouping';
import type { MarkerConfig } from '@write/script-engine';

const markerConfigs: MarkerConfig[] = [
  {
    id: 'sync-dialogue',
    label: '同步對話',
    type: 'block',
    isBlock: true,
    matchMode: 'range',
    start: '<<<',
    end: '>>>',
    enableColumnGrouping: true,
  },
  {
    id: 'angle-1',
    label: '角1',
    type: 'block',
    isBlock: true,
    matchMode: 'range',
    start: '@1',
    end: '/@1',
    v2TrackId: 'main',
    v2RangeOwnsContent: true,
  },
  {
    id: 'angle-2',
    label: '角2',
    type: 'block',
    isBlock: true,
    matchMode: 'range',
    start: '@2',
    end: '/@2',
    v2TrackId: 'secondary',
    v2RangeOwnsContent: true,
  },
];

describe('v2 integration: range routing and synchronized rows', () => {
  it('routes @2 range inner content to secondary lane in full pipeline', () => {
    const text = `@1
AA
/@1

@2
BB
/@2`;

    const parsed = parseScreenplay(text, markerConfigs);
    const layout = applyMarkerSemanticRoutes(cloneDefaultLayoutConfig(), markerConfigs);
    const doc = buildPresentationDocumentFromAst(parsed.ast, { layoutConfig: layout, markerConfigs });
    const out = orchestrateDocument(doc);

    const mainLane = out.lanes.find((lane) => lane.trackId === 'main');
    const secondaryLane = out.lanes.find((lane) => lane.trackId === 'secondary');

    expect(mainLane?.events.some((event) => event.text === 'AA')).toBe(true);
    expect(secondaryLane?.events.some((event) => event.text === 'BB')).toBe(true);
    expect(mainLane?.events.some((event) => event.text === 'BB')).toBe(false);
  });

  it('merges @1/@2 content into the same grouped row inside sync range', () => {
    const text = `<<<
@1
AA
/@1
@2
BB
/@2
>>>`;

    const parsed = parseScreenplay(text, markerConfigs);
    const layout = applyMarkerSemanticRoutes(cloneDefaultLayoutConfig(), markerConfigs);
    layout.rowGrouping = 'marker_dialogue';
    const doc = buildPresentationDocumentFromAst(parsed.ast, { layoutConfig: layout, markerConfigs });
    const out = orchestrateDocument(doc);
    const tracks = layout.tracks.filter((track) => track.enabled).sort((a, b) => a.order - b.order);
    const rows = buildGroupedRows(out, tracks, markerConfigs);

    const syncedRow = rows.find((row) => {
      const mainTexts = (row.eventsByTrackId.get('main') || []).map((event) => event.text);
      const secondaryTexts = (row.eventsByTrackId.get('secondary') || []).map((event) => event.text);
      return mainTexts.includes('AA') && secondaryTexts.includes('BB');
    });

    expect(syncedRow).toBeTruthy();
    expect(rows.length).toBe(1);
  });

  it('keeps range boundary line text visible and routed to the same track', () => {
    const text = `@1 開場白
AA
/@1 收尾`;

    const parsed = parseScreenplay(text, markerConfigs);
    const layout = applyMarkerSemanticRoutes(cloneDefaultLayoutConfig(), markerConfigs);
    const doc = buildPresentationDocumentFromAst(parsed.ast, { layoutConfig: layout, markerConfigs });
    const out = orchestrateDocument(doc);
    const mainLane = out.lanes.find((lane) => lane.trackId === 'main');
    const mainTexts = (mainLane?.events || []).map((event) => event.text);

    expect(mainTexts).toContain('開場白');
    expect(mainTexts).toContain('AA');
    expect(mainTexts).toContain('收尾');
  });

  it('aligns multi-line @1/@2 blocks in sync range by sequence (same-row sync)', () => {
    const text = `<<<
@1 A2
88888
/@1
@2 name
BB
/@2
>>>`;

    const parsed = parseScreenplay(text, markerConfigs);
    const layout = applyMarkerSemanticRoutes(cloneDefaultLayoutConfig(), markerConfigs);
    layout.rowGrouping = 'marker_dialogue';
    const doc = buildPresentationDocumentFromAst(parsed.ast, { layoutConfig: layout, markerConfigs });
    const out = orchestrateDocument(doc);
    const tracks = layout.tracks.filter((track) => track.enabled).sort((a, b) => a.order - b.order);
    const rows = buildGroupedRows(out, tracks, markerConfigs);

    const rowStart = rows.find((row) => {
      const mainTexts = (row.eventsByTrackId.get('main') || []).map((event) => event.text);
      const secondaryTexts = (row.eventsByTrackId.get('secondary') || []).map((event) => event.text);
      return mainTexts.includes('A2') && secondaryTexts.includes('name');
    });
    const rowBody = rows.find((row) => {
      const mainTexts = (row.eventsByTrackId.get('main') || []).map((event) => event.text);
      const secondaryTexts = (row.eventsByTrackId.get('secondary') || []).map((event) => event.text);
      return mainTexts.includes('88888') && secondaryTexts.includes('BB');
    });
    expect(rowStart).toBeTruthy();
    expect(rowBody).toBeTruthy();
  });
});
