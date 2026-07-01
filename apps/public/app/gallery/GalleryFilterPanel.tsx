"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";

/** Maximum tags shown before collapse. */
export const DEFAULT_VISIBLE_TAG_COUNT = 8;

const USAGE_OPTIONS = [
  { value: "all", label: "全部授權" },
  { value: "commercial", label: "可商用" },
] as const;

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
  /** Usage filter value (moved from inline controls bar). */
  usage?: string;
  onUsageChange?: (v: string) => void;
  /** "sidebar" wraps content in a rounded card surface. "sheet" renders flat (for mobile drawers). */
  variant?: "sidebar" | "sheet";
  /** Mobile sheet owns the primary search field and reuses this panel for advanced filters only. */
  showSearch?: boolean;
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
  usage,
  onUsageChange,
  variant = "sheet",
  showSearch = true,
}: GalleryFilterPanelProps) {
  const [tagsExpanded, setTagsExpanded] = useState(false);

  // When searching tags, show all matches. Otherwise collapse.
  const isSearching = tagSearch.length > 0;
  const shouldCollapse = !isSearching && !tagsExpanded && displayTags.length > DEFAULT_VISIBLE_TAG_COUNT;

  // Always keep selected tags visible even when collapsed.
  const visibleTags = shouldCollapse
    ? (() => {
        const firstN = displayTags.slice(0, DEFAULT_VISIBLE_TAG_COUNT);
        const selectedHidden = displayTags
          .slice(DEFAULT_VISIBLE_TAG_COUNT)
          .filter((tag) => selectedTags.includes(tag));
        // De-dup in case a selected tag is already in firstN
        const extraSet = new Set(firstN);
        return [...firstN, ...selectedHidden.filter((t) => !extraSet.has(t))];
      })()
    : displayTags;

  const hiddenCount = shouldCollapse ? displayTags.length - visibleTags.length : 0;

  const sectionLabel = "mb-2.5 [font-size:var(--public-font-caption)] font-semibold tracking-[0.18em] uppercase text-muted-foreground";
  const divider = "border-t border-border/40 pt-4 mt-1";
  const activeChip = "bg-primary text-primary-foreground shadow-sm border border-primary";
  const idleChip = "border border-border/50 bg-transparent text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-primary/5";
  const chipBase = "h-6 rounded-[5px] px-2.5 [font-size:var(--public-font-caption)] font-medium transition-all duration-150";

  const inner = (
    <div className="space-y-4">
      {/* Search */}
      {showSearch && (
        <div>
          <p className={sectionLabel}>搜尋</p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜尋台本..."
              className="w-full rounded-lg border border-border/60 bg-background pl-8.5 pr-7 py-[0.45rem] [font-size:var(--public-font-meta)] placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-all duration-150"
              style={{ paddingLeft: "2.125rem" }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="清除搜尋"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted/60 transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Usage filter */}
      {usage !== undefined && onUsageChange && (
        <div className={divider}>
          <p className={sectionLabel}>使用權限</p>
          <div className="flex flex-wrap gap-1.5">
            {USAGE_OPTIONS.map((opt) => {
              const active = usage === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onUsageChange(opt.value)}
                  className={`${chipBase} ${active ? activeChip : idleChip}`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* License shortcuts */}
      {licenseTagShortcuts.length > 0 && (
        <div className={divider}>
          <p className={sectionLabel}>授權類型</p>
          <div className="flex flex-wrap gap-1.5">
            {licenseTagShortcuts.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onToggleTag(tag)}
                  className={`${chipBase} ${active ? activeChip : idleChip}`}
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
        <div className={divider}>
          <p className={sectionLabel}>分類與標籤</p>
          <div className="relative mb-2.5">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/50" />
            <input
              type="search"
              value={tagSearch}
              onChange={(e) => onTagSearchChange(e.target.value)}
              placeholder="篩選標籤..."
              className="w-full rounded-lg border border-border/50 bg-background/70 py-[0.35rem] [font-size:var(--public-font-caption)] placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all duration-150"
              style={{ paddingLeft: "2rem", paddingRight: "0.75rem" }}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {visibleTags.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => onToggleTag(tag)}
                  className={`${chipBase} ${active ? activeChip : idleChip}`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          {shouldCollapse && (
            <button
              type="button"
              onClick={() => setTagsExpanded(true)}
              className="mt-2 [font-size:var(--public-font-caption)] text-primary hover:text-primary/80 transition-colors"
            >
              展開更多（{hiddenCount}）
            </button>
          )}
          {tagsExpanded && !isSearching && displayTags.length > DEFAULT_VISIBLE_TAG_COUNT && (
            <button
              type="button"
              onClick={() => setTagsExpanded(false)}
              className="mt-2 [font-size:var(--public-font-caption)] text-muted-foreground hover:text-foreground transition-colors"
            >
              收合標籤
            </button>
          )}
        </div>
      )}

      {hasFilters && (
        <div className="border-t border-border/40 pt-3">
          <button
            type="button"
            onClick={onResetFilters}
            className="w-full rounded-lg border border-border/50 py-1.5 [font-size:var(--public-font-caption)] text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all duration-150"
          >
            清除全部篩選
          </button>
        </div>
      )}
    </div>
  );

  if (variant === "sidebar") {
    return (
      <div
        className="rounded-xl p-4"
        style={{
          border: "1px solid hsl(var(--border) / 0.45)",
          background: "hsl(var(--card) / 0.7)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 1px 3px hsl(var(--foreground) / 0.04), 0 1px 2px hsl(var(--foreground) / 0.03)",
        }}
      >
        {inner}
      </div>
    );
  }

  return inner;
}
