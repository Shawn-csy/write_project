import React, { useMemo } from 'react';
import type { OrchestratedDocument, ScriptEvent, TrackConfig } from '../../../lib/v2';
import type { MarkerConfig } from '../../../types/script';
import { cn } from '../../../lib/utils';
import { EventTextV2, applyDisplayTemplate } from './EventTextV2';

interface LinearRendererV2Props {
  doc: OrchestratedDocument;
  fontSize?: number;
  lineHeight?: number;
  markerConfigs?: MarkerConfig[];
  hiddenMarkerIds?: string[];
  markerTooltipPrefix?: string;
}

interface LinearRow {
  line: number;
  track: TrackConfig;
  event: ScriptEvent;
}

export const LinearRendererV2 = ({
  doc,
  fontSize = 14,
  lineHeight = 1.4,
  markerConfigs = [],
  hiddenMarkerIds = [],
  markerTooltipPrefix = '標記',
}: LinearRendererV2Props): React.JSX.Element => {
  const trackById = useMemo(() => {
    const map = new Map<string, TrackConfig>();
    doc.layoutConfig.tracks.forEach((track) => map.set(track.id, track));
    return map;
  }, [doc.layoutConfig.tracks]);

  const markerConfigById = useMemo(
    () => new Map(markerConfigs.filter((m) => m.id).map((m) => [m.id, m])),
    [markerConfigs]
  );

  const rows = useMemo<LinearRow[]>(() => {
    const list: LinearRow[] = [];

    doc.lanes.forEach((lane) => {
      const track = trackById.get(lane.trackId);
      if (!track || track.mobileBehavior === 'collapse') return;
      lane.events.forEach((event) => {
        list.push({
          line: Number.isFinite(event.lineSpan?.start) ? Number(event.lineSpan.start) : 1,
          track,
          event,
        });
      });
    });

    return list.sort((a, b) => a.line - b.line || a.event.id.localeCompare(b.event.id));
  }, [doc.lanes, trackById]);

  return (
    <div className="space-y-1 px-3 py-2" data-v2-presentation="linear">
      {rows.map(({ line, track, event }) => {
        const mCfg = event.markerId ? markerConfigById.get(event.markerId) : undefined;
        const mStyle = mCfg?.style && typeof mCfg.style === 'object' ? mCfg.style as React.CSSProperties : undefined;
        const showTrackBadge = track.mobileBehavior === 'badge';

        return (
          <div
            key={event.id}
            className="grid grid-cols-[28px_minmax(0,1fr)] gap-2"
            data-track-id={track.id}
            data-v2-line={line}
          >
            <div className="pt-2 text-center font-mono text-[10px] text-muted-foreground/45 select-none">
              {line}
            </div>
            <article
              className={cn("min-w-0 px-3 py-1.5 rounded break-words", !mStyle && "bg-card/50 border border-border/30")}
              style={mStyle}
            >
              {(showTrackBadge || event.speakerId) ? (
                <div className="mb-0.5 flex items-center gap-2 text-[10px] text-muted-foreground/60">
                  {showTrackBadge ? <span>{track.name}</span> : null}
                  {event.speakerId ? <span>{event.speakerId}</span> : null}
                </div>
              ) : null}
              <p className="whitespace-pre-wrap" style={{ fontSize, lineHeight }}>
                <EventTextV2
                  text={applyDisplayTemplate(event.text, mCfg)}
                  markerConfigs={markerConfigs}
                  hiddenMarkerIds={hiddenMarkerIds}
                  markerTooltipPrefix={markerTooltipPrefix}
                />
              </p>
            </article>
          </div>
        );
      })}
    </div>
  );
};
