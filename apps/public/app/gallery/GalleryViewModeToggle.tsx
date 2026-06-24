"use client";

import type { GalleryViewMode } from "@write/public-ui";

interface GalleryViewModeToggleProps {
  value: GalleryViewMode;
  onChange: (mode: GalleryViewMode) => void;
  /** compact=true → h-7 for inline toolbar use; false (default) → min-h-[44px] for mobile sheet */
  compact?: boolean;
}

const MODES: { value: GalleryViewMode; label: string }[] = [
  { value: "standard", label: "標準" },
  { value: "compact", label: "密集" },
];

export function GalleryViewModeToggle({ value, onChange, compact = false }: GalleryViewModeToggleProps) {
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
          className={`rounded-[6px] font-medium transition-all duration-150 ${
            compact
              ? "h-7 px-2.5 text-[0.7rem]"
              : "min-h-[44px] px-3.5 text-[0.75rem]"
          } ${
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
