"use client";

import type { GalleryViewMode } from "@write/public-ui";
import { useAnimePressFeedback } from "@/lib/motion/useAnimePressFeedback";

interface GalleryViewModeToggleProps {
  value: GalleryViewMode;
  onChange: (mode: GalleryViewMode) => void;
  /** compact=true → 40px toolbar group; false (default) → 44px touch targets in the filter sheet */
  compact?: boolean;
}

const MODES: { value: GalleryViewMode; label: string }[] = [
  { value: "standard", label: "標準" },
  { value: "compact", label: "密集" },
];

function ModeButton({
  mode,
  active,
  compact,
  onChange,
}: {
  mode: { value: GalleryViewMode; label: string };
  active: boolean;
  compact: boolean;
  onChange: (mode: GalleryViewMode) => void;
}) {
  const { ref, handlers } = useAnimePressFeedback<HTMLButtonElement>();
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onChange(mode.value)}
      aria-pressed={active}
      className={`rounded-md [font-size:var(--public-font-meta)] font-medium transition-all duration-150 ${
        compact
          ? "h-8 px-2.5"
          : "min-h-[44px] px-3.5"
      } ${
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground"
      }`}
      {...handlers}
    >
      {mode.label}
    </button>
  );
}

export function GalleryViewModeToggle({ value, onChange, compact = false }: GalleryViewModeToggleProps) {
  return (
    <div
      className={`flex gap-0.5 rounded-lg ${compact ? "h-10 items-center p-0.5" : "p-0.5"}`}
      role="group"
      aria-label="顯示模式"
      data-testid="gallery-view-mode-toggle"
      style={{
        background: "hsl(var(--muted) / 0.4)",
        border: "1px solid hsl(var(--border) / 0.5)",
      }}
    >
      {MODES.map((mode) => (
        <ModeButton
          key={mode.value}
          mode={mode}
          active={value === mode.value}
          compact={compact}
          onChange={onChange}
        />
      ))}
    </div>
  );
}
