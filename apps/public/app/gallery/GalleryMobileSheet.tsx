"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { GalleryFilterPanel } from "./GalleryFilterPanel";
import { GalleryViewModeToggle } from "./GalleryViewModeToggle";
import { GallerySortControl, type GallerySortValue } from "./GallerySortControl";
import { GalleryFilterSummary, type ActiveGalleryFilterChip } from "./GalleryFilterSummary";

interface GalleryMobileSheetProps {
  open: boolean;
  onClose: () => void;
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
  usage: string;
  setUsage: (v: string) => void;
  demoOnly?: boolean;
  setDemoOnly?: (enabled: boolean) => void;
  viewModeValue: "standard" | "compact";
  setViewMode: (v: "standard" | "compact") => void;
  segment?: string;
  onSegmentChange?: (v: string) => void;
  sort?: GallerySortValue | null;
  onSortChange?: (v: GallerySortValue | null) => void;
  /** Active filter chips (same list shown on the page) so the sheet is the single filter surface. */
  chips?: ActiveGalleryFilterChip[];
  onRemoveChip?: (chip: ActiveGalleryFilterChip) => void;
  /** Result count for the sticky "看結果" button. */
  resultCount?: number;
}

export function GalleryMobileSheet({
  open,
  onClose,
  usage,
  setUsage,
  demoOnly,
  setDemoOnly,
  viewModeValue,
  setViewMode,
  segment,
  onSegmentChange,
  sort,
  onSortChange,
  chips,
  onRemoveChip,
  resultCount,
  ...filterProps
}: GalleryMobileSheetProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const advancedCount =
    filterProps.selectedTags.length +
    (usage !== "all" ? 1 : 0) +
    (demoOnly ? 1 : 0) +
    (segment && segment !== "all" ? 1 : 0) +
    (viewModeValue !== "standard" ? 1 : 0);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [advancedClosing, setAdvancedClosing] = useState(false);

  useEffect(() => {
    if (open && advancedCount > 0) setAdvancedOpen(true);
  }, [open, advancedCount]);

  useEffect(() => {
    if (!advancedClosing) return;
    const timeout = window.setTimeout(() => setAdvancedClosing(false), 200);
    return () => window.clearTimeout(timeout);
  }, [advancedClosing]);

  // Esc closes; focus trap; body scroll lock
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.defaultPrevented) return;
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const sheet = document.getElementById("gallery-mobile-sheet");
      if (!sheet) return;
      const focusable = Array.from(
        sheet.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
        )
      ).filter((element) => !element.closest("[inert]"));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }

    document.addEventListener("keydown", onKeyDown);
    // Initial focus on search: this sheet is search-first on mobile.
    const rafId = requestAnimationFrame(() => searchInputRef.current?.focus());

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(rafId);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 sheet-scrim"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        id="gallery-mobile-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="篩選與搜尋"
        className="absolute inset-x-0 bottom-0 flex max-h-[90vh] flex-col rounded-t-2xl sm:left-1/2 sm:right-auto sm:top-1/2 sm:bottom-auto sm:w-[min(92vw,720px)] sm:max-h-[82vh] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-2xl"
        style={{
          background: "hsl(var(--background))",
          boxShadow: "0 12px 48px hsl(var(--foreground) / 0.2), 0 0 0 1px hsl(var(--border) / 0.45)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-sm bg-border" aria-hidden />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-border">
          <div>
            <p className="text-[0.9375rem] font-semibold text-foreground">搜尋台本</p>
            {advancedCount > 0 && (
              <p className="[font-size:var(--public-font-caption)] text-muted-foreground mt-0.5">
                已套用 {advancedCount} 個進階條件
              </p>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="關閉篩選"
            className="h-11 w-11 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Quick search */}
          <div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                ref={searchInputRef}
                type="text"
                value={filterProps.searchTerm}
                onChange={(e) => filterProps.onSearchChange(e.target.value)}
                placeholder="輸入作品、作者、標籤..."
                aria-label="搜尋台本"
                className="public-search-field w-full rounded-xl border border-transparent py-2.5 pr-9 [font-size:var(--public-font-body)] placeholder:text-muted-foreground"
                style={{ paddingLeft: "2.5rem" }}
              />
              {filterProps.searchTerm && (
                <button
                  type="button"
                  onClick={() => filterProps.onSearchChange("")}
                  aria-label="清除搜尋"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {chips && chips.length > 0 && onRemoveChip && (
            <GalleryFilterSummary chips={chips} onRemove={onRemoveChip} onClear={filterProps.onResetFilters} />
          )}

          {sort !== undefined && onSortChange && (
            <div>
              <p className="text-muted-foreground mb-2 [font-size:var(--public-font-caption)] font-semibold">排序</p>
              <GallerySortControl value={sort} onChange={onSortChange} />
            </div>
          )}

          {/* Advanced filters */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setAdvancedClosing(advancedOpen && Boolean(window.matchMedia?.("(prefers-reduced-motion: no-preference)").matches));
                setAdvancedOpen(!advancedOpen);
              }}
              aria-expanded={advancedOpen}
              className="flex h-12 w-full items-center justify-between px-4 text-left [font-size:var(--public-font-meta)] font-semibold text-foreground hover:bg-muted transition-colors"
            >
              <span>
                進階篩選
                {advancedCount > 0 && (
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 [font-size:var(--public-font-caption)] text-link">
                    {advancedCount}
                  </span>
                )}
              </span>
              <ChevronDown
                className="h-4 w-4 text-muted-foreground motion-safe:transition-transform motion-safe:duration-150"
                style={{ transform: advancedOpen ? "rotate(180deg)" : undefined }}
                aria-hidden
              />
            </button>

            <div className="public-disclosure-content" data-open={advancedOpen} inert={!advancedOpen} aria-hidden={!advancedOpen}>
              {(advancedOpen || advancedClosing) && <div>
                <div className="space-y-5 border-t border-border px-4 py-4">
                  <div>
                    <p className="text-muted-foreground mb-2 [font-size:var(--public-font-caption)] font-semibold">
                      顯示模式
                    </p>
                    <GalleryViewModeToggle value={viewModeValue} onChange={setViewMode} />
                  </div>

                  <GalleryFilterPanel
                    {...filterProps}
                    usage={usage}
                    onUsageChange={setUsage}
                    demoOnly={demoOnly}
                    onDemoOnlyChange={setDemoOnly}
                    segment={segment}
                    onSegmentChange={onSegmentChange}
                    showSearch={false}
                    onResetFilters={() => {
                      filterProps.onResetFilters();
                      onClose();
                    }}
                  />
                </div>
              </div>}
            </div>
          </div>

          <div className="h-2" aria-hidden />
        </div>

        {/* Sticky footer: always reachable apply button */}
        <div className="shrink-0 border-t border-border bg-background px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="h-11 w-full rounded-lg bg-primary [font-size:var(--public-font-meta)] font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            {typeof resultCount === "number" ? `查看 ${resultCount} 筆結果` : "完成"}
          </button>
        </div>
      </div>
    </div>
  );
}
