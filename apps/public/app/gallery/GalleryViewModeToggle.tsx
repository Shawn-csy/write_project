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
      className={`border-l border-border text-[0.8125rem] transition-colors duration-100 first:border-l-0 ${
 compact
 ? "h-full px-3"
          : "min-h-[44px] px-4"
      } ${
        active
          ? "bg-primary font-bold text-primary-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
      className={`flex items-stretch overflow-hidden rounded-md border border-border bg-card ${compact ? "h-9" : ""}`}
      role="group"
      aria-label="顯示模式"
      data-testid="gallery-view-mode-toggle"
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
