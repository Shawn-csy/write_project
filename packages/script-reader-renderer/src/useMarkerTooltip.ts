import { useMemo, useState } from 'react';
import { getMarkerElement, readMarkerAttrs } from './markerDom';

export interface MarkerConfigLike {
  id?: string;
  label?: string;
  name?: string;
  displayName?: string;
}

const TOOLTIP_OFFSET = 14;
const TOOLTIP_MAX_WIDTH = 280;
const TOOLTIP_EDGE_PADDING = 8;
const TOOLTIP_TOP_FALLBACK_THRESHOLD = 96;

export interface TooltipState { text: string; x: number; y: number; }

export function useMarkerTooltip(
  markerConfigs: MarkerConfigLike[],
  markerTooltipPrefix: string | null,
) {
  const [markerTooltip, setMarkerTooltip] = useState<TooltipState | null>(null);

  const markerLabelById = useMemo(() => {
    const map = new Map<string, string>();
    markerConfigs.forEach((cfg) => {
      const id = String(cfg?.id || '').trim();
      if (!id) return;
      map.set(id, String(cfg?.label || cfg?.name || (cfg as any)?.displayName || id).trim());
    });
    return map;
  }, [markerConfigs]);

  const handlePointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (markerTooltipPrefix === null) {
      if (markerTooltip) setMarkerTooltip(null);
      return;
    }
    const markerEl = getMarkerElement(event.target);
    if (!markerEl) { if (markerTooltip) setMarkerTooltip(null); return; }
    const { markerId, markerLabel: attrLabel } = readMarkerAttrs(markerEl);
    if (!markerId) { if (markerTooltip) setMarkerTooltip(null); return; }
    const markerLabel = attrLabel || markerLabelById.get(markerId) || markerId;
    setMarkerTooltip({ text: `${markerTooltipPrefix}: ${markerLabel}`, x: event.clientX, y: event.clientY });
  };

  const handlePointerLeave = () => {
    if (markerTooltip) setMarkerTooltip(null);
  };

  const markerTooltipStyle = useMemo(() => {
    if (!markerTooltip) return null;
    const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const preferTop = markerTooltip.y > TOOLTIP_TOP_FALLBACK_THRESHOLD;
    const unclampedLeft = markerTooltip.x + TOOLTIP_OFFSET;
    const maxLeft = Math.max(TOOLTIP_EDGE_PADDING, viewportWidth - TOOLTIP_MAX_WIDTH - TOOLTIP_EDGE_PADDING);
    const left = Math.min(Math.max(TOOLTIP_EDGE_PADDING, unclampedLeft), maxLeft);
    const top = preferTop ? markerTooltip.y - TOOLTIP_OFFSET : markerTooltip.y + TOOLTIP_OFFSET;
    return {
      left: `${left}px`,
      top: `${top}px`,
      maxWidth: `${TOOLTIP_MAX_WIDTH}px`,
      transform: preferTop ? 'translateY(-100%)' : 'none',
    };
  }, [markerTooltip]);

  return { markerTooltip, markerTooltipStyle, handlePointerMove, handlePointerLeave, markerLabelById };
}
