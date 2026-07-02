import React, { useMemo } from 'react';
import { buildGroupedRows, type OrchestratedDocument, type TrackConfig } from './index';
import type { MarkerConfig } from '@write/script-engine';
import { cn } from './utils';
import { PresentationEventText, applyDisplayTemplate } from './PresentationEventText';

interface ColumnsPresentationRendererProps {
  doc: OrchestratedDocument;
  fontSize?: number;
  lineHeight?: number;
  markerConfigs?: MarkerConfig[];
  hiddenMarkerIds?: string[];
  markerTooltipPrefix?: string | null;
  showLineUnderline?: boolean;
}

export const ColumnsPresentationRenderer = ({
  doc,
  fontSize = 14,
  lineHeight = 1.4,
  markerConfigs = [],
  hiddenMarkerIds = [],
  markerTooltipPrefix = '標記',
  showLineUnderline = false,
}: ColumnsPresentationRendererProps): React.JSX.Element => {
  const hiddenMarkerIdSet = useMemo(
    () => new Set((hiddenMarkerIds || []).map((id) => String(id || "").trim()).filter(Boolean)),
    [hiddenMarkerIds]
  );
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

  const lineRows = useMemo(() => buildGroupedRows(doc, tracks, markerConfigs), [doc, tracks, markerConfigs]);

  const rowMinHeight = `${Math.max(1, fontSize * lineHeight)}px`;
  // Full grid template: gutter + track columns
  const fullTemplateColumns = `28px ${desktopTemplateColumns}`;

  // Build markerConfigById for style lookup
  const markerConfigById = useMemo(
    () => new Map(markerConfigs.filter((m) => m.id).map((m) => [m.id, m])),
    [markerConfigs]
  );

  // Build range spans per track from doc.rangeSpans (structured metadata).
  // Prefer the marker's explicit track route; fall back to the document fallback track.
  const rangeSpansByTrack = useMemo(() => {
    const result = new Map<string, Array<{ markerId: string; startLine: number; endLine: number; style?: React.CSSProperties }>>();
    const enabledTrackIds = new Set(doc.lanes.map((lane) => lane.trackId));
    for (const span of doc.rangeSpans ?? []) {
      if (hiddenMarkerIdSet.has(String(span.markerId || ""))) continue;
      const mCfg = markerConfigById.get(span.markerId);
      const style = mCfg?.style && typeof mCfg.style === 'object' ? mCfg.style as React.CSSProperties : undefined;
      const configuredTrackId = typeof mCfg?.v2TrackId === 'string' ? mCfg.v2TrackId.trim() : '';
      const fallbackTrackId = doc.layoutConfig.fallbackTrackId;
      const targetTrackId = enabledTrackIds.has(configuredTrackId)
        ? configuredTrackId
        : enabledTrackIds.has(fallbackTrackId)
          ? fallbackTrackId
          : '';
      if (!targetTrackId) continue;
      if (!result.has(targetTrackId)) result.set(targetTrackId, []);
      result.get(targetTrackId)!.push({ markerId: span.markerId, startLine: span.startLine, endLine: span.endLine, style });
    }
    return result;
  }, [doc.rangeSpans, doc.lanes, doc.layoutConfig.fallbackTrackId, markerConfigById, hiddenMarkerIdSet]);

  return (
    <div className="w-full" style={{ ['--presentation-track-columns' as string]: desktopTemplateColumns }} data-presentation-mode="columns">
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
        <div
          className={cn(showLineUnderline && "divide-y divide-border/10")}
          data-line-underlines={showLineUnderline ? "true" : "false"}
        >
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

              {(() => {
                // Pre-compute per-track cell info for this row
                const cellInfos = tracks.map((track) => {
                  const events = (row.eventsByTrackId.get(track.id) || []).filter((event) => {
                    if (!event?.markerId) return true;
                    return !hiddenMarkerIdSet.has(String(event.markerId));
                  });
                  const spans = rangeSpansByTrack.get(track.id) || [];
                  const activeRangeSpan = spans.find((s) => row.line >= s.startLine && row.line <= s.endLine);
                  return { track, events, activeRangeSpan };
                });

                // Compute colspan for each cell: span right over consecutive empty cells.
                // Only cells with actual events may span; a cell with only a rangeSpan (background
                // colour block) must occupy exactly its own column and never absorb neighbours.
                // A right-side cell is "absorbable" only if it has no events AND no activeRangeSpan.
                const colspans = cellInfos.map((cell, i) => {
                  if (cell.events.length === 0) return 1; // no events: never span (rangeSpan or empty)
                  let span = 1;
                  for (let j = i + 1; j < cellInfos.length; j++) {
                    const right = cellInfos[j];
                    if (right.events.length === 0 && !right.activeRangeSpan) {
                      span++;
                    } else {
                      break;
                    }
                  }
                  return span;
                });

                // Track which indices are absorbed by a previous cell's colspan
                const absorbed = new Set<number>();
                colspans.forEach((span, i) => {
                  if (absorbed.has(i)) return;
                  for (let j = i + 1; j < i + span; j++) absorbed.add(j);
                });

                return cellInfos.map((cell, i) => {
                  if (absorbed.has(i)) return null;
                  const { track, events, activeRangeSpan } = cell;
                  const span = colspans[i];
                  const isRangeStart = activeRangeSpan && row.line === activeRangeSpan.startLine;
                  const isRangeEnd = activeRangeSpan && row.line === activeRangeSpan.endLine;
                  const rangeStyle = activeRangeSpan?.style;
                  const hasContent = events.length > 0 || Boolean(activeRangeSpan);
                  const isLastVisible = i + span === tracks.length;
                  return (
                    <div
                      key={`${row.line}-${track.id}`}
                      className={cn(
                        "border-r border-border/20 min-w-0",
                        isLastVisible && "border-r-0",
                        !hasContent && "min-h-[2rem]",
                      )}
                      style={span > 1 ? { gridColumn: `span ${span}` } : undefined}
                      data-track-id={track.id}
                      data-has-events={events.length > 0 ? "true" : "false"}
                      aria-hidden={!hasContent}
                    >
                      {events.length > 0 ? events.map((event) => {
                        const mCfg = event.markerId ? markerConfigById.get(event.markerId) : undefined;
                        const mStyle = mCfg?.style && typeof mCfg.style === 'object' ? mCfg.style as React.CSSProperties : undefined;
                        const markerLabel = String(mCfg?.label || mCfg?.name || mCfg?.id || event.markerId || '').trim();
                        const role = event.attrs?.role as string | undefined;
                        const shapeStyle: React.CSSProperties | undefined = mStyle && (role === 'range_start' || role === 'range_end')
                          ? { ...mStyle, borderRadius: role === 'range_start' ? '4px 4px 0 0' : '0 0 4px 4px' }
                          : mStyle;
                        return (
                          <article
                            key={event.id}
                            className={cn("px-3 py-1.5 break-words", !mStyle && "bg-card/50")}
                            style={shapeStyle}
                            data-marker-id={event.markerId || undefined}
                            data-marker-label={markerLabel || undefined}
                            data-line-start={event.lineSpan?.start ?? row.line}
                            data-line-end={event.lineSpan?.end ?? event.lineSpan?.start ?? row.line}
                          >
                            {event.speakerId && (
                              <div className="mb-0.5 text-[11px] text-muted-foreground/70">{event.speakerId}</div>
                            )}
                            <p className="whitespace-pre-wrap" style={{ fontSize, lineHeight }}>
                              <PresentationEventText
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
                });
              })()}
            </div>
          ))}
        </div>
    </div>
  );
};
