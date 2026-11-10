"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";

interface GallerySearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onOpenFilters?: () => void;
  activeFilterCount?: number;
  mobileActions?: ReactNode;
  trailingAction?: ReactNode;
  compactDesktop?: boolean;
}

export function GallerySearchField({ value, onChange, onOpenFilters, activeFilterCount = 0, mobileActions, trailingAction, compactDesktop = false }: GallerySearchFieldProps) {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (mobileSearchOpen) mobileInputRef.current?.focus(); }, [mobileSearchOpen]);

  return (
    <div className={`flex min-w-0 flex-1 items-center justify-end gap-1 md:justify-start md:gap-2 ${compactDesktop ? "md:min-w-0" : "md:min-w-[24rem]"}`}>
      <button type="button" aria-label="搜尋台本" aria-expanded={mobileSearchOpen} aria-controls="gallery-mobile-search" onClick={() => setMobileSearchOpen((open) => !open)} className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border md:hidden ${mobileSearchOpen || value ? "border-primary/50 text-primary" : "border-border/60 text-muted-foreground"}`}>
        <Search className="h-4 w-4" aria-hidden />
      </button>
      <div className="relative hidden min-w-0 flex-1 md:block lg:max-w-64">
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
          className="h-10 w-full rounded-lg border border-border/60 bg-background/70 pl-9 pr-9 [font-size:var(--public-font-meta)] placeholder:text-muted-foreground/50 outline-none transition-all duration-150 focus:border-primary/50 focus:ring-2 focus:ring-primary/15"
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
          className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-background/70 text-foreground transition-all duration-150 hover:border-primary/40 hover:bg-primary/5 md:h-10 md:w-auto md:px-3 md:text-muted-foreground hover:text-foreground"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden md:inline">更多搜尋</span>
          {activeFilterCount > 0 && (
            <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 [font-size:var(--public-font-caption)] font-semibold text-primary-foreground md:static md:h-5 md:min-w-5">
              {activeFilterCount}
            </span>
          )}
        </button>
      )}
      {trailingAction}
      {mobileActions && (
        <div className="flex shrink-0 items-center gap-1 max-[359px]:hidden md:hidden">
          {mobileActions}
        </div>
      )}
      {mobileSearchOpen && <div id="gallery-mobile-search" className="absolute inset-x-0 top-full z-50 flex items-center gap-2 border-b border-border/60 bg-background p-3 shadow-lg md:hidden">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input ref={mobileInputRef} type="search" value={value} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === "Escape" || event.key === "Enter") setMobileSearchOpen(false); }} placeholder="搜尋台本、作者或標籤" aria-label="搜尋台本、作者或標籤" className="h-10 w-full rounded-lg border border-border/60 bg-background pl-9 pr-3 text-sm outline-none focus:border-primary/50" />
        </div>
        <button type="button" onClick={() => setMobileSearchOpen(false)} aria-label="關閉搜尋" className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/60"><X className="h-4 w-4" aria-hidden /></button>
      </div>}
    </div>
  );
}
