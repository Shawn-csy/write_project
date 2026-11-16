"use client";

export type GallerySortValue = "latest" | "top" | "random";

export const GALLERY_SORT_OPTIONS: { value: GallerySortValue; label: string }[] = [
  { value: "latest", label: "最新" },
  { value: "top", label: "熱門" },
  { value: "random", label: "隨機" },
];

/** Label for the null sort — the sectioned (lanes) homepage. */
export const GALLERY_OVERVIEW_LABEL = "總覽";

interface GallerySortControlProps {
  /** null = 分區瀏覽 (lanes). Clicking the active option returns to it. */
  value: GallerySortValue | null;
  onChange: (value: GallerySortValue | null) => void;
  /** Show the lanes state as an explicit first option instead of only "toggle off". */
  showOverview?: boolean;
  className?: string;
}

export function GallerySortControl({ value, onChange, showOverview = false, className = "" }: GallerySortControlProps) {
  const buttonClass = (active: boolean) =>
    `h-8 min-w-12 rounded-md px-3 [font-size:var(--public-font-meta)] font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
      active
        ? "bg-background text-foreground shadow-sm"
        : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
    }`;

  return (
    <div
      role="group"
      aria-label="排序"
      className={`inline-flex h-10 items-center gap-0.5 rounded-lg border border-border/50 bg-muted/40 p-0.5 ${className}`}
    >
      {showOverview && (
        <button
          type="button"
          aria-pressed={value === null}
          onClick={() => onChange(null)}
          className={buttonClass(value === null)}
        >
          {GALLERY_OVERVIEW_LABEL}
        </button>
      )}
      {GALLERY_SORT_OPTIONS.map((option) => {
        const active = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(active ? null : option.value)}
            className={buttonClass(active)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
