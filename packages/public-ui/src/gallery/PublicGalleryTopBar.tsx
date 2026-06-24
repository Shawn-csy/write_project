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
    <header className="sticky top-0 z-40 bg-background/97 backdrop-blur-xl" style={{ borderBottom: "1px solid hsl(var(--border) / 0.6)" }}>
      {/* Main row */}
      <div className="flex h-[3.5rem] items-center px-4 sm:px-6 lg:px-8 w-full gap-2">
        {/* Mobile: filter button */}
        <div className="sm:hidden flex items-center w-10 shrink-0">
          {activeTab === "scripts" && onOpenMobileFilter ? (
            <button
              type="button"
              onClick={onOpenMobileFilter}
              aria-label={mobileFilterLabel}
              className="flex items-center justify-center h-9 w-9 -ml-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-150"
            >
              <SlidersHorizontal className="h-[15px] w-[15px]" />
            </button>
          ) : <span className="w-10" aria-hidden />}
        </div>

        {/* Brand */}
        <a
          href="/"
          className="flex items-center gap-2.5 shrink-0 group sm:mr-0 mx-auto sm:mx-0"
          aria-label={brandName}
        >
          {/* Ink-stamp logo mark */}
          <div className="relative w-7 h-7 shrink-0">
            <div className="absolute inset-0 rounded-[6px] bg-foreground/90 group-hover:bg-foreground transition-colors duration-200" />
            <svg viewBox="0 0 28 28" fill="none" className="absolute inset-0 w-full h-full p-[5px] text-background" aria-hidden="true">
              <path d="M16 4.5 C17.5 4.5 19 6 18.5 8.5 L17 21.5 C16.5 23 15.5 24 14 23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="10" y1="14" x2="18" y2="14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="10" y1="18" x2="15" y2="18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex flex-col justify-center gap-0">
            <span className="font-serif font-bold text-foreground text-[1.0625rem] leading-none tracking-[-0.01em] group-hover:text-primary transition-colors duration-200">{brandName}</span>
            {brandSubtitle && (
              <span className="hidden sm:block text-[10px] text-muted-foreground/50 font-normal leading-none mt-0.5 tracking-[0.03em]">{brandSubtitle}</span>
            )}
          </div>
        </a>

        {/* Divider */}
        <div className="hidden sm:block w-px h-5 bg-border/60 mx-1 shrink-0" aria-hidden />

        {/* Desktop tabs */}
        <nav className="hidden sm:flex items-center gap-0.5" aria-label="公開頁面導航">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              aria-current={tab.key === activeTab ? "page" : undefined}
              className={cn(
                "relative h-9 px-3.5 text-[0.8125rem] rounded-md transition-all duration-150 whitespace-nowrap",
                tab.key === activeTab
                  ? "text-foreground font-semibold bg-muted/60"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-normal"
              )}
            >
              {tab.label}
              {tab.key === activeTab && (
                <span className="absolute bottom-[5px] left-1/2 -translate-x-1/2 w-4 h-[2px] bg-primary rounded-full" />
              )}
            </button>
          ))}
        </nav>

        {/* Right */}
        <div className="ml-auto flex items-center gap-1.5 shrink-0">
          {activeTab === "scripts" && onOpenMobileFilter && (
            <button
              type="button"
              onClick={onOpenMobileFilter}
              aria-label={mobileFilterLabel}
              className="hidden sm:flex lg:hidden items-center justify-center h-9 w-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all duration-150"
            >
              <SlidersHorizontal className="h-[15px] w-[15px]" />
            </button>
          )}
          {trailing}
        </div>
      </div>

      {/* Mobile tab row */}
      <div className="sm:hidden overflow-x-auto scrollbar-none" style={{ borderTop: "1px solid hsl(var(--border) / 0.4)" }}>
        <nav className="flex items-center px-4 gap-0.5 min-w-max h-10" aria-label="公開頁面導航">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onTabChange(tab.key)}
              aria-current={tab.key === activeTab ? "page" : undefined}
              className={cn(
                "relative h-8 px-3 text-[0.8125rem] rounded-md transition-all duration-150 whitespace-nowrap",
                tab.key === activeTab
                  ? "text-foreground font-semibold bg-muted/60"
                  : "text-muted-foreground hover:text-foreground font-normal"
              )}
            >
              {tab.label}
              {tab.key === activeTab && (
                <span className="absolute bottom-[4px] left-1/2 -translate-x-1/2 w-3 h-[2px] bg-primary rounded-full" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
