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
    `h-full min-w-12 border-l border-border px-3 text-[0.8125rem] transition-colors duration-100 first:border-l-0 ${
      active
        ? "bg-primary font-bold text-primary-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  return (
    <div
      role="group"
      aria-label="排序"
      className={`inline-flex h-9 items-stretch overflow-hidden rounded-md border border-border bg-card ${className}`}
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
