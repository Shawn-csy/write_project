"use client";

/**
 * PublicShellTopBar — router-neutral public shell topbar primitive.
 * No Next.js, no Vite router, no auth context, no gallery-specific behavior.
 *
 * Layout:
 *   Row 1 (all viewports): brand + desktop tabs + trailing
 *   Row 2 (mobile only, when tabs exist): inline tab bar
 *
 * Tabs support two navigation modes:
 *   href  → renders <a> (SSR-safe, works on info pages)
 *   onSelect → renders <button> (SPA callback, used by gallery)
 *
 * Host app provides `trailing` slot for desktop actions (studio link, appearance menu, etc.).
 * Mobile actions use `mobileLeadingAction` / `mobileTrailingAction` slots in row 1.
 */
import React from "react";

export interface PublicShellTab {
  key: string;
  label: string;
  /** If provided, renders an <a> element with this href. */
  href?: string;
  /** If provided (and href is absent), renders a <button> with this handler. */
  onSelect?: () => void;
  /** Keep secondary navigation out of the crowded tablet header. */
  hideOnTablet?: boolean;
}

export interface PublicShellTopBarProps {
  activeTab?: string;
  /** Visual treatment for the current tab. Use "none" for global links that stay visually neutral. */
  activeTabStyle?: "pill" | "subtle" | "none";
  tabs?: PublicShellTab[];
  /** Brand name displayed on the left (main title). */
  brandName?: string;
  /** Subtle subtitle displayed after the brand name. */
  brandSubtitle?: string;
  /** href for the brand logo link. Defaults to "/". */
  brandHref?: string;
  /** Optional back control rendered immediately before the brand. */
  brandLeading?: React.ReactNode;
  /**
   * Trailing slot — host-specific actions at the right end of the bar (desktop).
   * Wrap in a stable-width container to prevent hydration shift.
   */
  trailing?: React.ReactNode;
  /** Optional extra content inserted to the right of tabs (desktop). */
  leadingTrailing?: React.ReactNode;
  /** Mobile row 1 — leading action slot (left side, next to brand). Typically filter button. */
  mobileLeadingAction?: React.ReactNode;
  /** Mobile row 1 — trailing action slot (right side). Typically "more" button. */
  mobileTrailingAction?: React.ReactNode;
  /** Compact mobile tab switcher rendered in row 1 instead of a second tab row. */
  mobileTabSwitcher?: React.ReactNode;
  /** Optional shared mobile navigation row, rendered below row 1. */
  mobileNav?: React.ReactNode;
  /** Host router link renderer; defaults to a native anchor. */
  renderLink?: (props: { href: string; className: string; ariaCurrent?: "page"; children: React.ReactNode }) => React.ReactNode;
}

/**
 * The bar is a solid brand-colour band. Re-pointing the colour variables here lets every
 * action dropped into its slots (which style themselves with text-muted-foreground,
 * hover:bg-muted…) read correctly on the dark band without knowing about it.
 */
const BAND_STYLE = {
  "--background": "var(--band)",
  "--foreground": "0 0% 100%",
  "--muted-foreground": "var(--band-muted-foreground)",
  "--muted": "var(--band-muted)",
  "--border": "var(--band-border)",
  borderBottom: "1px solid hsl(var(--border))",
} as React.CSSProperties;

type LinkRenderer = NonNullable<PublicShellTopBarProps["renderLink"]>;

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

