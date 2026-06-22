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
  /** Brand name displayed on the left (main title). */
  brandName?: string;
  /** Subtle subtitle displayed after the brand name. */
  brandSubtitle?: string;
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
  brandSubtitle,
  trailing,
  mobileFilterLabel = "開啟篩選",
}: PublicGalleryTopBarProps): React.JSX.Element {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
      {/* Main row */}
      <div className="flex h-14 items-center px-3 sm:px-5 lg:px-8 w-full">
        {/* Mobile left: filter button (thumb-reach corner, 44px touch target) */}
        <div className="sm:hidden flex items-center justify-start w-11 shrink-0">
          {activeTab === "scripts" && onOpenMobileFilter ? (
            <button
              type="button"
              onClick={onOpenMobileFilter}
              aria-label={mobileFilterLabel}
              className="flex items-center justify-center h-11 w-11 -ml-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          ) : <span className="w-11" aria-hidden />}
        </div>

        {/* Brand — centered on mobile, left-aligned on desktop */}
        <a
          href="/"
          className="flex items-center gap-2 shrink-0 hover:text-primary transition-colors group sm:mr-0 mx-auto sm:mx-0"
          aria-label={brandName}
        >
          <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <svg viewBox="0 0 32 32" fill="none" className="w-4 h-4 text-primary" aria-hidden="true">
              <path d="M18 5 C20 5 22 7 21 10 L19 24 C18.5 26 17 27 15.5 26" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="12" y1="16" x2="21" y2="16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-serif font-black text-foreground text-lg tracking-tight">{brandName}</span>
          {brandSubtitle && (
            <span className="hidden sm:inline text-xs text-muted-foreground/70 font-normal tracking-normal ml-1 self-end mb-0.5">{brandSubtitle}</span>
          )}
        </a>

        {/* Desktop tabs — hidden on mobile (shown in second row below) */}
        <nav className="hidden sm:flex items-center ml-3" aria-label="公開頁面導航">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              aria-current={tab.key === activeTab ? "page" : undefined}
              className={cn(
                "relative h-14 px-4 text-sm transition-colors whitespace-nowrap",
                tab.key === activeTab
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.key === activeTab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
              )}
            </button>
          ))}
        </nav>

        {/* Right side — desktop filter + trailing */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {/* Desktop/tablet filter button (hidden on mobile — moved to left) */}
          {activeTab === "scripts" && onOpenMobileFilter && (
            <button
              type="button"
              onClick={onOpenMobileFilter}
              aria-label={mobileFilterLabel}
              className="hidden sm:flex lg:hidden items-center justify-center h-11 w-11 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>
          )}
          {trailing}
        </div>
      </div>

      {/* Mobile tab row — only on small screens */}
      <div className="sm:hidden border-t border-border/40 overflow-x-auto scrollbar-none">
        <nav className="flex items-end px-3 gap-0 min-w-max" aria-label="公開頁面導航">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              aria-current={tab.key === activeTab ? "page" : undefined}
              className={cn(
                "relative h-9 px-4 text-sm transition-colors whitespace-nowrap",
                tab.key === activeTab
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.label}
              {tab.key === activeTab && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
