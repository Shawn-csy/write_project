/**
 * PublicGalleryTopBar — router-neutral public discovery shell topbar.
 * No Next.js, no Vite router, no auth context.
 * Host app provides `onTabChange` (navigation) and `trailing` slot (login/studio/custom actions).
 */
import React from "react";
import { SlidersHorizontal } from "lucide-react";
import type { GalleryView } from "./galleryUrlState";

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
  /** Called when mobile filter button is pressed (visible on scripts tab only). */
  onOpenMobileFilter?: () => void;
  /** Override default tab definitions (e.g. to add help/license/about in Phase 5). */
  tabs?: PublicGalleryTab[];
  /** Brand name displayed on the left. */
  brandName?: string;
  /**
   * Trailing slot — host-specific actions rendered at the right end of the bar.
   * Use for studio link, login button, or any host-specific navigation.
   */
  trailing?: React.ReactNode;
  /** Accessible label for mobile filter button. */
  mobileFilterLabel?: string;
}

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function PublicGalleryTopBar({
  activeTab,
  onTabChange,
  onOpenMobileFilter,
  tabs = DEFAULT_TABS,
  brandName = "Screenplay Reader",
  trailing,
  mobileFilterLabel = "開啟篩選",
}: PublicGalleryTopBarProps): React.JSX.Element {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <span className="font-serif font-bold text-foreground text-base shrink-0">
          {brandName}
        </span>

        <nav className="flex items-center gap-1 ml-2" aria-label="公開頁面導航">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              aria-current={tab.key === activeTab ? "page" : undefined}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors",
                tab.key === activeTab
                  ? "bg-primary text-primary-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Right side: pushes to far right; mobile filter + trailing share this region */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {activeTab === "scripts" && onOpenMobileFilter && (
            <button
              type="button"
              onClick={onOpenMobileFilter}
              aria-label={mobileFilterLabel}
              className="lg:hidden flex items-center gap-1.5 rounded-md border border-border/70 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              篩選
            </button>
          )}
          {trailing}
        </div>
      </div>
    </header>
  );
}