function TabItem({ tab, isActive, activeTabStyle, renderLink }: { tab: PublicShellTab; isActive: boolean; activeTabStyle: "pill" | "subtle" | "none"; renderLink?: LinkRenderer }) {
  const className = cn(
    "relative flex h-full items-center justify-center px-3 text-[0.875rem] whitespace-nowrap transition-colors duration-100",
    tab.hideOnTablet && "hidden lg:inline-flex",
    isActive && activeTabStyle === "pill"
      ? "bg-foreground text-background font-semibold"
      : isActive && activeTabStyle === "subtle"
        ? "text-foreground font-bold after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:bg-foreground"
        : "text-muted-foreground hover:text-foreground hover:bg-muted font-normal"
  );

  if (tab.href) {
    if (renderLink) return renderLink({ href: tab.href, className, ariaCurrent: isActive ? "page" : undefined, children: tab.label });
    return (
      <a
        href={tab.href}
        aria-current={isActive ? "page" : undefined}
        className={className}
      >
        {tab.label}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={tab.onSelect}
      aria-current={isActive ? "page" : undefined}
      className={className}
    >
      {tab.label}
    </button>
  );
}

function MobileTabItem({ tab, isActive, activeTabStyle, renderLink }: { tab: PublicShellTab; isActive: boolean; activeTabStyle: "pill" | "subtle" | "none"; renderLink?: LinkRenderer }) {
  const className = cn(
    "relative flex h-10 items-center justify-center px-3 text-[0.875rem] whitespace-nowrap transition-colors duration-100",
    isActive && activeTabStyle === "pill"
      ? "bg-foreground text-background font-semibold"
      : isActive && activeTabStyle === "subtle"
        ? "text-foreground font-bold after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:bg-foreground"
        : "text-muted-foreground font-normal"
  );

  if (tab.href) {
    if (renderLink) return renderLink({ href: tab.href, className, ariaCurrent: isActive ? "page" : undefined, children: tab.label });
    return (
      <a href={tab.href} aria-current={isActive ? "page" : undefined} className={className}>
        {tab.label}
      </a>
    );
  }

  return (
    <button type="button" onClick={tab.onSelect} aria-current={isActive ? "page" : undefined} className={className}>
      {tab.label}
    </button>
  );
}

export function PublicShellTopBar({
  activeTab,
  activeTabStyle = "pill",
  tabs = [],
  brandName = "Screenplay Reader",
  brandSubtitle,
  brandHref = "/",
  brandLeading,
  trailing,
  leadingTrailing,
  mobileLeadingAction,
  mobileTrailingAction,
  mobileTabSwitcher,
  mobileNav,
  renderLink,
}: PublicShellTopBarProps): React.JSX.Element {
  const hasTabs = tabs.length > 0;
  const brandContent = <>
    <div className="relative w-7 h-7 shrink-0">
      <div className="absolute inset-0 rounded-[3px] bg-foreground" />
      <svg viewBox="0 0 28 28" fill="none" className="absolute inset-0 w-full h-full p-[5px] text-background" aria-hidden="true">
        <path d="M16 4.5 C17.5 4.5 19 6 18.5 8.5 L17 21.5 C16.5 23 15.5 24 14 23" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="10" y1="14" x2="18" y2="14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <line x1="10" y1="18" x2="15" y2="18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
    <div className="flex flex-col justify-center gap-0">
      <span className="font-bold text-foreground text-[1.0625rem] leading-none">{brandName}</span>
      {brandSubtitle && <span className="hidden sm:block text-[0.6875rem] text-muted-foreground font-normal leading-none mt-1">{brandSubtitle}</span>}
    </div>
  </>;

  return (
    <header
      className="sticky top-0 z-40 bg-background text-foreground"
      style={BAND_STYLE}
    >
      {/* Row 1: brand + actions */}
      <div className="relative flex h-11 items-center px-4 sm:h-[3.5rem] sm:px-6 lg:px-8 w-full gap-2">

        {/* Brand — left-aligned */}
        {brandLeading}
        {renderLink
          ? renderLink({ href: brandHref, className: "flex items-center gap-2.5 shrink-0 group", children: brandContent })
          : <a href={brandHref} className="flex items-center gap-2.5 shrink-0 group">{brandContent}</a>}

        {/* Divider + desktop tabs */}
        {hasTabs && (
          <>
            <div className="hidden sm:block w-px h-5 bg-border mx-2 shrink-0" aria-hidden />
            <nav className="hidden sm:flex h-full items-stretch" aria-label="公開頁面導航">
              {tabs.map((tab) => (
                <TabItem key={tab.key} tab={tab} isActive={tab.key === activeTab} activeTabStyle={activeTabStyle} renderLink={renderLink} />
              ))}
            </nav>
          </>
        )}

        {leadingTrailing}

        {/* Mobile leading action (e.g. filter button) — between brand and trailing on mobile */}
        {mobileLeadingAction && (
          <div className="sm:hidden ml-auto flex items-center shrink-0">
            {mobileLeadingAction}
          </div>
        )}

        {mobileTabSwitcher && (
          <div className="sm:hidden flex items-center shrink-0">
            {mobileTabSwitcher}
          </div>
        )}

        {/* Mobile trailing action (e.g. more button) */}
        {mobileTrailingAction && (
          <div className={cn("sm:hidden flex items-center shrink-0", !mobileLeadingAction && "ml-auto")}>
            {mobileTrailingAction}
          </div>
        )}

        {/* Desktop trailing slot */}
        <div className={cn("hidden sm:flex ml-auto items-center gap-1 shrink-0")}>
          {trailing}
        </div>
      </div>

      {/* Row 2: mobile inline tabs */}
      {mobileNav ? (
        <div className="sm:hidden overflow-x-auto" style={{ borderTop: "1px solid hsl(var(--border))" }}>
          {mobileNav}
        </div>
      ) : hasTabs && !mobileTabSwitcher && (
        <nav
          className="sm:hidden flex items-center px-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="公開頁面導航"
          style={{ borderTop: "1px solid hsl(var(--border))" }}
        >
          {tabs.map((tab) => (
            <MobileTabItem key={tab.key} tab={tab} isActive={tab.key === activeTab} activeTabStyle={activeTabStyle} renderLink={renderLink} />
          ))}
        </nav>
      )}
    </header>
  );
}
