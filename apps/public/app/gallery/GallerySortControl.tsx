"use client";

export type GallerySortValue = "latest" | "top" | "random";

export const GALLERY_SORT_OPTIONS: { value: GallerySortValue; label: string }[] = [
  { value: "latest", label: "最新" },
  { value: "top", label: "熱門" },
  { value: "random", label: "隨機" },
];

interface GallerySortControlProps {
  /** null = 分區瀏覽 (lanes). Clicking the active option returns to it. */
  value: GallerySortValue | null;
  onChange: (value: GallerySortValue | null) => void;
  className?: string;
}

export function GallerySortControl({ value, onChange, className = "" }: GallerySortControlProps) {
  return (
    <div
      role="group"
      aria-label="排序"
      className={`inline-flex items-center gap-0.5 rounded-lg border border-border/50 bg-background/60 p-0.5 ${className}`}
    >
      {GALLERY_SORT_OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : option.value)}
            className={`h-8 min-w-12 rounded-md px-3 [font-size:var(--public-font-meta)] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-primary/5 hover:text-foreground"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
