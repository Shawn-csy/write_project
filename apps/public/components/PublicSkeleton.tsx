import type { CSSProperties } from "react";

/** Loading placeholder for card grids. Announces "載入中..." to assistive tech. */
export function PublicCardGridSkeleton({
  count = 8,
  minCardWidth = 165,
  className = "",
  aspect = "aspect-[3/4]",
}: {
  count?: number;
  minCardWidth?: number;
  className?: string;
  aspect?: string;
}) {
  const style: CSSProperties = { gridTemplateColumns: `repeat(auto-fill, minmax(${minCardWidth}px, 1fr))` };
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={className}>
      <span className="sr-only">載入中...</span>
      <div className="grid gap-5 sm:gap-6" style={style} aria-hidden>
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className="animate-pulse">
            <div className={`${aspect} w-full rounded-xl bg-muted`} />
            <div className="mt-3 h-3.5 w-3/4 rounded bg-muted" />
            <div className="mt-2 h-3 w-1/2 rounded bg-muted/70" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Loading placeholder for stacked list rows (activities, demos, people). */
export function PublicListSkeleton({ rows = 4, className = "" }: { rows?: number; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={`space-y-3 ${className}`}>
      <span className="sr-only">載入中...</span>
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} aria-hidden className="flex animate-pulse items-center gap-4 rounded-xl border border-border/40 bg-card/40 p-4">
          <div className="h-14 w-14 shrink-0 rounded-lg bg-muted" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-1/3 rounded bg-muted" />
            <div className="h-3 w-2/3 rounded bg-muted/70" />
          </div>
        </div>
      ))}
    </div>
  );
}
