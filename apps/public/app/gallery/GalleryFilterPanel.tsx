"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { PublicFilterCheck } from "@/components/PublicFilterCheck";
import { GallerySegmentBar } from "./GallerySegmentBar";
import { GallerySortControl, type GallerySortValue } from "./GallerySortControl";

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
  demoOnly?: boolean;
  onDemoOnlyChange?: (enabled: boolean) => void;
  /** Optional: 作品分類 (segment) lives in the same panel so every entry point shares one state. */
  segment?: string;
  onSegmentChange?: (v: string) => void;
  /** Optional: 排序. null = 分區瀏覽. */
  sort?: GallerySortValue | null;
  onSortChange?: (v: GallerySortValue | null) => void;
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
  demoOnly,
  onDemoOnlyChange,
  segment,
  onSegmentChange,
  sort,
  onSortChange,
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

  const sectionLabel = "mb-2 [font-size:var(--public-font-meta)] font-bold text-foreground";
  const divider = "border-t border-border pt-3.5";
  const activeChip = "bg-primary text-primary-foreground font-bold border border-primary";
  const idleChip = "border border-border bg-card text-foreground/80 hover:bg-muted hover:text-link";
  const chipBase = "homepage-filter-option inline-flex h-7 items-center gap-1 rounded-sm px-2 [font-size:var(--public-font-caption)] transition-colors duration-100";

  const inner = (
    <div className="space-y-4">
      {/* Search */}
      {showSearch && (
        <div>
          <p className={sectionLabel}>搜尋</p>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="搜尋台本..."
              className="public-command-search w-full rounded-sm border border-border bg-card pr-7 py-[0.45rem] [font-size:var(--public-font-meta)] placeholder:text-muted-foreground focus:outline-none focus:border-link focus:ring-1 focus:ring-link"
              style={{ paddingLeft: "2.125rem" }}
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="清除搜尋"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded text-muted-foreground/50 hover:text-foreground hover:bg-muted transition-all"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Segment */}
      {segment !== undefined && onSegmentChange && (
        <div className={showSearch ? divider : ""}>
          <p className={sectionLabel}>{onDemoOnlyChange ? "作品篩選" : "作品分類"}</p>
          <GallerySegmentBar segment={segment} onSegmentChange={onSegmentChange} demoOnly={demoOnly} onDemoOnlyChange={onDemoOnlyChange} />
        </div>
      )}

      {/* Sort */}
      {sort !== undefined && onSortChange && (
        <div className={divider}>
          <p className={sectionLabel}>排序</p>
          <GallerySortControl value={sort} onChange={onSortChange} />
        </div>
      )}

      {/* Demo filter */}
      {onDemoOnlyChange && (segment === undefined || !onSegmentChange) && (
        <div className={divider}>
          <p className={sectionLabel}>作品條件</p>
          <button type="button" aria-pressed={Boolean(demoOnly)} onClick={() => onDemoOnlyChange(!demoOnly)} className={`${chipBase} ${demoOnly ? activeChip : idleChip}`}><PublicFilterCheck />有 Demo</button>
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
                  aria-pressed={active}
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
                  aria-pressed={active}
                  onClick={() => onToggleTag(tag)}
                  className={`${chipBase} ${active ? activeChip : idleChip}`}
                >
                  <PublicFilterCheck />{tag.replace(/^授權:/, "")}
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
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={tagSearch}
              onChange={(e) => onTagSearchChange(e.target.value)}
              placeholder="篩選標籤..."
              className="public-command-search w-full rounded-sm border border-border bg-card py-[0.35rem] [font-size:var(--public-font-caption)] placeholder:text-muted-foreground focus:outline-none focus:border-link focus:ring-1 focus:ring-link"
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
                  aria-pressed={active}
                  onClick={() => onToggleTag(tag)}
                  className={`${chipBase} ${active ? activeChip : idleChip}`}
                >
                  <PublicFilterCheck />{tag}
                </button>
              );
            })}
          </div>
          {shouldCollapse && (
            <button
              type="button"
              onClick={() => setTagsExpanded(true)}
              className="mt-2 [font-size:var(--public-font-caption)] text-link hover:underline"
            >
              展開更多（{hiddenCount}）
            </button>
          )}
          {tagsExpanded && !isSearching && displayTags.length > DEFAULT_VISIBLE_TAG_COUNT && (
            <button
              type="button"
              onClick={() => setTagsExpanded(false)}
              className="mt-2 [font-size:var(--public-font-caption)] text-link hover:underline"
            >
              收合標籤
            </button>
          )}
        </div>
      )}

      {hasFilters && (
        <div className="border-t border-border pt-3">
          <button
            type="button"
            onClick={onResetFilters}
            className="w-full rounded-sm border border-border bg-card py-1.5 [font-size:var(--public-font-caption)] text-foreground/80 hover:bg-muted hover:text-foreground"
          >
            清除全部篩選
          </button>
        </div>
      )}
    </div>
  );

  if (variant === "sidebar") {
    return (
      <div className="pr-1 [&>div>div:first-child]:border-t-0 [&>div>div:first-child]:pt-0">
        {inner}
      </div>
    );
  }

  return inner;
}
