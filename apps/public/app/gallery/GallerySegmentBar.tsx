"use client";

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
}

export function GallerySegmentBar({ segment, onSegmentChange }: GallerySegmentBarProps) {
  return (
    <div className="overflow-x-auto scrollbar-none" style={{ borderBottom: "1px solid hsl(var(--border) / 0.4)" }}>
      <div className="flex items-end gap-0.5 min-w-max px-0.5 pb-0">
        {SEGMENT_OPTIONS.map((opt) => {
          const active = segment === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSegmentChange(opt.value)}
              className={`relative h-10 shrink-0 px-3.5 text-[0.8125rem] rounded-t-md transition-all duration-150 whitespace-nowrap ${
                active
                  ? "text-foreground font-semibold bg-muted/50"
                  : "text-muted-foreground hover:text-foreground font-normal"
              }`}
            >
              {opt.label}
              {active && (
                <span
                  className="absolute bottom-0 left-2 right-2 rounded-t-[2px]"
                  style={{ height: "2px", background: "hsl(var(--primary))" }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
