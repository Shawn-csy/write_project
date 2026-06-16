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
    <div className="overflow-x-auto scrollbar-none">
      <div className="flex items-end gap-0 min-w-max border-b border-border/40">
        {SEGMENT_OPTIONS.map((opt) => {
          const active = segment === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onSegmentChange(opt.value)}
              className={`relative h-10 shrink-0 px-4 text-sm font-medium transition-colors whitespace-nowrap ${
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
