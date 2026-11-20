import { useEffect, useRef, useState } from "react";

type MarkerPane = "preview" | "editorHeight";

const STORAGE_KEY = "marker-rule-pane-widths";
const MIN_PREVIEW = 260;
const MIN_EDITOR = 320;
const DIVIDER = 12;
const DEFAULT_WIDTHS = { preview: 404, editorHeight: 165 };

function readWidths(): Record<MarkerPane, number> {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    return {
      preview: Number.isFinite(stored?.preview) ? Math.max(MIN_PREVIEW, stored.preview) : DEFAULT_WIDTHS.preview,
      editorHeight: Number.isFinite(stored?.editorHeight) ? stored.editorHeight : DEFAULT_WIDTHS.editorHeight,
    };
  } catch {
    return DEFAULT_WIDTHS;
  }
}

export function useMarkerRulePanes() {
  const workspace = useRef<HTMLDivElement>(null);
  const [{ width, height }, setSize] = useState({ width: 0, height: 0 });
  const [preferred, setPreferred] = useState(readWidths);

  useEffect(() => {
    const element = workspace.current;
    if (!element) return;
    const measure = () => setSize({
      width: element.clientWidth,
      height: element.clientHeight,
    });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const maxPreview = Math.max(MIN_PREVIEW, width - MIN_EDITOR - DIVIDER);
  const splitHeight = Math.max(0, height - DIVIDER);
  const minHeight = Math.min(128, Math.floor(splitHeight / 2));
  const maxHeight = splitHeight - minHeight;
  const ranges = {
    preview: { min: MIN_PREVIEW, max: maxPreview, value: Math.min(preferred.preview, maxPreview) },
    editorHeight: { min: minHeight, max: maxHeight, value: Math.max(minHeight, Math.min(maxHeight, preferred.editorHeight)) },
  };

  const resize = (pane: MarkerPane, value: number) => {
    const { min, max } = ranges[pane];
    const next = Math.round(Math.max(min, Math.min(max, value)));
    setPreferred((previous) => ({ ...previous, [pane]: next }));
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferred));
    } catch {
      // Widths still apply for this visit.
    }
  }, [preferred]);

  return { workspace, ranges, resize, defaults: DEFAULT_WIDTHS };
}
