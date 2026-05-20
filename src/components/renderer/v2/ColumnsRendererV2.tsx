import React, { useMemo } from 'react';
import type { OrchestratedDocument, TrackConfig } from '../../../lib/v2';
import type { MarkerConfig } from '../../../types/script';
import { cn } from '../../../lib/utils';
import { EventTextV2, applyDisplayTemplate } from './EventTextV2';

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
    () => {
      const enabledTracks = doc.layoutConfig.tracks.filter((track) => track.enabled).sort((a, b) => a.order - b.order);
      if (!doc.unassignedEvents?.length) return enabledTracks;
      const unassignedTrack: TrackConfig = {
        id: '__unassigned__',
        name: '未分配',
        role: 'custom',
        order: Number.MAX_SAFE_INTEGER,
        enabled: true,
      };
      return [...enabledTracks, unassignedTrack];
    },
    [doc.layoutConfig.tracks, doc.unassignedEvents]
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
    doc.unassignedEvents.forEach((event) => {
      const line = Number.isFinite(event.lineSpan?.start) ? Number(event.lineSpan.start) : 1;
      minLine = Math.min(minLine, line);
      maxLine = Math.max(maxLine, line);
      if (!rows.has(line)) rows.set(line, new Map());
      const row = rows.get(line);
      if (!row) return;
      const existing = row.get('__unassigned__') || [];
      row.set('__unassigned__', [...existing, event]);
    });

    if (!Number.isFinite(minLine) || maxLine <= 0) return [];

    const lineCount = maxLine - minLine + 1;
    return Array.from({ length: lineCount }, (_, index) => {
      const line = minLine + index;
      return { line, eventsByTrackId: rows.get(line) || new Map() };
    });
  }, [doc.lanes, doc.unassignedEvents]);

  const rowMinHeight = `${Math.max(1, fontSize * lineHeight)}px`;
  // Full grid template: gutter + track columns
  const fullTemplateColumns = `28px ${desktopTemplateColumns}`;

  // Build markerConfigById for style lookup
  const markerConfigById = useMemo(
    () => new Map(markerConfigs.filter((m) => m.id).map((m) => [m.id, m])),
    [markerConfigs]
  );

  // Build range spans per track: { trackId -> [{ markerId, startLine, endLine, style }] }
  const rangeSpansByTrack = useMemo(() => {
    const result = new Map<string, Array<{ markerId: string; startLine: number; endLine: number; style?: React.CSSProperties }>>();
    doc.lanes.forEach((lane) => {
      const pending = new Map<string, number>(); // markerId -> startLine
      lane.events.forEach((event) => {
        if (!event.markerId) return;
        const role = event.attrs?.role as string | undefined;
        if (role === 'range_start') {
          pending.set(event.markerId, event.lineSpan.start);
        } else if (role === 'range_end') {
          const startLine = pending.get(event.markerId);
          if (startLine !== undefined) {
            const mCfg = markerConfigById.get(event.markerId);
            const style = mCfg?.style && typeof mCfg.style === 'object' ? mCfg.style as React.CSSProperties : undefined;
            if (!result.has(lane.trackId)) result.set(lane.trackId, []);
            result.get(lane.trackId)!.push({ markerId: event.markerId, startLine, endLine: event.lineSpan.end, style });
            pending.delete(event.markerId);
          }
        }
      });
    });
    return result;
  }, [doc.lanes, markerConfigById]);

  return (
    <div className="w-full" style={{ ['--v2-track-columns' as string]: desktopTemplateColumns }} data-v2-presentation="columns">
        {/* Header row: gutter + track name headers */}
        <div
          className="grid mb-1 sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border/30"
          style={{ gridTemplateColumns: fullTemplateColumns }}
        >
          <div className="border-r border-border/20" />
          {tracks.map((track) => (
            <div key={track.id} className="border-r last:border-r-0 border-border/20 px-3 py-2 text-sm font-semibold text-foreground/80" data-track-id={track.id}>
              {track.name}
            </div>
          ))}
        </div>

        {/* Content rows */}
        <div className="divide-y divide-border/10">
          {lineRows.map((row) => (
            <div
              key={row.line}
              className="grid"
              style={{ gridTemplateColumns: fullTemplateColumns, minHeight: rowMinHeight }}
              data-v2-line-row={row.line}
            >
              {/* Line number gutter */}
              <div className="border-r border-border/20 flex items-start justify-center pt-2 text-[10px] font-mono text-muted-foreground/40 select-none shrink-0">
                {row.line}
              </div>

              {tracks.map((track) => {
                const events = row.eventsByTrackId.get(track.id) || [];
                const spans = rangeSpansByTrack.get(track.id) || [];
                const activeRangeSpan = spans.find((s) => row.line >= s.startLine && row.line <= s.endLine);
                const isRangeStart = activeRangeSpan && row.line === activeRangeSpan.startLine;
                const isRangeEnd = activeRangeSpan && row.line === activeRangeSpan.endLine;
                const rangeStyle = activeRangeSpan?.style;
                const hasContent = events.length > 0 || Boolean(activeRangeSpan);
                return (
                  <div
                    key={`${row.line}-${track.id}`}
                    className={cn("border-r last:border-r-0 border-border/20 min-w-0", !hasContent && "min-h-[2rem]")}
                    data-track-id={track.id}
                    data-has-events={events.length > 0 ? "true" : "false"}
                    aria-hidden={!hasContent}
                  >
                    {events.length > 0 ? events.map((event) => {
                      const mCfg = event.markerId ? markerConfigById.get(event.markerId) : undefined;
                      const mStyle = mCfg?.style && typeof mCfg.style === 'object' ? mCfg.style as React.CSSProperties : undefined;
                      const role = event.attrs?.role as string | undefined;
                      const shapeStyle: React.CSSProperties | undefined = mStyle && (role === 'range_start' || role === 'range_end')
                        ? { ...mStyle, borderRadius: role === 'range_start' ? '4px 4px 0 0' : '0 0 4px 4px' }
                        : mStyle;
                      return (
                        <article
                          key={event.id}
                          className={cn("px-3 py-1.5 break-words", !mStyle && "bg-card/50")}
                          style={shapeStyle}
                        >
                          {event.speakerId && (
                            <div className="mb-0.5 text-[11px] text-muted-foreground/70">{event.speakerId}</div>
                          )}
                          <p className="whitespace-pre-wrap" style={{ fontSize, lineHeight }}>
                            <EventTextV2
                              text={applyDisplayTemplate(event.text, mCfg)}
                              markerConfigs={markerConfigs}
                              hiddenMarkerIds={hiddenMarkerIds}
                              markerTooltipPrefix={markerTooltipPrefix}
                            />
                          </p>
                        </article>
                      );
                    }) : activeRangeSpan ? (
                      <div
                        className="h-full min-h-[2rem]"
                        style={rangeStyle?.backgroundColor
                          ? { backgroundColor: rangeStyle.backgroundColor, opacity: 0.3,
                              borderRadius: isRangeStart ? '0 4px 0 0' : isRangeEnd ? '0 0 4px 0' : '0' }
                          : undefined}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
    </div>
  );
};
