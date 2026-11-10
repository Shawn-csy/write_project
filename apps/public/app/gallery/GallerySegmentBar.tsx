"use client";

import React, { useRef, useEffect, useState } from "react";
import { SEGMENT_KEYS, type SegmentKey } from "@write/public-ui";

const SEGMENT_OPTIONS: { value: SegmentKey; label: string }[] = [
  { value: SEGMENT_KEYS.all, label: "全部" },
  { value: SEGMENT_KEYS.allAges, label: "全年齡向" },
  { value: SEGMENT_KEYS.adult, label: "成人向" },
  { value: SEGMENT_KEYS.male, label: "男性向" },
  { value: SEGMENT_KEYS.female, label: "女性向" },
];

interface GallerySegmentBarProps {
  segment: string;
  onSegmentChange: (v: string) => void;
  demoOnly?: boolean;
  onDemoOnlyChange?: (enabled: boolean) => void;
  compactDesktop?: boolean;
}

export function GallerySegmentBar({ segment, onSegmentChange, demoOnly = false, onDemoOnlyChange, compactDesktop = false }: GallerySegmentBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);
  const [ready, setReady] = useState(false);
  const segmentRef = useRef(segment);
  segmentRef.current = segment;

  const measure = () => {
    const btn = buttonRefs.current[segmentRef.current];
    const container = containerRef.current;
    if (!btn || !container) return;
    const containerRect = container.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setIndicator({ left: btnRect.left - containerRect.left + 8, width: btnRect.width - 16 });
    setReady(true);
  };

  // Re-measure on segment change
  useEffect(() => { measure(); }, [segment]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-measure on resize (font scale, viewport change)
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    return () => ro.disconnect();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="flex items-center gap-2 md:hidden">
        <label className="sr-only" htmlFor="gallery-segment-select">作品分類</label>
        <select
          id="gallery-segment-select"
          value={segment}
          onChange={(event) => onSegmentChange(event.target.value)}
          className="h-9 w-[4.5rem] rounded-lg border border-border/60 bg-background/70 px-2 text-[0.8125rem] font-medium text-foreground focus:outline-none focus:border-primary/50 min-[360px]:w-[5.5rem]"
        >
          {SEGMENT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        {onDemoOnlyChange && <button type="button" aria-pressed={demoOnly} onClick={() => onDemoOnlyChange(!demoOnly)} className={`h-9 shrink-0 rounded-lg border px-2 text-[0.8125rem] font-medium ${demoOnly ? "border-primary bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground"}`}>有 Demo</button>}
      </div>

      {compactDesktop && <div className="hidden items-center gap-2 md:flex">
        <label className="sr-only" htmlFor="gallery-compact-segment-select">作品分類</label>
        <select id="gallery-compact-segment-select" value={segment} onChange={(event) => onSegmentChange(event.target.value)} className="h-9 w-28 rounded-lg border border-border/60 bg-background px-2 text-[0.8125rem] font-medium text-foreground">
          {SEGMENT_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </select>
        {onDemoOnlyChange && <button type="button" aria-pressed={demoOnly} onClick={() => onDemoOnlyChange(!demoOnly)} className={`h-9 shrink-0 rounded-lg border px-2 text-[0.8125rem] font-medium ${demoOnly ? "border-primary bg-primary text-primary-foreground" : "border-border/60 text-muted-foreground"}`}>有 Demo</button>}
      </div>}

      <div className={`hidden overflow-x-auto scrollbar-none editorial-border-b ${compactDesktop ? "" : "md:block"}`}>
        <div ref={containerRef} className="relative flex items-end gap-0.5 min-w-max px-0.5 pb-0">
          {SEGMENT_OPTIONS.map((opt) => {
            const active = segment === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                ref={(el) => { buttonRefs.current[opt.value] = el; }}
                onClick={() => onSegmentChange(opt.value)}
                className={`relative h-10 shrink-0 px-3.5 text-[0.8125rem] rounded-t-md transition-colors duration-150 whitespace-nowrap ${
                  active
                    ? "text-foreground font-semibold bg-muted/50"
                    : "text-muted-foreground hover:text-foreground font-normal"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
          {onDemoOnlyChange && <button type="button" aria-pressed={demoOnly} onClick={() => onDemoOnlyChange(!demoOnly)} className={`ml-2 h-9 shrink-0 rounded-md border px-3 text-[0.8125rem] font-medium ${demoOnly ? "border-primary bg-primary text-primary-foreground" : "border-border/50 text-muted-foreground hover:text-foreground"}`}>有 Demo</button>}
          {/* Sliding indicator */}
          {ready && indicator && (
            <span
              aria-hidden
              className="absolute bottom-0 rounded-t-[2px] pointer-events-none editorial-indicator"
              style={{
                left: indicator.left,
                width: indicator.width,
                transition: "left 0.22s cubic-bezier(0.4,0,0.2,1), width 0.22s cubic-bezier(0.4,0,0.2,1)",
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}
