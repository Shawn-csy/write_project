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
}

export interface PublicShellTopBarProps {
  activeTab?: string;
  tabs?: PublicShellTab[];
  /** Brand name displayed on the left (main title). */
  brandName?: string;
  /** Subtle subtitle displayed after the brand name. */
  brandSubtitle?: string;
  /** href for the brand logo link. Defaults to "/". */
  brandHref?: string;
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
}

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

function TabItem({ tab, isActive }: { tab: PublicShellTab; isActive: boolean }) {
  const className = cn(
    "relative h-9 px-3.5 text-[0.8125rem] rounded-md transition-all duration-150 whitespace-nowrap",
    isActive
      ? "text-foreground font-semibold bg-muted/60"
      : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-normal"
  );
  const indicator = isActive && (
    <span className="absolute bottom-[5px] left-1/2 -translate-x-1/2 w-4 h-[2px] bg-primary rounded-full" />
  );

  if (tab.href) {
    return (
      <a
        href={tab.href}
        aria-current={isActive ? "page" : undefined}
        className={className}
      >
        {tab.label}
        {indicator}
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
      {indicator}
    </button>
  );
}

function MobileTabItem({ tab, isActive }: { tab: PublicShellTab; isActive: boolean }) {
  const className = cn(
    "relative flex items-center justify-center h-11 px-4 text-[0.8125rem] whitespace-nowrap transition-all duration-150",
    isActive
      ? "text-foreground font-semibold"
      : "text-muted-foreground font-normal"
  );
  const indicator = isActive && (
    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-[2px] bg-primary rounded-full" />
  );

  if (tab.href) {
    return (
      <a href={tab.href} aria-current={isActive ? "page" : undefined} className={className}>
        {tab.label}
        {indicator}
      </a>
    );
  }

  return (
    <button type="button" onClick={tab.onSelect} aria-current={isActive ? "page" : undefined} className={className}>
      {tab.label}
      {indicator}
    </button>
  );
}

export function PublicShellTopBar({
  activeTab,
  tabs = [],
  brandName = "Screenplay Reader",
  brandSubtitle,
  brandHref = "/",
  trailing,
  leadingTrailing,
  mobileLeadingAction,
  mobileTrailingAction,
}: PublicShellTopBarProps): React.JSX.Element {
  const hasTabs = tabs.length > 0;

  return (
    <header
      className="sticky top-0 z-40 bg-background/97 backdrop-blur-xl"
      style={{ borderBottom: "1px solid hsl(var(--border) / 0.6)" }}
    >
      {/* Row 1: brand + actions */}
      <div className="relative flex h-[3.5rem] items-center px-4 sm:px-6 lg:px-8 w-full gap-2">

        {/* Brand — left-aligned */}
        <a
          href={brandHref}
          className="flex items-center gap-2.5 shrink-0 group"
        >
          {/* Ink-stamp logo mark */}
          <div className="relative w-7 h-7 shrink-0">
            <div className="absolute inset-0 rounded-[6px] bg-foreground/90 group-hover:bg-foreground transition-colors duration-200" />
            <svg
              viewBox="0 0 28 28"
              fill="none"
              className="absolute inset-0 w-full h-full p-[5px] text-background"
              aria-hidden="true"
            >
              <path
                d="M16 4.5 C17.5 4.5 19 6 18.5 8.5 L17 21.5 C16.5 23 15.5 24 14 23"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line x1="10" y1="14" x2="18" y2="14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              <line x1="10" y1="18" x2="15" y2="18" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </div>
          <div className="flex flex-col justify-center gap-0">
            <span className="font-serif font-bold text-foreground text-[1.0625rem] leading-none group-hover:text-primary transition-colors duration-200">
              {brandName}
            </span>
            {brandSubtitle && (
              <span className="hidden sm:block text-[10px] text-muted-foreground/50 font-normal leading-none mt-0.5 tracking-[0.03em]">
                {brandSubtitle}
              </span>
            )}
          </div>
        </a>

        {/* Divider + desktop tabs */}
        {hasTabs && (
          <>
            <div className="hidden sm:block w-px h-5 bg-border/60 mx-1 shrink-0" aria-hidden />
            <nav className="hidden sm:flex items-center gap-0.5" aria-label="公開頁面導航">
              {tabs.map((tab) => (
                <TabItem key={tab.key} tab={tab} isActive={tab.key === activeTab} />
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
      {hasTabs && (
        <nav
          className="sm:hidden flex items-center px-2 gap-0.5"
          aria-label="公開頁面導航"
          style={{ borderTop: "1px solid hsl(var(--border) / 0.3)" }}
        >
          {tabs.map((tab) => (
            <MobileTabItem key={tab.key} tab={tab} isActive={tab.key === activeTab} />
          ))}
        </nav>
      )}
    </header>
  );
}
