"use client";

import { Search, X } from "lucide-react";

interface GalleryFilterPanelProps {
  searchTerm: string;
  onSearchChange: (v: string) => void;
  usageFilter: string;
  onUsageFilterChange: (v: string) => void;
  viewMode: "standard" | "compact";
  onViewModeChange: (v: "standard" | "compact") => void;
  licenseTagShortcuts: string[];
  allTags: string[];
  selectedTags: string[];
  onToggleTag: (tag: string) => void;
  tagSearch: string;
  onTagSearchChange: (v: string) => void;
  displayTags: string[];
  hasFilters: boolean;
  onResetFilters: () => void;
}

export function GalleryFilterPanel({
  searchTerm,
  onSearchChange,
  usageFilter,
  onUsageFilterChange,
  viewMode,
  onViewModeChange,
  licenseTagShortcuts,
  allTags,
  selectedTags,
  onToggleTag,
  tagSearch,
  onTagSearchChange,
  displayTags,
  hasFilters,
  onResetFilters,
}: GalleryFilterPanelProps) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold tracking-wide text-muted-foreground">篩選與搜尋</p>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="搜尋台本..."
          className="w-full rounded-full border border-border/70 bg-background pl-8 pr-8 py-1.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
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

      {/* Usage filter */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-foreground">使用權限</p>
        <div className="flex flex-wrap gap-1.5">
          {[
            { value: "all", label: "全部推薦" },
            { value: "commercial", label: "可商業" },
          ].map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onUsageFilterChange(opt.value)}
              className={`h-7 rounded-full px-3 text-xs transition-colors ${
                usageFilter === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "border border-border/70 bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* View mode */}
      <div>
        <p className="mb-1.5 text-xs font-medium text-foreground">顯示模式</p>
        <div className="flex gap-1.5">
          {(["standard", "compact"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onViewModeChange(mode)}
              className={`h-7 rounded-full px-3 text-xs transition-colors ${
                viewMode === mode
                  ? "bg-primary text-primary-foreground"
                  : "border border-border/70 bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              {mode === "standard" ? "圖文排版" : "緊湊排版"}
            </button>
          ))}
        </div>
      </div>

      {/* License shortcuts */}
      {licenseTagShortcuts.length > 0 && (
        <div>
          <p className="mb-1.5 text-xs font-medium text-foreground">授權篩選</p>
          <div className="flex flex-wrap gap-1">
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
                      : "border border-border/60 bg-background text-muted-foreground hover:text-foreground"
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
        <div>
          <p className="mb-1.5 text-xs font-medium text-foreground">分類與標籤</p>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={tagSearch}
              onChange={(e) => onTagSearchChange(e.target.value)}
              placeholder="搜尋標籤..."
              className="w-full rounded-md border border-border/60 bg-background pl-6 pr-2 py-1 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
          </div>
          <div className="flex flex-wrap gap-1 max-h-40 overflow-y-auto">
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
                      : "border border-border/60 bg-background text-muted-foreground hover:text-foreground"
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
        <button
          type="button"
          onClick={onResetFilters}
          className="text-xs text-muted-foreground hover:text-foreground underline"
        >
          清除篩選
        </button>
      )}
    </div>
  );
}
