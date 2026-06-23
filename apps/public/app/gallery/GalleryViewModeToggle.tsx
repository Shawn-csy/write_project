"use client";

import type { GalleryViewMode } from "@write/public-ui";

interface GalleryViewModeToggleProps {
  value: GalleryViewMode;
  onChange: (mode: GalleryViewMode) => void;
}

const MODES: { value: GalleryViewMode; label: string }[] = [
  { value: "standard", label: "標準" },
  { value: "compact", label: "密集" },
];

export function GalleryViewModeToggle({ value, onChange }: GalleryViewModeToggleProps) {
  return (
    <div className="flex gap-1.5" role="group" aria-label="顯示模式">
      {MODES.map((mode) => (
        <button
          key={mode.value}
          type="button"
          onClick={() => onChange(mode.value)}
          aria-pressed={value === mode.value}
          className={`min-h-[44px] rounded-full px-4 text-xs transition-colors font-medium ${
            value === mode.value
              ? "bg-foreground text-background"
              : "border border-border/60 bg-transparent text-muted-foreground hover:text-foreground hover:border-border"
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
