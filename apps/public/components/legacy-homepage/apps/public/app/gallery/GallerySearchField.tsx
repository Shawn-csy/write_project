"use client";

import { Search, X } from "lucide-react";

interface GallerySearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  onFocusChange?: (focused: boolean) => void;
  className?: string;
}

/** Single search input shared by the desktop and mobile gallery toolbar. */
export function GallerySearchField({ value, onChange, onFocusChange, className = "" }: GallerySearchFieldProps) {
  return (
    <div className={`relative min-w-0 ${className}`}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/65"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => onFocusChange?.(true)}
        onBlur={() => onFocusChange?.(false)}
        onKeyDown={(event) => { if (event.key === "Escape") event.currentTarget.blur(); }}
        placeholder="搜尋台本、作者或標籤"
        aria-label="搜尋台本、作者或標籤"
        className="h-9 w-full rounded-lg border border-border/60 bg-background/70 pl-9 pr-9 [font-size:var(--public-font-meta)] outline-none transition-colors duration-150 placeholder:text-muted-foreground/55 focus:border-primary/50 focus:ring-2 focus:ring-primary/15 md:h-10 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onChange("")}
          aria-label="清除搜尋"
          className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}
