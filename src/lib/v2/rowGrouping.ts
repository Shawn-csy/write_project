import type { MarkerConfig } from '../../types/script';
import type { OrchestratedDocument, ScriptEvent, TrackConfig } from './types';

export interface V2GroupedRow {
  line: number;
  eventsByTrackId: Map<string, ScriptEvent[]>;
}

interface EventWithTrack {
  event: ScriptEvent;
  track: TrackConfig;
}

const isDialogueEvent = (item: EventWithTrack): boolean =>
  item.event.kind === 'speech' || item.track.role === 'dialogue';

const rowHasDialogueEvent = (row: V2GroupedRow, tracks: TrackConfig[]): boolean =>
  tracks.some((track) => (
    (track.role === 'dialogue' || (row.eventsByTrackId.get(track.id) || []).some((event) => event.kind === 'speech')) &&
    Boolean(row.eventsByTrackId.get(track.id)?.length)
  ));

const pushEvent = (row: V2GroupedRow, trackId: string, event: ScriptEvent) => {
  row.eventsByTrackId.set(trackId, [...(row.eventsByTrackId.get(trackId) ?? []), event]);
};

/**
 * Build a Set of line numbers that fall within any range marker that has
 * enableColumnGrouping=true. Uses doc.rangeSpans (structured metadata) —
 * no lane scanning needed.
 */
const buildColumnGroupingLines = (
  doc: OrchestratedDocument,
  markerConfigs: MarkerConfig[],
): Set<number> => {
  const groupingMarkerIds = new Set(
    markerConfigs
      .filter((m) => m.enableColumnGrouping && m.matchMode === 'range')
      .map((m) => m.id),
  );
  if (groupingMarkerIds.size === 0) return new Set();

  const lines = new Set<number>();
  for (const span of doc.rangeSpans ?? []) {
    if (!groupingMarkerIds.has(span.markerId)) continue;
    for (let l = span.startLine; l <= span.endLine; l++) lines.add(l);
  }
  return lines;
};

const buildColumnGroupingRangeKeys = (
  doc: OrchestratedDocument,
  markerConfigs: MarkerConfig[],
): Map<number, string> => {
  const groupingMarkerIds = new Set(
    markerConfigs
      .filter((m) => m.enableColumnGrouping && m.matchMode === 'range')
      .map((m) => m.id),
  );
  const lineToRangeKey = new Map<number, string>();
  if (groupingMarkerIds.size === 0) return lineToRangeKey;

  for (const span of doc.rangeSpans ?? []) {
    if (!groupingMarkerIds.has(span.markerId)) continue;
    const key = `${span.markerId}:${span.startLine}:${span.endLine}`;
    for (let l = span.startLine; l <= span.endLine; l++) lineToRangeKey.set(l, key);
  }
  return lineToRangeKey;
};

export const buildGroupedRows = (
  doc: OrchestratedDocument,
  tracks: TrackConfig[],
  markerConfigs: MarkerConfig[] = [],
): V2GroupedRow[] => {
  const trackById = new Map(tracks.map((track) => [track.id, track]));
  const events: EventWithTrack[] = [];

  doc.lanes.forEach((lane) => {
    const track = trackById.get(lane.trackId);
    if (!track) return;
    lane.events.forEach((event) => events.push({ event, track }));
  });

  if (doc.unassignedEvents?.length) {
    const unassignedTrack = trackById.get('__unassigned__');
    if (unassignedTrack) {
      doc.unassignedEvents.forEach((event) => events.push({ event, track: unassignedTrack }));
    }
  }

  events.sort((a, b) => (
    a.event.lineSpan.start - b.event.lineSpan.start ||
    a.track.order - b.track.order ||
    a.event.id.localeCompare(b.event.id)
  ));

  if (events.length === 0) return [];

  const rows: V2GroupedRow[] = [];
  const rowByLine = new Map<number, V2GroupedRow>();
  const rangeRowsByKey = new Map<string, V2GroupedRow[]>();
  const mode = doc.layoutConfig.rowGrouping || 'line';

  const columnGroupingLines = mode === 'marker_dialogue'
    ? buildColumnGroupingLines(doc, markerConfigs)
    : null;
  const columnGroupingRangeKeys = mode === 'marker_dialogue'
    ? buildColumnGroupingRangeKeys(doc, markerConfigs)
    : null;

  events.forEach((item) => {
    const line = Number.isFinite(item.event.lineSpan?.start)
      ? Number(item.event.lineSpan.start)
      : 1;
    let row: V2GroupedRow | undefined;

    const inGroupingRange = columnGroupingLines !== null && columnGroupingLines.has(line);
    const allowAdjacent = mode === 'adjacent_dialogue' || (mode === 'marker_dialogue' && inGroupingRange);

    if (allowAdjacent && item.event.text.trim()) {
      const prev = rows[rows.length - 1];
      const prevHasSameTrack = Boolean(prev?.eventsByTrackId.get(item.track.id)?.length);

      if (mode === 'adjacent_dialogue') {
        if (
          prev &&
          isDialogueEvent(item) &&
          rowHasDialogueEvent(prev, tracks) &&
          line === prev.line + 1 &&
          !prevHasSameTrack
        ) {
          row = prev;
        }
      } else if (mode === 'marker_dialogue') {
        const currentRangeKey = columnGroupingRangeKeys?.get(line);
        if (currentRangeKey) {
          // In synchronized range mode, align events by sequence across tracks:
          // place into the earliest row in the same range that does not yet have this track.
          const syncedRows = rangeRowsByKey.get(currentRangeKey) || [];
          row = syncedRows.find((candidate) => !candidate.eventsByTrackId.get(item.track.id)?.length);
        }
        const prevRangeKey = prev ? columnGroupingRangeKeys?.get(prev.line) : undefined;
        if (!row && prev && currentRangeKey && currentRangeKey === prevRangeKey && !prevHasSameTrack) {
          row = prev;
        }
      }
    }

    if (!row) row = rowByLine.get(line);
    if (!row) {
      row = { line, eventsByTrackId: new Map() };
      rows.push(row);
      rowByLine.set(line, row);
      if (mode === 'marker_dialogue') {
        const currentRangeKey = columnGroupingRangeKeys?.get(line);
        if (currentRangeKey) {
          rangeRowsByKey.set(currentRangeKey, [...(rangeRowsByKey.get(currentRangeKey) || []), row]);
        }
      }
    }
    pushEvent(row, item.track.id, item.event);
  });

  if (mode === 'adjacent_dialogue' || mode === 'marker_dialogue') return rows;

  const minLine = rows[0]?.line ?? 0;
  const maxLine = rows[rows.length - 1]?.line ?? 0;
  return Array.from({ length: Math.max(0, maxLine - minLine + 1) }, (_, index) => {
    const line = minLine + index;
    return rowByLine.get(line) || { line, eventsByTrackId: new Map() };
  });
};
