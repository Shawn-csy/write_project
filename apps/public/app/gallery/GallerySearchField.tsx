"use client";

import type { ReactNode } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

interface GallerySearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onOpenFilters?: () => void;
  activeFilterCount?: number;
  mobileActions?: ReactNode;
}

export function GallerySearchField({ value, onChange, onOpenFilters, activeFilterCount = 0, mobileActions }: GallerySearchFieldProps) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-1.5 md:w-full md:flex-none md:gap-2 lg:w-auto lg:flex-none">
      <div className="relative min-w-0 flex-1 lg:w-64 lg:flex-none">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 hidden h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/65 md:block"
          aria-hidden
        />
        {onOpenFilters && (
          <button
            type="button"
            onClick={onOpenFilters}
            aria-label="開啟更多搜尋"
            title="更多搜尋"
            className="absolute left-1 top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-all duration-150 md:hidden"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
            {activeFilterCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 inline-flex min-w-3.5 h-3.5 items-center justify-center rounded-full bg-primary px-0.5 [font-size:var(--public-font-caption)] font-semibold text-primary-foreground">
                {activeFilterCount}
              </span>
            )}
          </button>
        )}
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="搜尋台本、作者或標籤..."
          aria-label="搜尋台本、作者或標籤"
          className={`h-10 w-full rounded-lg border border-border/60 bg-background/70 pr-9 [font-size:var(--public-font-meta)] placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-all duration-150 ${onOpenFilters ? "pl-11 md:pl-9" : "pl-9"}`}
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
          className="hidden md:inline-flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-background/70 px-3 [font-size:var(--public-font-meta)] text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground transition-all duration-150"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          <span>更多搜尋</span>
          {activeFilterCount > 0 && (
            <span className="inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-primary px-1.5 [font-size:var(--public-font-caption)] font-semibold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </button>
      )}
      {mobileActions && (
        <div className="flex shrink-0 items-center gap-1 md:hidden">
          {mobileActions}
        </div>
      )}
    </div>
  );
}
