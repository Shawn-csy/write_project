"use client";

import { DocumentIcon } from "./GalleryIcons";

interface GalleryEmptyStateProps {
  /** "no-match" shows reset button; "no-public-scripts" | "no-data" shows generic message */
  reason: "no-match" | "no-public-scripts" | "no-data";
  onResetFilters?: () => void;
  /** Extra className applied to the outer wrapper (e.g. "col-span-full" for grid contexts) */
  className?: string;
}

export function GalleryEmptyState({ reason, onResetFilters, className = "" }: GalleryEmptyStateProps) {
  return (
    <div className={`py-20 text-center ${className}`}>
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <DocumentIcon className="h-5 w-5 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground text-sm">
        {reason === "no-match" ? "找不到符合條件的台本" : "目前沒有公開台本"}
      </p>
      {reason === "no-match" && onResetFilters && (
        <button
          type="button"
          onClick={onResetFilters}
          className="mt-3 rounded-full border border-border/60 px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-colors"
        >
          清除篩選
        </button>
      )}
    </div>
  );
}
