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
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
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
        className="gallery-search-input h-10 w-full rounded-md border border-border bg-card pl-9 pr-9 text-[0.875rem] outline-none placeholder:text-muted-foreground focus:border-link focus:ring-1 focus:ring-link [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onChange("")}
          aria-label="清除搜尋"
          className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}
