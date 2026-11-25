"use client";

import type { GalleryViewMode } from "@write/public-ui";
import { useAnimePressFeedback } from "@/lib/motion/useAnimePressFeedback";

interface GalleryViewModeToggleProps {
  value: GalleryViewMode;
  onChange: (mode: GalleryViewMode) => void;
  /** Compact desktop toolbar; default keeps a 44px touch target in sheets. */
  compact?: boolean;
}

/** Shows the current layout; one click switches to the other persisted mode. */
export function GalleryViewModeToggle({ value, onChange, compact = false }: GalleryViewModeToggleProps) {
  const { ref, handlers } = useAnimePressFeedback<HTMLButtonElement>();
  const dense = value === "compact";
  const action = dense ? "切換為標準顯示" : "切換為密集顯示";
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => onChange(dense ? "standard" : "compact")}
      aria-label={action}
      title={action}
      data-testid="gallery-view-mode-toggle"
      className={`inline-flex shrink-0 items-center justify-center rounded-md px-2 text-[0.8125rem] leading-5 text-foreground transition-colors duration-100 hover:bg-muted ${compact ? "h-9" : "min-h-[44px] border border-border bg-card"}`}
      {...handlers}
    >
      <span>{dense ? "密集" : "標準"}</span>
    </button>
  );
}
