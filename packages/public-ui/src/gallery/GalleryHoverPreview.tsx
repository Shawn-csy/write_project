import React, { createContext, useCallback, useContext, useEffect, useState } from "react";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PreviewData {
  title?: string | null;
  author?: string | null;
  outline: string;
}

interface PreviewState {
  data: PreviewData;
  x: number;
  y: number;
}

interface GalleryHoverPreviewCtx {
  show: (data: PreviewData, x: number, y: number) => void;
  move: (x: number, y: number) => void;
  hide: () => void;
}

// ─── Position helper ─────────────────────────────────────────────────────────

const PREVIEW_W = 360;
const PREVIEW_MAX_H = 420;
const OFFSET_X = 16;
const OFFSET_Y = 12;
const EDGE_PAD = 12;

/** Clamp preview position so it stays within the viewport. Pure function. */
export function clampPreviewPosition(
  cursorX: number,
  cursorY: number,
  viewportW: number,
  viewportH: number,
): { left: number; top: number } {
  // Default: right of cursor
  let left = cursorX + OFFSET_X;
  // Flip left if no room on the right
  if (left + PREVIEW_W + EDGE_PAD > viewportW) {
    left = cursorX - OFFSET_X - PREVIEW_W;
  }
  // Clamp left edge
  if (left < EDGE_PAD) left = EDGE_PAD;

  // Default: below cursor
  let top = cursorY + OFFSET_Y;
  // Clamp upward if no room at the bottom
  const maxH = Math.min(PREVIEW_MAX_H, viewportH * 0.7);
  if (top + maxH + EDGE_PAD > viewportH) {
    top = viewportH - maxH - EDGE_PAD;
  }
  if (top < EDGE_PAD) top = EDGE_PAD;

  return { left, top };
}

// ─── Context ─────────────────────────────────────────────────────────────────

const Ctx = createContext<GalleryHoverPreviewCtx | null>(null);

/**
 * Consume the gallery hover preview context from inside a card.
 * Returns null when no provider is present (preview disabled).
 */
export function useGalleryHoverPreview(): GalleryHoverPreviewCtx | null {
  return useContext(Ctx);
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function GalleryHoverPreviewProvider({
  children,
  resetKey,
}: {
  children: React.ReactNode;
  resetKey?: unknown;
}) {
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const show = useCallback((data: PreviewData, x: number, y: number) => {
    if (typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches) return;
    setPreview({ data, x, y });
  }, []);

  const move = useCallback((x: number, y: number) => {
    setPreview((prev) => {
      if (!prev) return null;
      return { ...prev, x, y };
    });
  }, []);

  const hide = useCallback(() => {
    setPreview(null);
  }, []);

  useEffect(() => {
    setPreview(null);
  }, [resetKey]);

  return (
    <Ctx.Provider value={{ show, move, hide }}>
      {children}
      {preview && <GalleryHoverPreviewLayer preview={preview} />}
    </Ctx.Provider>
  );
}

// ─── Layer ────────────────────────────────────────────────────────────────────

function GalleryHoverPreviewLayer({ preview }: { preview: PreviewState }) {
  const { data, x, y } = preview;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const { left, top } = clampPreviewPosition(x, y, vw, vh);

  return (
    <div
      data-testid="gallery-hover-preview"
      style={{
        position: "fixed",
        left,
        top,
        width: `min(${PREVIEW_W}px, calc(100vw - 24px))`,
        maxHeight: `min(${PREVIEW_MAX_H}px, 70vh)`,
        pointerEvents: "none",
        zIndex: 50,
      }}
      className="overflow-y-auto rounded-lg border border-border bg-popover p-3 text-popover-foreground shadow-lg"
    >
      {data.title && (
        <p className="mb-0.5 [font-size:var(--public-font-card-title)] font-semibold leading-snug text-foreground">{data.title}</p>
      )}
      {data.author && (
        <p className="mb-2 [font-size:var(--public-font-meta)] text-muted-foreground">{data.author}</p>
      )}
      <p className="mb-1.5 [font-size:var(--public-font-caption)] font-semibold tracking-wider text-muted-foreground">
        大綱
      </p>
      <p className="[font-size:var(--public-font-body)] [line-height:var(--public-line-body)] whitespace-pre-wrap">{data.outline}</p>
    </div>
  );
}
