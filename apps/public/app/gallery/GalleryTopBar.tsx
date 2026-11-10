"use client";

import { PublicTopBar } from "@/components/PublicTopBar";
import type { GalleryView } from "@write/public-ui";

export type { GalleryView };

interface GalleryTopBarProps {
  activeTab: GalleryView;
  /** @deprecated The filter action now lives beside the gallery search field. */
  onOpenMobileFilter?: () => void;
}

export function GalleryTopBar({ activeTab }: GalleryTopBarProps) {
  return <PublicTopBar activeTab={activeTab} />;
}
