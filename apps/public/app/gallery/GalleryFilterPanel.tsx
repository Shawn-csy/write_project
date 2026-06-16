"use client";

import { Search, X } from "lucide-react";

interface GalleryFilterPanelProps {
  searchTerm: string;
  onSearchChange: (v: string) => void;
  licenseTagShortcuts: string[];
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  tagSearch: string;
  onTagSearchChange: (v: string) => void;
  displayTags: string[];
  hasFilters: boolean;
  onResetFilters: () => void;
  /** "sidebar" wraps content in a rounded card surface. "sheet" renders flat (for mobile drawers). */
  variant?: "sidebar" | "sheet";
}

export function GalleryFilterPanel({
  searchTerm,
  onSearchChange,
  licenseTagShortcuts,
  allTags,
  selectedTags,
  onToggleTag,
  tagSearch,
  onTagSearchChange,
  displayTags,
  hasFilters,
  onResetFilters,
  variant = "sheet",
}: GalleryFilterPanelProps) {
  const inner = (
    <div className="space-y-5">
      {/* Search */}
      <div>
        <p className="mb-2 text-xs font-bold tracking-widest text-muted-foreground uppercase">搜尋</p>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="搜尋台本..."
            className="w-full rounded-full border border-border/70 bg-background/70 pl-9 pr-8 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 focus:bg-background transition-colors"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="清除搜尋"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* License shortcuts */}
      {licenseTagShortcuts.length > 0 && (
        <div className="border-t border-border/40 pt-4">
          <p className="mb-2 text-xs font-bold tracking-widest text-muted-foreground uppercase">授權篩選</p>
          <div className="flex flex-wrap gap-1.5">
            {licenseTagShortcuts.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onToggleTag(tag)}
                  className={`h-6 rounded-full px-2.5 text-xs transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "border border-border/60 bg-background/70 text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  {tag.replace(/^授權:/, "")}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className="border-t border-border/40 pt-4">
          <p className="mb-2 text-xs font-bold tracking-widest text-muted-foreground uppercase">分類與標籤</p>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={tagSearch}
              onChange={(e) => onTagSearchChange(e.target.value)}
              placeholder="搜尋標籤..."
              className="w-full rounded-full border border-border/60 bg-background/70 pl-8 pr-3 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:bg-background transition-colors"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {displayTags.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onToggleTag(tag)}
                  className={`h-6 rounded-full px-2.5 text-xs transition-colors ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "border border-border/60 bg-background/70 text-muted-foreground hover:text-foreground hover:border-primary/40"
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {hasFilters && (
        <div className="border-t border-border/40 pt-3">
          <button
            type="button"
            onClick={onResetFilters}
            className="w-full rounded-full border border-border/60 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:border-border transition-colors"
          >
            清除全部篩選
          </button>
        </div>
      )}
    </div>
  );

  if (variant === "sidebar") {
    return (
      <div className="rounded-xl border border-border/50 bg-muted/40 p-4">
        {inner}
      </div>
    );
  }

  return inner;
}
