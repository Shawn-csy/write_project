"use client";

import { X } from "lucide-react";
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

        {/* ViewMode — stacked for mobile */}
        <div className="mb-4">
          <p className="mb-1.5 text-xs font-medium text-foreground">顯示模式</p>
          <div className="flex gap-1.5">
            {(["standard", "compact"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`h-7 rounded-full px-3 text-xs transition-colors font-medium ${
                  viewModeValue === mode
                    ? "bg-foreground text-background"
                    : "border border-border/60 bg-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                {mode === "standard" ? "標準" : "密集"}
              </button>
            ))}
          </div>
        </div>

        {/* Filter panel (includes usage, search, tags) */}
        <GalleryFilterPanel
          {...filterProps}
          usage={usage}
          onUsageChange={setUsage}
          onResetFilters={() => {
            filterProps.onResetFilters();
            onClose();
          }}
        />
      </div>
    </div>
  );
}
