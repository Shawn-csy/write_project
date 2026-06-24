"use client";

import { X } from "lucide-react";
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
          <p className="text-[0.9375rem] font-semibold text-foreground">篩選與搜尋</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉篩選"
            className="h-11 w-11 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          {/* ViewMode */}
          <div>
            <p className="editorial-dim mb-2 text-[10px] font-semibold uppercase tracking-[0.18em]">
              顯示模式
            </p>
            <GalleryViewModeToggle value={viewModeValue} onChange={setViewMode} />
          </div>

          {/* Filter panel (search, usage, tags) */}
          <GalleryFilterPanel
            {...filterProps}
            usage={usage}
            onUsageChange={setUsage}
            onResetFilters={() => {
              filterProps.onResetFilters();
              onClose();
            }}
          />

          {/* Safe area bottom spacer */}
          <div className="h-4" aria-hidden />
        </div>
      </div>
    </div>
  );
}
