"use client";

import { Search, X } from "lucide-react";
import { useRef } from "react";

interface PublicSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

export function PublicSearchField({ value, onChange, className = "", placeholder = "搜尋台本、作者或標籤" }: PublicSearchFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className={`relative min-w-0 ${className}`}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => { if (event.key === "Escape") event.currentTarget.blur(); }}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`public-search-field h-10 w-full rounded-xl border border-transparent pl-9 text-[0.875rem] placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:hidden ${value ? "pr-9" : "pr-3"}`}
      />
      {value && (
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onChange("");
            inputRef.current?.focus();
          }}
          aria-label="清除搜尋"
          className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      )}
    </div>
  );
}
