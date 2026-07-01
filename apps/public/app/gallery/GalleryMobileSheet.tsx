"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { GalleryFilterPanel } from "./GalleryFilterPanel";
import { GalleryViewModeToggle } from "./GalleryViewModeToggle";

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
  viewModeValue: "standard" | "compact";
  setViewMode: (v: "standard" | "compact") => void;
}

export function GalleryMobileSheet({
  open,
  onClose,
  usage,
  setUsage,
  viewModeValue,
  setViewMode,
  ...filterProps
}: GalleryMobileSheetProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const advancedCount =
    filterProps.selectedTags.length +
    (usage !== "all" ? 1 : 0) +
    (viewModeValue !== "standard" ? 1 : 0);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    if (open && advancedCount > 0) setAdvancedOpen(true);
  }, [open, advancedCount]);

  // Esc closes; focus trap; body scroll lock
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const sheet = document.getElementById("gallery-mobile-sheet");
      if (!sheet) return;
      const focusable = Array.from(
        sheet.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
        )
      );
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
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 backdrop-blur-[2px] editorial-scrim"
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        id="gallery-mobile-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="篩選與搜尋"
        className="absolute bottom-0 left-0 right-0 flex flex-col max-h-[85vh] overflow-hidden"
        style={{
          borderRadius: "1rem 1rem 0 0",
          background: "hsl(var(--background))",
          boxShadow: "0 -4px 32px hsl(var(--foreground) / 0.12), 0 -1px 0 hsl(var(--border) / 0.5)",
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full editorial-handle" aria-hidden />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 shrink-0 editorial-border-b">
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
            className="h-11 w-11 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Quick search */}
          <div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/60" />
              <input
                ref={searchInputRef}
                type="search"
                value={filterProps.searchTerm}
                onChange={(e) => filterProps.onSearchChange(e.target.value)}
                placeholder="輸入作品、作者、標籤..."
                className="w-full rounded-xl border border-border/60 bg-background py-2.5 pr-9 [font-size:var(--public-font-body)] placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/15 transition-all duration-150"
                style={{ paddingLeft: "2.5rem" }}
              />
              {filterProps.searchTerm && (
                <button
                  type="button"
                  onClick={() => filterProps.onSearchChange("")}
                  aria-label="清除搜尋"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 h-8 w-8 inline-flex items-center justify-center rounded-lg text-muted-foreground/60 hover:text-foreground hover:bg-muted/60 transition-all"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Advanced filters */}
          <div className="rounded-xl border border-border/45 bg-card/45 overflow-hidden">
            <button
              type="button"
              onClick={() => setAdvancedOpen((v) => !v)}
              aria-expanded={advancedOpen}
              className="flex h-12 w-full items-center justify-between px-4 text-left [font-size:var(--public-font-meta)] font-semibold text-foreground hover:bg-muted/40 transition-colors"
            >
              <span>
                進階篩選
                {advancedCount > 0 && (
                  <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 [font-size:var(--public-font-caption)] text-primary">
                    {advancedCount}
                  </span>
                )}
              </span>
              <ChevronDown
                className="h-4 w-4 text-muted-foreground transition-transform duration-150"
                style={{ transform: advancedOpen ? "rotate(180deg)" : undefined }}
                aria-hidden
              />
            </button>

            {advancedOpen && (
              <div className="border-t border-border/40 px-4 py-4 space-y-5">
                <div>
                  <p className="editorial-dim mb-2 text-[10px] font-semibold uppercase tracking-[0.18em]">
                    顯示模式
                  </p>
                  <GalleryViewModeToggle value={viewModeValue} onChange={setViewMode} />
                </div>

                <GalleryFilterPanel
                  {...filterProps}
                  usage={usage}
                  onUsageChange={setUsage}
                  showSearch={false}
                  onResetFilters={() => {
                    filterProps.onResetFilters();
                    onClose();
                  }}
                />
              </div>
            )}
          </div>

          {/* Safe area bottom spacer */}
          <div className="h-4" aria-hidden />
        </div>
      </div>
    </div>
  );
}
