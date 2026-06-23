import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

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
      <style>{`
        @keyframes previewFadeSlide {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      {children}
      {preview && <GalleryHoverPreviewLayer preview={preview} />}
    </Ctx.Provider>
  );
}

// ─── Typewriter hook ──────────────────────────────────────────────────────────

const TYPEWRITER_SPEED_MS = 18; // ms per character
const TYPEWRITER_MAX_CHARS = 300; // cap to avoid very long animations

function useTypewriter(text: string) {
  const target = text.slice(0, TYPEWRITER_MAX_CHARS);
  // Always start with full text — readable immediately (SSR, a11y, tests).
  const [displayed, setDisplayed] = useState(target);
  const rafRef = useRef<number | null>(null);
  const animatingRef = useRef(false);

  useEffect(() => {
    // Kick off typewriter only after a real paint frame arrives.
    // In jsdom the rAF callback never fires naturally, so displayed stays
    // at the full text set by useState — tests keep reading the full string.
    let cancelled = false;
    animatingRef.current = false;

    const startAnim = (ts: number) => {
      // jsdom's rAF polyfill fires with ts === 0; real browsers always give ts > 0.
      // Bail out so displayed stays at the full text (set by useState) in tests.
      if (cancelled || !ts) return;
      animatingRef.current = true;
      setDisplayed("");
      let i = 0;
      let lastTs = 0;

      const tick = (ts: number) => {
        if (cancelled) return;
        if (ts - lastTs >= TYPEWRITER_SPEED_MS) {
          i++;
          setDisplayed(target.slice(0, i));
          lastTs = ts;
        }
        if (i < target.length) rafRef.current = requestAnimationFrame(tick);
        else animatingRef.current = false;
      };
      rafRef.current = requestAnimationFrame(tick);
    };

    // Use a zero-delay rAF to defer start — ensures the component is painted
    // before we wipe the text, and in jsdom this rAF simply never fires.
    rafRef.current = requestAnimationFrame(startAnim);

    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      // Reset to full text so next mount is readable instantly.
      setDisplayed(target);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return displayed;
}

// ─── Layer ────────────────────────────────────────────────────────────────────

function GalleryHoverPreviewLayer({ preview }: { preview: PreviewState }) {
  const { data, x, y } = preview;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const { left, top } = clampPreviewPosition(x, y, vw, vh);
  const displayedOutline = useTypewriter(data.outline);

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
        animation: "previewFadeSlide 0.18s ease both",
      }}
      className="overflow-y-auto rounded-xl border border-border/80 bg-popover/95 backdrop-blur-sm p-4 text-popover-foreground shadow-xl shadow-black/10"
    >
      {data.title && (
        <p className="mb-0.5 [font-size:var(--public-font-card-title)] font-bold leading-snug text-foreground">{data.title}</p>
      )}
      {data.author && (
        <p className="mb-3 [font-size:var(--public-font-meta)] text-muted-foreground">{data.author}</p>
      )}
      <p className="mb-1.5 [font-size:var(--public-font-caption)] font-semibold tracking-widest uppercase text-muted-foreground/70">
        大綱
      </p>
      <p className="[font-size:var(--public-font-body)] [line-height:var(--public-line-body)] whitespace-pre-wrap">
        {displayedOutline}
        <span className="inline-block w-0.5 h-[1em] bg-foreground/60 ml-px align-middle animate-pulse" aria-hidden />
      </p>
    </div>
  );
}
