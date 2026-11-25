"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import * as Dropdown from "@radix-ui/react-dropdown-menu";
import { Check, Funnel, List, MoreHorizontal, Plus } from "lucide-react";
import type { GalleryViewMode } from "@write/public-ui";
import { LazyPublicFeedbackDialog } from "@/components/LazyPublicFeedbackDialog";
import { PublicFeedbackTrigger } from "@/components/PublicFeedbackTrigger";
import { GallerySegmentBar } from "./GallerySegmentBar";
import { PublicMorphDropdown } from "@/components/PublicMorphDropdown";
import { PublicExpandableSearch } from "@/components/PublicExpandableSearch";
import { PublicScriptSubmissionTrigger } from "@/components/PublicScriptSubmissionTrigger";
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
  "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground";
const TEXT_BUTTON =
  "relative inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md px-2 text-[0.8125rem] leading-5 text-foreground/80 hover:bg-muted hover:text-foreground";

const ICON_BUTTON_SM = ICON_BUTTON;
const MOBILE_SORT_OPTIONS = [{ value: "overview" as const, label: GALLERY_OVERVIEW_LABEL }, ...GALLERY_SORT_OPTIONS];
const MOBILE_SORT_GROUPS = [{ options: MOBILE_SORT_OPTIONS }];

function SortSelect({ value, onChange }: { value: GallerySortValue | null; onChange: (value: GallerySortValue | null) => void }) {
  return (
    <PublicMorphDropdown
      label="排序"
      value={value ?? "overview"}
      groups={MOBILE_SORT_GROUPS}
      onChange={(next) => onChange(next === "overview" ? null : next)}
      className="w-14 sm:w-[4.25rem]"
    />
  );
}

function GalleryViewActions({ viewMode, onViewModeChange, onOpenList, filter, phone = false }: Pick<GalleryToolbarProps, "viewMode" | "onViewModeChange" | "onOpenList"> & { filter?: ReactNode; phone?: boolean }) {
  return (
    <div className="ml-auto flex shrink-0 items-center gap-1" data-testid="gallery-view-actions">
      {filter}
      <button type="button" onClick={onOpenList} aria-label="開啟台本一覽表" title="一覽表" className={`${TEXT_BUTTON} ${phone ? "min-w-11 justify-center" : ""}`}>
        <List className={`h-3.5 w-3.5 ${phone ? "min-[360px]:hidden" : "hidden md:block"}`} aria-hidden />
        <span className={phone ? "hidden min-[360px]:inline" : undefined}>一覽表</span>
      </button>
      <GalleryViewModeToggle value={viewMode} onChange={onViewModeChange} compact />
    </div>
  );
}

