import React, { useMemo } from 'react';
import type { OrchestratedDocument, ScriptEvent } from '../../../lib/v2';
import type { MarkerConfig } from '../../../types/script';
import { EventTextV2, applyDisplayTemplate } from './EventTextV2';

interface TimelineRendererV2Props {
  doc: OrchestratedDocument;
  fontSize?: number;
  lineHeight?: number;
  markerConfigs?: MarkerConfig[];
  hiddenMarkerIds?: string[];
  markerTooltipPrefix?: string;
}

interface TimelineRow {
  event: ScriptEvent;
  trackId: string;
  trackName: string;
}

export const TimelineRendererV2 = ({
  doc,
  fontSize = 14,
  lineHeight = 1.4,
  markerConfigs = [],
  hiddenMarkerIds = [],
  markerTooltipPrefix = '標記',
}: TimelineRendererV2Props): React.JSX.Element => {
  const hiddenMarkerIdSet = useMemo(
    () => new Set((hiddenMarkerIds || []).map((id) => String(id || "").trim()).filter(Boolean)),
    [hiddenMarkerIds]
  );
  const trackNameById = useMemo(() => {
    const map = new Map<string, string>();
    doc.layoutConfig.tracks.forEach((track) => map.set(track.id, track.name));
    return map;
  }, [doc.layoutConfig.tracks]);

  const markerConfigById = useMemo(
    () => new Map(markerConfigs.filter((m) => m.id).map((m) => [m.id, m])),
    [markerConfigs]
  );

  const rows = useMemo<TimelineRow[]>(() => {
    const list: TimelineRow[] = [];
    doc.lanes.forEach((lane) => {
      lane.events.forEach((event) => {
        if (event.markerId && hiddenMarkerIdSet.has(String(event.markerId))) return;
        list.push({
          event,
          trackId: lane.trackId,
          trackName: trackNameById.get(lane.trackId) || lane.trackId,
        });
      });
    });
    doc.unassignedEvents.forEach((event) => {
      if (event.markerId && hiddenMarkerIdSet.has(String(event.markerId))) return;
      list.push({
        event,
        trackId: '__unassigned__',
        trackName: '未分配',
      });
    });
    return list.sort((a, b) => a.event.lineSpan.start - b.event.lineSpan.start);
  }, [doc.lanes, doc.unassignedEvents, trackNameById, hiddenMarkerIdSet]);

  return (
    <div className="space-y-2">
      {rows.map((row) => (
        <div key={row.event.id} className="rounded border border-border/60 bg-background p-2" data-track-id={row.trackId}>
          <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded bg-muted px-1.5 py-0.5">{row.trackName}</span>
            <span>L{row.event.lineSpan.start}</span>
            {row.event.speakerId ? <span>{row.event.speakerId}</span> : null}
          </div>
          <p className="whitespace-pre-wrap" style={{ fontSize, lineHeight }}>
            <EventTextV2
              text={applyDisplayTemplate(row.event.text, row.event.markerId ? markerConfigById.get(row.event.markerId) : undefined)}
              markerConfigs={markerConfigs}
              hiddenMarkerIds={hiddenMarkerIds}
              markerTooltipPrefix={markerTooltipPrefix}
            />
          </p>
        </div>
      ))}
    </div>
  );
};
