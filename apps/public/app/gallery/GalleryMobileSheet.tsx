"use client";

import { X } from "lucide-react";
import { GalleryControlsBar } from "./GalleryControlsBar";
import { GalleryFilterPanel } from "./GalleryFilterPanel";

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
  /** Usage + viewMode shown here on mobile since inline bar hides them */
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
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 rounded-t-2xl bg-background px-4 pt-4 pb-8 max-h-[80vh] overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold">篩選與搜尋</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉篩選"
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-muted"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Usage + ViewMode — shown here on mobile (hidden in inline bar) */}
        <div className="mb-4">
          <GalleryControlsBar
            usage={usage}
            onUsageChange={setUsage}
            viewMode={viewModeValue}
            onViewModeChange={setViewMode}
            layout="stacked"
          />
        </div>

        <GalleryFilterPanel
          {...filterProps}
          onResetFilters={() => {
            filterProps.onResetFilters();
            onClose();
          }}
        />
      </div>
    </div>
  );
}