function GalleryPhoneActions({ sort, onSortChange, onOpenFilterSheet, onOpenSubmission }: Pick<GalleryToolbarProps, "sort" | "onSortChange" | "onOpenFilterSheet"> & { onOpenSubmission: () => void }) {
  const trigger = useRef<HTMLButtonElement>(null);
  const afterClose = useRef<(() => void) | null>(null);
  const itemClass = "gallery-morph-option flex min-h-11 items-center justify-between gap-3 rounded px-3 text-sm outline-none data-[highlighted]:bg-muted";

  return (
    <Dropdown.Root modal={false}>
      <Dropdown.Trigger ref={trigger} className={ICON_BUTTON} aria-label="更多操作" title="更多操作">
        <MoreHorizontal className="h-4 w-4" aria-hidden />
      </Dropdown.Trigger>
      <Dropdown.Portal>
        <Dropdown.Content align="end" sideOffset={4} collisionPadding={8} className="gallery-morph-menu w-44 rounded-lg border border-border bg-card p-1 text-foreground shadow-lg"
          onCloseAutoFocus={(event) => {
            const action = afterClose.current;
            if (!action) return;
            afterClose.current = null;
            event.preventDefault();
            trigger.current?.focus({ preventScroll: true });
            action();
          }}>
          <Dropdown.Label className="px-3 py-1 text-xs text-muted-foreground">排序</Dropdown.Label>
          <Dropdown.RadioGroup aria-label="排序" value={sort ?? "overview"}>
            {MOBILE_SORT_OPTIONS.map((option) => (
              <Dropdown.RadioItem key={option.value} value={option.value} className={itemClass} onSelect={() => onSortChange(option.value === "overview" ? null : option.value)}>
                {option.label}<Dropdown.ItemIndicator><Check className="h-3.5 w-3.5" aria-hidden /></Dropdown.ItemIndicator>
              </Dropdown.RadioItem>
            ))}
          </Dropdown.RadioGroup>
          <Dropdown.Separator className="my-1 border-t border-border" />
          <Dropdown.Item className={itemClass} onSelect={() => { afterClose.current = onOpenFilterSheet; }}>
            進階篩選 <Funnel className="h-4 w-4" aria-hidden />
          </Dropdown.Item>
          <Dropdown.Item className={itemClass} onSelect={() => { afterClose.current = onOpenSubmission; }}>
            投稿台本 <Plus className="h-4 w-4" aria-hidden />
          </Dropdown.Item>
        </Dropdown.Content>
      </Dropdown.Portal>
    </Dropdown.Root>
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

  const compact = stuck;
  const filterCount = chips.length;
  const viewActionProps = { viewMode, onViewModeChange, onOpenList };
  const sidebarTrigger = sidebarCollapsed && (
    <button type="button" onClick={onExpandSidebar} id="homepage-filter-open" aria-label="展開篩選欄" aria-controls="homepage-filter-sidebar" aria-expanded={false} className={`${ICON_BUTTON} hidden lg:inline-flex`}>
      <Funnel className="h-4 w-4" aria-hidden />
    </button>
  );
  const mobileFilterTrigger = (
    <button type="button" aria-label="開啟篩選" aria-haspopup="dialog" className={compact ? `${ICON_BUTTON} hidden min-[360px]:inline-flex lg:hidden` : `${TEXT_BUTTON} lg:hidden`} onClick={onOpenFilterSheet}>
      <Funnel className="h-4 w-4" aria-hidden />
      {!compact && <span>篩選</span>}
      <CountBadge count={filterCount} floating />
    </button>
  );

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
        className={`gallery-toolbar sticky top-[86px] z-30 -mx-4 mb-5 bg-background px-4 sm:-mx-6 sm:top-[57px] sm:px-6 lg:mx-0 lg:px-0 ${
          compact ? "border-b border-border" : ""
        }`}
      >
        <div className={compact
          ? "gallery-compact-toolbar flex h-12 min-w-0 items-center gap-1 sm:gap-2"
          : "gallery-standard-toolbar flex items-center gap-x-1 gap-y-1 border-b border-border py-1 sm:flex-wrap sm:gap-x-2"}
        >
          <PublicExpandableSearch
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="搜尋台本、作者或標籤"
            applyOnSubmit
            className="shrink-0"
          />
          <div className="gallery-phone-toolbar-controls flex min-w-0 flex-1 items-center gap-1 sm:hidden">
            <div className="min-w-0 flex-1">
              <GallerySegmentBar segment={segment} onSegmentChange={onSegmentChange} demoOnly={demoOnly} onDemoOnlyChange={onDemoOnlyChange} fit />
            </div>
            <GalleryPhoneActions sort={sort} onSortChange={onSortChange} onOpenFilterSheet={onOpenFilterSheet} onOpenSubmission={() => setSubmitOpen(true)} />
            <GalleryViewActions {...viewActionProps} phone />
          </div>
          {compact ? (
            <div className="gallery-compact-controls hidden min-w-0 flex-1 items-center gap-2 sm:flex">
              <div className="hidden shrink-0 sm:flex">
                <GallerySegmentBar segment={segment} onSegmentChange={onSegmentChange} demoOnly={demoOnly} onDemoOnlyChange={onDemoOnlyChange} />
              </div>
              <div className="xl:hidden"><SortSelect value={sort} onChange={onSortChange} /></div>
              <GallerySortControl value={sort} onChange={onSortChange} showOverview className="hidden shrink-0 xl:inline-flex" />
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
                  <div id="gallery-toolbar-actions" role="group" aria-label="更多操作" className="public-toolbar-reveal absolute right-0 top-full z-50 mt-1 w-44 rounded-md border border-border bg-card p-1 shadow-lg">
                    <button type="button" onClick={() => { setActionsOpen(false); onOpenFilterSheet(); }} className="flex h-10 w-full items-center gap-2 rounded-md px-3 text-left [font-size:var(--public-font-meta)] text-foreground hover:bg-muted min-[360px]:hidden lg:flex">
                      <Funnel className="h-4 w-4" aria-hidden />搜尋與篩選
                    </button>
                    <PublicScriptSubmissionTrigger className="w-full" onClick={() => { setActionsOpen(false); setSubmitOpen(true); }} />
                  </div>
                )}
              </div>
              <GalleryViewActions {...viewActionProps} filter={<>{mobileFilterTrigger}{sidebarTrigger}</>} />
            </div>
          ) : (
            <>
              <div className="hidden max-w-full flex-wrap items-center gap-1 sm:flex md:gap-2">
                <GallerySegmentBar segment={segment} onSegmentChange={onSegmentChange} demoOnly={demoOnly} onDemoOnlyChange={onDemoOnlyChange} />
                <div className="md:hidden">
                  <SortSelect value={sort} onChange={onSortChange} />
                </div>
                <div className="hidden border-s border-border ps-2 md:flex">
                  <GallerySortControl value={sort} onChange={onSortChange} showOverview />
                </div>
              </div>
              <div className="ms-auto hidden max-w-full flex-wrap items-center justify-end gap-1 sm:flex">
                <PublicFeedbackTrigger mode="listing" onClick={() => setSubmitOpen(true)} />
                {mobileFilterTrigger}
                {sidebarTrigger}
                <div className="md:ms-1 md:border-s md:border-border md:ps-2">
                  <GalleryViewActions {...viewActionProps} />
                </div>
              </div>
            </>
          )}
        </div>
        {!compact && <GalleryFilterSummary chips={chips} onRemove={onRemoveChip} onClear={onClearFilters} />}
      </div>
      <LazyPublicFeedbackDialog mode="listing" hideTrigger open={submitOpen} onOpenChange={setSubmitOpen} />
    </>
  );
}
