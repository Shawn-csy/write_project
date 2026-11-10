"use client";

import { useEffect, useRef, useState } from "react";
import { FilePlus2, List, MoreHorizontal, Search, SlidersHorizontal } from "lucide-react";
import type { GalleryViewMode } from "@write/public-ui";
import { LazyPublicFeedbackDialog } from "@/components/LazyPublicFeedbackDialog";
import { PublicFeedbackTrigger } from "@/components/PublicFeedbackTrigger";
import { GallerySegmentBar } from "./GallerySegmentBar";
import { GallerySearchField } from "./GallerySearchField";
import { GallerySortControl, GALLERY_OVERVIEW_LABEL, GALLERY_SORT_OPTIONS, type GallerySortValue } from "./GallerySortControl";
import { GalleryViewModeToggle } from "./GalleryViewModeToggle";
import { GalleryFilterSummary, type ActiveGalleryFilterChip } from "./GalleryFilterSummary";

interface GalleryToolbarProps {
  segment: string;
  onSegmentChange: (value: string) => void;
  demoOnly: boolean;
  onDemoOnlyChange: (enabled: boolean) => void;
  sort: GallerySortValue | null;
  onSortChange: (value: GallerySortValue | null) => void;
  viewMode: GalleryViewMode;
  onViewModeChange: (mode: GalleryViewMode) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  resultCount: number;
  chips: ActiveGalleryFilterChip[];
  onRemoveChip: (chip: ActiveGalleryFilterChip) => void;
  onClearFilters: () => void;
  /** Opens the full filter sheet (search + every filter). */
  onOpenFilterSheet: () => void;
  sidebarCollapsed: boolean;
  onExpandSidebar: () => void;
  onOpenList: () => void;
}

const ICON_BUTTON =
  "relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/70 text-muted-foreground transition-colors duration-150 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";
const TEXT_BUTTON =
  "relative inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg border border-border/60 bg-background/70 px-3 [font-size:var(--public-font-meta)] font-medium text-muted-foreground transition-colors duration-150 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

const ICON_BUTTON_SM = ICON_BUTTON.replace("h-10 w-10", "h-9 w-9").replace("rounded-lg", "rounded-full");
const ICON_BUTTON_MOBILE = ICON_BUTTON.replace("h-10 w-10", "h-9 w-9");
const TEXT_BUTTON_SM = TEXT_BUTTON;

