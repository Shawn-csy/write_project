"use client";

import { useEffect, useRef, useState } from "react";
import { FilePlus2, List, MoreHorizontal, Search, SlidersHorizontal } from "lucide-react";
import type { GalleryViewMode } from "@write/public-ui";
import { LazyPublicFeedbackDialog } from "@/components/LazyPublicFeedbackDialog";
import { PublicFeedbackTrigger } from "@/components/PublicFeedbackTrigger";
import { GallerySegmentBar, SEGMENT_OPTIONS } from "./GallerySegmentBar";
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
  "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground";
const TEXT_BUTTON =
  "relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border bg-card px-3 text-[0.8125rem] text-foreground/80 hover:bg-muted hover:text-foreground";

const ICON_BUTTON_SM = ICON_BUTTON;
const ICON_BUTTON_MOBILE = ICON_BUTTON;
const TEXT_BUTTON_SM = TEXT_BUTTON;

function CategorySelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      aria-label="作品分類"
      className="h-9 w-28 min-w-0 rounded-sm border border-border bg-card px-2 text-[0.875rem] text-foreground focus:border-link focus:outline-none"
    >
      {SEGMENT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

function SortSelect({ value, onChange }: { value: GallerySortValue | null; onChange: (value: GallerySortValue | null) => void }) {
  return (
    <select
      value={value ?? "overview"}
      onChange={(event) => onChange(event.target.value === "overview" ? null : event.target.value as GallerySortValue)}
      aria-label="排序"
      className="h-9 w-20 shrink-0 rounded-sm border border-border bg-card px-2 text-[0.875rem] text-foreground focus:border-foreground focus:outline-none"
    >
      <option value="overview">{GALLERY_OVERVIEW_LABEL}</option>
      {GALLERY_SORT_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

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

/** Homepage gallery controls, with a full browsing layout and a one-row sticky layout. */
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
        className={`gallery-toolbar sticky top-[86px] z-30 -mx-4 mb-5 bg-background px-4 sm:-mx-5 sm:top-[57px] sm:px-5 lg:mx-0 lg:px-0 ${
 compact ? "border-b border-border shadow-[0_2px_4px_rgba(0,0,0,0.06)]" : ""
        }`}
      >
        {compact ? (
          <div className="flex h-12 min-w-0 items-center gap-2">
            {sidebarCollapsed && (
              <button type="button" onClick={onExpandSidebar} aria-label="展開篩選欄" className={`${ICON_BUTTON_SM} hidden lg:inline-flex`}>
                <SlidersHorizontal className="h-4 w-4" aria-hidden />
              </button>
            )}
            <div className="flex min-w-0 flex-1 items-center gap-1.5">
              <div className="shrink-0 md:hidden"><CategorySelect value={segment} onChange={onSegmentChange} /></div>
              <div className="hidden min-w-0 flex-1 md:block">
                <GallerySegmentBar segment={segment} onSegmentChange={onSegmentChange} demoOnly={demoOnly} onDemoOnlyChange={onDemoOnlyChange} />
              </div>
            </div>
            <div className="xl:hidden"><SortSelect value={sort} onChange={onSortChange} /></div>
            <GallerySortControl value={sort} onChange={onSortChange} showOverview className="hidden shrink-0 xl:inline-flex" />
            <GalleryViewModeToggle value={viewMode} onChange={onViewModeChange} compact />
            <div ref={actionsRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setActionsOpen((open) => !open)}
                aria-label="更多操作"
                aria-expanded={actionsOpen}
                aria-controls="gallery-toolbar-actions"
                className={ICON_BUTTON_SM}
              >
                <MoreHorizontal className="h-4 w-4" aria-hidden />
                <CountBadge count={filterCount} floating />
              </button>
              {actionsOpen && (
                <div id="gallery-toolbar-actions" role="group" aria-label="更多操作" className="absolute right-0 top-full z-50 mt-1 w-44 rounded-md border border-border bg-card p-1 shadow-lg">
                  <button type="button" onClick={() => { setActionsOpen(false); onOpenFilterSheet(); }} className="flex h-10 w-full items-center gap-2 rounded-md px-3 text-left [font-size:var(--public-font-meta)] text-foreground hover:bg-muted">
                    <Search className="h-4 w-4" aria-hidden />搜尋與篩選
                  </button>
                  <button type="button" onClick={() => { onDemoOnlyChange(!demoOnly); setActionsOpen(false); }} aria-pressed={demoOnly} className="flex h-10 w-full items-center gap-2 rounded-md px-3 text-left [font-size:var(--public-font-meta)] text-foreground hover:bg-muted md:hidden">
                    <span aria-hidden className="w-4 text-center">{demoOnly ? "✓" : ""}</span>有 Demo
                  </button>
                  <button type="button" onClick={() => { setActionsOpen(false); onOpenList(); }} className="flex h-10 w-full items-center gap-2 rounded-md px-3 text-left [font-size:var(--public-font-meta)] text-foreground hover:bg-muted">
                    <List className="h-4 w-4" aria-hidden />台本一覽表
                  </button>
                  <button type="button" onClick={() => { setActionsOpen(false); setSubmitOpen(true); }} className="flex h-10 w-full items-center gap-2 rounded-md px-3 text-left [font-size:var(--public-font-meta)] text-foreground hover:bg-muted">
                    <FilePlus2 className="h-4 w-4" aria-hidden />投稿台本
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5 border-b border-border md:gap-x-3 md:gap-y-1 xl:grid-cols-[minmax(0,1fr)_16rem_auto]">
              <GallerySearchField
                value={searchTerm}
                onChange={onSearchChange}
                onFocusChange={setSearchFocused}
                className="col-start-1 row-start-1 md:hidden xl:col-start-2 xl:row-start-1 xl:block"
              />
              <div className="col-start-1 row-start-2 flex min-w-0 items-center gap-1.5 md:row-start-1">
                {sidebarCollapsed && (
                  <button type="button" onClick={onExpandSidebar} aria-label="展開篩選欄" className={`${ICON_BUTTON} hidden lg:inline-flex`}>
                    <SlidersHorizontal className="h-4 w-4" aria-hidden />
                  </button>
                )}
                <div className="flex min-w-0 flex-1 items-center gap-1.5">
                  <div className="shrink-0 md:hidden"><CategorySelect value={segment} onChange={onSegmentChange} /></div>
                  <button type="button" onClick={() => onDemoOnlyChange(!demoOnly)} aria-pressed={demoOnly} className={`h-9 shrink-0 rounded-sm border px-2 text-[0.875rem] md:hidden ${demoOnly ? "border-primary bg-primary font-semibold text-primary-foreground" : "border-border bg-card text-muted-foreground"}`}>
                    有 Demo
                  </button>
                  <div className="hidden min-w-0 flex-1 md:block">
                    <GallerySegmentBar segment={segment} onSegmentChange={onSegmentChange} demoOnly={demoOnly} onDemoOnlyChange={onDemoOnlyChange} />
                  </div>
                </div>
              </div>
              <div className="col-start-2 row-start-1 flex shrink-0 items-center gap-2 xl:col-start-3">
                <button type="button" onClick={onOpenFilterSheet} aria-label="開啟篩選" className={`${ICON_BUTTON_MOBILE} lg:hidden`}>
                  <SlidersHorizontal className="h-4 w-4" aria-hidden />
                  <CountBadge count={filterCount} floating />
                </button>
                <button type="button" onClick={onOpenList} aria-label="開啟台本一覽表" className={`${ICON_BUTTON_MOBILE} hidden min-[360px]:inline-flex md:hidden`}>
                  <List className="h-4 w-4" aria-hidden />
                </button>
                <div className="lg:[&_button]:w-9 lg:[&_button]:px-0 lg:[&_span]:hidden xl:[&_button]:w-auto xl:[&_button]:px-4 xl:[&_span]:inline">
                  <PublicFeedbackTrigger mode="listing" compactAtMobile onClick={() => setSubmitOpen(true)} />
                </div>
              </div>
              <div className="col-start-2 row-start-2 md:hidden"><SortSelect value={sort} onChange={onSortChange} /></div>
              <div className="col-span-2 col-start-1 row-start-2 hidden min-w-0 items-center gap-3 md:flex xl:col-span-3">
                <GallerySearchField
                  value={searchTerm}
                  onChange={onSearchChange}
                  onFocusChange={setSearchFocused}
                  className="min-w-0 flex-1 xl:hidden"
                />
                <div className="flex shrink-0 items-center gap-3">
                  <GallerySortControl value={sort} onChange={onSortChange} showOverview />
                  <span className="whitespace-nowrap text-[0.8125rem] tabular-nums text-muted-foreground" aria-live="polite">共 {resultCount.toLocaleString()} 部</span>
                </div>
                <div className="ml-auto flex shrink-0 items-center gap-2">
                  <button type="button" onClick={onOpenList} aria-label="開啟台本一覽表" className={TEXT_BUTTON_SM}>
                    <List className="h-3.5 w-3.5" aria-hidden />一覽表
                  </button>
                  <GalleryViewModeToggle value={viewMode} onChange={onViewModeChange} compact />
                </div>
              </div>
            </div>
            <GalleryFilterSummary chips={chips} onRemove={onRemoveChip} onClear={onClearFilters} />
          </>
        )}
      </div>
      <LazyPublicFeedbackDialog mode="listing" hideTrigger open={submitOpen} onOpenChange={setSubmitOpen} />
    </>
  );
}
