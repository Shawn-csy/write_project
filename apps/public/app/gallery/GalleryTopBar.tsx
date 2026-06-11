"use client";

import { PublicGalleryTopBar } from "@write/public-ui";
import type { GalleryView } from "@write/public-ui";

export type { GalleryView };

interface GalleryTopBarProps {
  activeTab: GalleryView;
  onTabChange: (tab: GalleryView) => void;
  onOpenMobileFilter: () => void;
}

export function GalleryTopBar({
  activeTab,
  onTabChange,
  onOpenMobileFilter,
}: GalleryTopBarProps) {
  return (
    <PublicGalleryTopBar
      activeTab={activeTab}
      onTabChange={onTabChange}
      onOpenMobileFilter={onOpenMobileFilter}
      trailing={
        <a
          href="/dashboard"
          className="hidden sm:inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          工作室
        </a>
      }
    />
  );
}
