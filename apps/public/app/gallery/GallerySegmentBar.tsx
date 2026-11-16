"use client";

import React, { useRef, useEffect, useState } from "react";
import { SEGMENT_KEYS, type SegmentKey } from "@write/public-ui";

export const SEGMENT_OPTIONS: { value: SegmentKey; label: string }[] = [
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
}

/**
 * One set of segment buttons for every breakpoint: scrollable pills on mobile,
 * underlined tabs from `md` up. Keeping a single DOM set avoids swapping to a
 * native select when the toolbar sticks.
 */
export function GallerySegmentBar({ segment, onSegmentChange, demoOnly = false, onDemoOnlyChange }: GallerySegmentBarProps) {
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
    setIndicator({ left: btnRect.left - containerRect.left + 12, width: btnRect.width - 24 });
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

  // Keep the active pill in view when the strip scrolls horizontally (mobile).
  useEffect(() => {
    buttonRefs.current[segment]?.scrollIntoView?.({ block: "nearest", inline: "nearest" });
  }, [segment]);

  return (
    <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="作品分類">
      <div ref={containerRef} className="relative flex min-w-max items-end gap-1">
        {SEGMENT_OPTIONS.map((opt) => {
          const active = segment === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              aria-pressed={active}
              ref={(el) => { buttonRefs.current[opt.value] = el; }}
              onClick={() => onSegmentChange(opt.value)}
              className={`tab-item ${active ? "font-semibold" : ""}`}
            >
              {opt.label}
            </button>
          );
        })}
        {onDemoOnlyChange && (
          <>
            <span aria-hidden className="mx-1 mb-2.5 h-4 w-px shrink-0 bg-border" />
            <button
              type="button"
              aria-pressed={demoOnly}
              onClick={() => onDemoOnlyChange(!demoOnly)}
              className={`inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap px-2 text-[0.875rem] ${
 demoOnly ? "font-semibold text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span aria-hidden className={`flex h-3.5 w-3.5 items-center justify-center border text-[10px] leading-none ${demoOnly ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/70"}`}>{demoOnly ? "✓" : ""}</span>
              有 Demo
            </button>
          </>
        )}
      </div>
    </div>
  );
}
