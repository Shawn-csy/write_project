import React, { useMemo } from 'react';
import type { OrchestratedDocument } from '../../../lib/v2';
import type { MarkerConfig } from '../../../types/script';
import { EventTextV2 } from './EventTextV2';

interface ColumnsRendererV2Props {
  doc: OrchestratedDocument;
  fontSize?: number;
  lineHeight?: number;
  markerConfigs?: MarkerConfig[];
  hiddenMarkerIds?: string[];
  markerTooltipPrefix?: string;
}

interface LineRow {
  line: number;
  eventsByTrackId: Map<string, OrchestratedDocument['lanes'][number]['events']>;
}

export const ColumnsRendererV2 = ({
  doc,
  fontSize = 14,
  lineHeight = 1.4,
  markerConfigs = [],
  hiddenMarkerIds = [],
  markerTooltipPrefix = '標記',
}: ColumnsRendererV2Props): React.JSX.Element => {
  const tracks = useMemo(
    () => doc.layoutConfig.tracks.filter((track) => track.enabled).sort((a, b) => a.order - b.order),
    [doc.layoutConfig.tracks]
  );
  const desktopTemplateColumns = useMemo(() => {
    if (tracks.length === 0) return 'minmax(0, 1fr)';
    const normalized = tracks.map((track) => {
      const width = Number(track.desktopWidth);
      if (!Number.isFinite(width) || width <= 0) return 1;
      return width;
    });
    const total = normalized.reduce((sum, width) => sum + width, 0) || tracks.length;
    return normalized
      .map((width) => {
        const ratio = width / total;
        return `minmax(0, ${Math.max(0.12, ratio).toFixed(4)}fr)`;
      })
      .join(' ');
  }, [tracks]);

  const lineRows = useMemo<LineRow[]>(() => {
    const rows = new Map<number, Map<string, OrchestratedDocument['lanes'][number]['events']>>();
    let minLine = Number.POSITIVE_INFINITY;
    let maxLine = 0;

    doc.lanes.forEach((lane) => {
      lane.events.forEach((event) => {
        const line = Number.isFinite(event.lineSpan?.start) ? Number(event.lineSpan.start) : 1;
        minLine = Math.min(minLine, line);
        maxLine = Math.max(maxLine, line);
        if (!rows.has(line)) rows.set(line, new Map());
        const row = rows.get(line);
        if (!row) return;
        const existing = row.get(lane.trackId) || [];
        row.set(lane.trackId, [...existing, event]);
      });
    });

    if (!Number.isFinite(minLine) || maxLine <= 0) return [];

    const lineCount = maxLine - minLine + 1;
    return Array.from({ length: lineCount }, (_, index) => {
      const line = minLine + index;
      return { line, eventsByTrackId: rows.get(line) || new Map() };
    });
  }, [doc.lanes]);

  const rowMinHeight = `${Math.max(1, fontSize * lineHeight)}px`;

  return (
    <div className="space-y-1" style={{ ['--v2-track-columns' as string]: desktopTemplateColumns }}>
      <div className="hidden gap-3 md:grid md:[grid-template-columns:var(--v2-track-columns)]">
        {tracks.map((track) => (
          <div key={track.id} className="rounded-md border border-border/60 bg-card px-3 py-2 text-sm font-semibold" data-track-id={track.id}>
            {track.name}
          </div>
        ))}
      </div>

      <div className="space-y-1">
        {lineRows.map((row) => (
          <div
            key={row.line}
            className="grid grid-cols-1 gap-2 md:gap-3 md:[grid-template-columns:var(--v2-track-columns)]"
            style={{ minHeight: rowMinHeight }}
            data-v2-line-row={row.line}
          >
            {tracks.map((track) => {
              const events = row.eventsByTrackId.get(track.id) || [];
              return (
                <div
                  key={`${row.line}-${track.id}`}
                  className={events.length > 0 ? "min-w-0 space-y-1" : "hidden min-h-[1.75rem] md:block"}
                  data-track-id={track.id}
                  data-has-events={events.length > 0 ? "true" : "false"}
                  aria-hidden={events.length === 0}
                >
                  {events.map((event) => (
                    <article key={event.id} className="rounded border border-border/40 bg-background px-2 py-1.5">
                      <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="md:hidden">{track.name}</span>
                        <span>L{event.lineSpan.start}</span>
                        {event.speakerId ? <span>{event.speakerId}</span> : null}
                      </div>
                      <p className="whitespace-pre-wrap" style={{ fontSize, lineHeight }}>
                        <EventTextV2
                          text={event.text}
                          markerConfigs={markerConfigs}
                          hiddenMarkerIds={hiddenMarkerIds}
                          markerTooltipPrefix={markerTooltipPrefix}
                        />
                      </p>
                    </article>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
