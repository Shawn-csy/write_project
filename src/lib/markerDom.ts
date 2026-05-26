export const MARKER_ID_ATTR = "data-marker-id" as const;
export const MARKER_LABEL_ATTR = "data-marker-label" as const;

export function getMarkerElement(target: EventTarget | null): Element | null {
  const el = target instanceof Element ? target : null;
  if (!el || typeof el.closest !== "function") return null;
  return el.closest(`[${MARKER_ID_ATTR}]`);
}

export function readMarkerAttrs(el: Element): { markerId: string; markerLabel: string } {
  const markerId = String(el.getAttribute(MARKER_ID_ATTR) || "").trim();
  const markerLabel = String(el.getAttribute(MARKER_LABEL_ATTR) || "").trim();
  return { markerId, markerLabel };
}
