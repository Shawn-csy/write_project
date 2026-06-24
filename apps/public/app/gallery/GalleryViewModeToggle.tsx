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
    <div
      className="flex gap-0.5 p-0.5 rounded-lg"
      role="group"
      aria-label="顯示模式"
      style={{
        background: "hsl(var(--muted))",
        border: "1px solid hsl(var(--border) / 0.5)",
      }}
    >
      {MODES.map((mode) => (
        <button
          key={mode.value}
          type="button"
          onClick={() => onChange(mode.value)}
          aria-pressed={value === mode.value}
          className={`h-8 rounded-[6px] px-3.5 text-[0.75rem] font-medium transition-all duration-150 ${
            value === mode.value
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  );
}
