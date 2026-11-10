"use client";

import type { ReactNode } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

interface GallerySearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onOpenFilters?: () => void;
  activeFilterCount?: number;
  mobileActions?: ReactNode;
  trailingAction?: ReactNode;
}

export function GallerySearchField({ value, onChange, onOpenFilters, activeFilterCount = 0, mobileActions, trailingAction }: GallerySearchFieldProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 md:w-full md:flex-nowrap md:flex-none md:gap-2 lg:w-auto lg:flex-none">
      <div className="relative w-full min-w-0 flex-1 basis-full md:w-auto md:basis-auto lg:w-64 lg:flex-none">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/65"
          aria-hidden
        />
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="搜尋台本..."
          aria-label="搜尋台本、作者或標籤"
          className={`h-11 md:h-10 w-full rounded-lg border border-border/60 bg-background/70 pr-9 [font-size:var(--public-font-meta)] placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-all duration-150 pl-9`}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="清除搜尋"
            className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-all"
          >
            <X className="h-3.5 w-3.5" aria-hidden />
          </button>
        )}
      </div>
      {onOpenFilters && (
        <button
          type="button"
          onClick={onOpenFilters}
          aria-label="開啟更多搜尋"
          className="ml-auto inline-flex h-11 md:h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-background/70 px-3 [font-size:var(--public-font-meta)] text-foreground md:ml-0 md:text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground transition-all duration-150"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          <span className="md:hidden">篩選</span>
          <span className="hidden md:inline">更多搜尋</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-primary px-1.5 [font-size:var(--public-font-caption)] font-semibold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </button>
      )}
      {trailingAction}
      {mobileActions && (
        <div className="flex shrink-0 items-center gap-1 md:hidden">
          {mobileActions}
        </div>
      )}
    </div>
  );
}
