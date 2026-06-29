/**
 * PublicGalleryTopBar — router-neutral public discovery shell topbar.
 * Wraps PublicShellTopBar and adds gallery-specific behavior:
 *   - SPA onTabChange callback (no hrefs)
 *   - Mobile filter/search button (scripts tab only)
 */
import React from "react";
import { Search } from "lucide-react";
import type { GalleryView } from "./galleryUrlState";
import { PublicShellTopBar } from "./PublicShellTopBar";
import type { PublicShellTab } from "./PublicShellTopBar";

export type { GalleryView };

export interface PublicGalleryTab {
  key: GalleryView;
  label: string;
}

export const DEFAULT_TABS: PublicGalleryTab[] = [
  { key: "scripts", label: "台本" },
  { key: "authors", label: "作者" },
  { key: "orgs", label: "組織" },
];

export interface PublicGalleryTopBarProps {
  activeTab: GalleryView;
  onTabChange: (tab: GalleryView) => void;
  /** Called when mobile filter/search button is pressed (visible on scripts tab only). */
  onOpenMobileFilter?: () => void;
  /** Override default tab definitions. */
  tabs?: PublicGalleryTab[];
  /** Brand name displayed on the left (main title). */
  brandName?: string;
  /** Subtle subtitle displayed after the brand name. */
  brandSubtitle?: string;
  /**
   * Trailing slot — host-specific actions rendered at the right end of the bar.
   * Use for studio link, login button, appearance menu, etc.
   */
  trailing?: React.ReactNode;
  /** Accessible label for mobile filter button. */
  mobileFilterLabel?: string;
}

export function PublicGalleryTopBar({
  activeTab,
  onTabChange,
  onOpenMobileFilter,
  tabs = DEFAULT_TABS,
  brandName = "Screenplay Reader",
  brandSubtitle,
  trailing,
  mobileFilterLabel = "開啟篩選",
}: PublicGalleryTopBarProps): React.JSX.Element {
  const shellTabs: PublicShellTab[] = tabs.map((t) => ({
    key: t.key,
    label: t.label,
    onSelect: () => onTabChange(t.key),
  }));

  const filterButtons = activeTab === "scripts" && onOpenMobileFilter ? (
    <>
      {/* Mobile filter button */}
      <button
        type="button"
        onClick={onOpenMobileFilter}
        aria-label={mobileFilterLabel}
        className="sm:hidden flex items-center justify-center h-11 w-11 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-150"
      >
        <Search className="h-[15px] w-[15px]" />
      </button>
      {/* Tablet filter button */}
      <button
        type="button"
        onClick={onOpenMobileFilter}
        aria-label={mobileFilterLabel}
        className="hidden sm:flex lg:hidden items-center justify-center h-11 w-11 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150"
      >
        <Search className="h-[15px] w-[15px]" />
      </button>
    </>
  ) : null;

  return (
    <PublicShellTopBar
      activeTab={activeTab}
      tabs={shellTabs}
      brandName={brandName}
      brandSubtitle={brandSubtitle}
      trailing={
        <>
          {filterButtons}
          {trailing}
        </>
      }
    />
  );
}