function CountBadge({ count, floating = false }: { count: number; floating?: boolean }) {
  if (count <= 0) return null;
  return (
    <span
      className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 [font-size:var(--public-font-caption)] font-semibold leading-none text-primary-foreground ${floating ? "absolute -right-1 -top-1" : ""}`}
    >
      {count}
    </span>
  );
}

/**
 * Homepage gallery toolbar: quick switches (分類 / 排序 / 搜尋) live here and stay
 * reachable while scrolling; deep filters live in the sidebar or the filter sheet.
 *
 * At rest it shows every control. Once it sticks under the top bar it collapses
 * to a single row without swapping control types, so nothing jumps.
 */
export function GalleryToolbar({
  segment,
  onSegmentChange,
  demoOnly,
  onDemoOnlyChange,
  sort,
  onSortChange,
  viewMode,
  onViewModeChange,
  searchTerm,
  onSearchChange,
  resultCount,
  chips,
  onRemoveChip,
  onClearFilters,
  onOpenFilterSheet,
  sidebarCollapsed,
  onExpandSidebar,
  onOpenList,
}: GalleryToolbarProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);

  // The sentinel sits above the bar, so its position never depends on the bar's
  // own height — collapsing the bar cannot flip the state back.
  useEffect(() => {
    const update = () => {
      const sentinel = sentinelRef.current;
      const bar = barRef.current;
      if (!sentinel || !bar) return;
      const stickyTop = parseFloat(getComputedStyle(bar).top) || 0;
      setStuck(sentinel.getBoundingClientRect().top < stickyTop - 1);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  // Never collapse underneath someone who is typing.
  const compact = stuck && !searchFocused;
  const filterCount = chips.length;

  useEffect(() => {
    if (!compact) setActionsOpen(false);
  }, [compact]);

  useEffect(() => {
    if (!actionsOpen) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!actionsRef.current?.contains(event.target as Node)) setActionsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setActionsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [actionsOpen]);

  return (
    <>
      <div ref={sentinelRef} aria-hidden className="h-px" />
      <div
        ref={barRef}
        data-compact={compact ? "true" : "false"}
        data-testid="gallery-toolbar"
        className={`sticky top-[82px] z-30 -mx-4 mb-4 bg-background/95 px-4 backdrop-blur-md transition-shadow duration-200 sm:-mx-5 sm:top-14 sm:px-5 lg:mx-0 lg:px-0 ${
          compact ? "border-b border-border/60 shadow-[0_10px_18px_-16px_rgba(0,0,0,0.5)]" : ""
        }`}
      >
        {/* Mobile row A — search and actions. Dropped once stuck. */}
        {!compact && (
          <div className="flex items-center gap-2 pb-1 md:hidden">
            <GallerySearchField
              value={searchTerm}
              onChange={onSearchChange}
              onFocusChange={setSearchFocused}
              className="flex-1"
            />
            <button type="button" onClick={onOpenFilterSheet} aria-label="開啟篩選" className={ICON_BUTTON_MOBILE}>
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              <CountBadge count={filterCount} floating />
            </button>
            <button type="button" onClick={onOpenList} aria-label="開啟台本一覽表" title="一覽表" className={`${ICON_BUTTON_MOBILE} max-[359px]:hidden`}>
              <List className="h-4 w-4" aria-hidden />
            </button>
            <PublicFeedbackTrigger mode="listing" compactAtMobile onClick={() => setSubmitOpen(true)} />
          </div>
        )}

        {/* Main row — 分類 on every breakpoint; the rest joins depending on width and stuck state. */}
        <div className={`flex items-center gap-2 md:h-12 md:gap-3 ${compact ? "py-1.5 md:py-0" : "pb-1 md:border-b md:border-border/40 md:pb-0"}`}>
          {sidebarCollapsed && (
            <button type="button" onClick={onExpandSidebar} aria-label={filterCount > 0 ? `展開篩選欄，已選 ${filterCount} 個篩選` : "展開篩選欄"} className={`${TEXT_BUTTON} hidden lg:inline-flex`}>
              <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
              篩選
              <CountBadge count={filterCount} />
            </button>
          )}

          <div className="min-w-0 flex-1 md:self-end">
            <GallerySegmentBar segment={segment} onSegmentChange={onSegmentChange} demoOnly={demoOnly} onDemoOnlyChange={onDemoOnlyChange} />
          </div>

          {/* Mobile: 排序 as a native select — four options, thumb friendly, no extra row. */}
          <label className="sr-only" htmlFor="gallery-sort-select">排序</label>
          <select
            id="gallery-sort-select"
            value={sort ?? "overview"}
            onChange={(event) => onSortChange(event.target.value === "overview" ? null : (event.target.value as GallerySortValue))}
            className="h-9 shrink-0 rounded-full border border-border/60 bg-background pl-3 pr-1 [font-size:var(--public-font-meta)] font-medium text-foreground focus:border-primary/50 focus:outline-none md:hidden"
          >
            <option value="overview">{GALLERY_OVERVIEW_LABEL}</option>
            {GALLERY_SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          {/* Desktop: sort moves up into this row once stuck. */}
          {compact && <GallerySortControl value={sort} onChange={onSortChange} showOverview className="hidden shrink-0 md:inline-flex" />}
          <GallerySearchField
            value={searchTerm}
            onChange={onSearchChange}
            onFocusChange={setSearchFocused}
            className={`hidden shrink-0 ${compact ? "w-52 xl:block" : "w-56 md:block lg:w-36 xl:w-64"}`}
          />
          {/* Keep the secondary actions reachable in the single-row sticky state. */}
          {compact && <div ref={actionsRef} className="relative shrink-0">
            <button
              type="button"
              onClick={() => setActionsOpen((open) => !open)}
              aria-label="更多操作"
              aria-expanded={actionsOpen}
              aria-controls="gallery-toolbar-actions"
              className={`${ICON_BUTTON_SM} md:h-10 md:w-10 md:rounded-lg`}
            >
              <MoreHorizontal className="h-4 w-4" aria-hidden />
              <CountBadge count={filterCount} floating />
            </button>
            {actionsOpen && <div id="gallery-toolbar-actions" role="group" aria-label="更多操作" className="absolute right-0 top-full z-50 mt-2 w-44 rounded-xl border border-border/70 bg-background p-1.5 shadow-xl">
              <button type="button" onClick={() => { setActionsOpen(false); onOpenFilterSheet(); }} className="flex h-10 w-full items-center gap-2 rounded-md px-3 text-left [font-size:var(--public-font-meta)] text-foreground hover:bg-muted/60">
                <Search className="h-4 w-4" aria-hidden />搜尋與篩選
              </button>
              <button type="button" onClick={() => { setActionsOpen(false); onOpenList(); }} className="flex h-10 w-full items-center gap-2 rounded-md px-3 text-left [font-size:var(--public-font-meta)] text-foreground hover:bg-muted/60">
                <List className="h-4 w-4" aria-hidden />台本一覽表
              </button>
              <button type="button" onClick={() => { setActionsOpen(false); setSubmitOpen(true); }} className="flex h-10 w-full items-center gap-2 rounded-md px-3 text-left [font-size:var(--public-font-meta)] text-foreground hover:bg-muted/60">
                <FilePlus2 className="h-4 w-4" aria-hidden />投稿台本
              </button>
            </div>}
          </div>}
          {/* Filter sheet stays available at tablet widths before the bar sticks. */}
          {!compact && <button
            type="button"
            onClick={onOpenFilterSheet}
            aria-label="搜尋與篩選"
            className={`${TEXT_BUTTON} hidden md:inline-flex lg:hidden`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />篩選
            <CountBadge count={filterCount} />
          </button>}
          {!compact && <div className="hidden shrink-0 md:block lg:[&_button]:w-10 lg:[&_button]:px-0 lg:[&_span]:hidden xl:[&_button]:w-auto xl:[&_button]:px-4 xl:[&_span]:inline"><PublicFeedbackTrigger mode="listing" compactAtMobile onClick={() => setSubmitOpen(true)} /></div>}
        </div>

        {/* Desktop row 2 — how to browse. Dropped once stuck. */}
        {!compact && (
          <div className="hidden items-center justify-between gap-3 py-1.5 md:flex">
            <div className="flex min-w-0 items-center gap-3">
              <GallerySortControl value={sort} onChange={onSortChange} showOverview />
              <span className="truncate [font-size:var(--public-font-meta)] text-muted-foreground" aria-live="polite">
                共 {resultCount.toLocaleString()} 部
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <button type="button" onClick={onOpenList} aria-label="開啟台本一覽表" className={TEXT_BUTTON_SM}>
                <List className="h-3.5 w-3.5" aria-hidden />
                一覽表
              </button>
              <GalleryViewModeToggle value={viewMode} onChange={onViewModeChange} compact />
            </div>
          </div>
        )}

        {!compact && <GalleryFilterSummary chips={chips} onRemove={onRemoveChip} onClear={onClearFilters} />}
      </div>
      <LazyPublicFeedbackDialog mode="listing" hideTrigger open={submitOpen} onOpenChange={setSubmitOpen} />
    </>
  );
}
