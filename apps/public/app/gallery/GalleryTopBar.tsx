"use client";

import { PublicGalleryTopBar } from "@write/public-ui";
import type { GalleryView } from "@write/public-ui";
import { PublicShellActions } from "@/components/PublicShellActions";

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
      brandName="公開台本"
      brandSubtitle="泛用型產品作坊"
      mobileStudioHref="/dashboard"
      trailing={<PublicShellActions />}
    />
  );
}
