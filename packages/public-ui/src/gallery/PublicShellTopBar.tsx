"use client";

/**
 * PublicShellTopBar — router-neutral public shell topbar primitive.
 * No Next.js, no Vite router, no auth context, no gallery-specific behavior.
 *
 * Tabs support two navigation modes:
 *   href  → renders <a> (SSR-safe, works on info pages)
 *   onSelect → renders <button> (SPA callback, used by gallery)
 *
 * Host app provides `trailing` slot for studio link, appearance menu, etc.
 * Host app provides `brandHref` for the brand link (defaults to "/").
 *
 * Mobile nav uses a portal overlay (role="dialog") — does not push page layout.
 * Pass `mobileStudioHref` to include a studio entry link inside the overlay.
 */
import React, { useState, useEffect, useRef } from "react";
import ReactDOM from "react-dom";
import { Menu, X } from "lucide-react";

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
   * Trailing slot — host-specific actions at the right end of the bar.
   * Wrap in a stable-width container to prevent hydration shift.
   */
  trailing?: React.ReactNode;
  /** Optional extra content inserted to the right of tabs (desktop). */
  leadingTrailing?: React.ReactNode;
  /** Accessible label for the mobile nav toggle. */
  mobileNavLabel?: string;
  /**
   * If provided, a "進入工作室" link is shown inside the mobile nav overlay.
   * Pass "/dashboard". Not shown on desktop (StudioLink in trailing handles desktop).
   */
  mobileStudioHref?: string;
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

function MobileTabItem({
  tab,
  isActive,
  onAfterSelect,
}: {
  tab: PublicShellTab;
  isActive: boolean;
  onAfterSelect: () => void;
}) {
  const className = cn(
    "flex items-center h-11 px-3 text-[0.9rem] rounded-lg transition-all duration-150 text-left w-full",
    isActive
      ? "text-foreground font-semibold bg-muted/60"
      : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-normal"
  );
  const dot = isActive && (
    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shrink-0" aria-hidden />
  );

  if (tab.href) {
    return (
      <a
        href={tab.href}
        aria-current={isActive ? "page" : undefined}
        className={className}
        onClick={onAfterSelect}
      >
        {tab.label}
        {dot}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={() => { tab.onSelect?.(); onAfterSelect(); }}
      aria-current={isActive ? "page" : undefined}
      className={className}
    >
      {tab.label}
      {dot}
    </button>
  );
}

function MobileNavOverlay({
  tabs,
  activeTab,
  mobileStudioHref,
  triggerRef,
  onClose,
}: {
  tabs: PublicShellTab[];
  activeTab?: string;
  mobileStudioHref?: string;
  triggerRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}) {
  // Esc closes; focus trap keeps Tab inside overlay
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (e.key !== "Tab") return;
      const overlay = document.getElementById("mobile-nav-overlay");
      if (!overlay) return;
      const focusable = Array.from(
        overlay.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])'
        )
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", onKeyDown);

    // Move focus to first focusable item; cancel rAF on cleanup
    const rafId = requestAnimationFrame(() => {
      const overlay = document.getElementById("mobile-nav-overlay");
      const first = overlay?.querySelector<HTMLElement>(
        'a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])'
      );
      first?.focus();
    });

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      cancelAnimationFrame(rafId);
      // Restore focus to trigger button
      triggerRef.current?.focus();
    };
  }, [onClose, triggerRef]);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close when resized to desktop (sm breakpoint = 640px)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 640px)");
    if (mq.matches) { onClose(); return; }
    const handler = (e: MediaQueryListEvent) => { if (e.matches) onClose(); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [onClose]);

  const content = (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm"
        aria-hidden
        onClick={onClose}
      />
      {/* Panel */}
      <div
        id="mobile-nav-overlay"
        role="dialog"
        aria-modal="true"
        aria-label="導航選單"
        className="fixed inset-x-0 top-0 z-50 bg-background"
        style={{ borderBottom: "1px solid hsl(var(--border) / 0.5)" }}
      >
        {/* Header row */}
        <div className="flex h-[3.5rem] items-center px-4 gap-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="關閉導航"
            className="flex items-center justify-center h-11 w-11 -ml-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-150"
          >
            <X className="h-[15px] w-[15px]" />
          </button>
        </div>
        {/* Nav items */}
        <nav
          className="flex flex-col px-2 pb-3 gap-0.5"
          aria-label="公開頁面導航"
          style={{ borderTop: "1px solid hsl(var(--border) / 0.4)" }}
        >
          {tabs.map((tab) => (
            <MobileTabItem
              key={tab.key}
              tab={tab}
              isActive={tab.key === activeTab}
              onAfterSelect={onClose}
            />
          ))}
        </nav>
        {/* Studio entry */}
        {mobileStudioHref && (
          <div className="px-3 pb-4 pt-1" style={{ borderTop: "1px solid hsl(var(--border) / 0.3)" }}>
            <a
              href={mobileStudioHref}
              className="flex items-center justify-center h-11 w-full rounded-lg text-[0.9rem] font-semibold text-primary-foreground transition-all duration-150 hover:opacity-90"
              style={{
                background: "hsl(var(--primary))",
                boxShadow: "0 1px 3px hsl(var(--primary)/0.3), inset 0 0.5px 0 hsl(0 0% 100% / 0.15)",
              }}
            >
              進入工作室
            </a>
          </div>
        )}
      </div>
    </>
  );

  if (typeof document === "undefined") return null;
  return ReactDOM.createPortal(content, document.body);
}

export function PublicShellTopBar({
  activeTab,
  tabs = [],
  brandName = "Screenplay Reader",
  brandSubtitle,
  brandHref = "/",
  trailing,
  leadingTrailing,
  mobileNavLabel,
  mobileStudioHref,
}: PublicShellTopBarProps): React.JSX.Element {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const hasTabs = tabs.length > 0;
  const hamburgerRef = useRef<HTMLButtonElement>(null);

  return (
    <header
      className="sticky top-0 z-40 bg-background/97 backdrop-blur-xl"
      style={{ borderBottom: "1px solid hsl(var(--border) / 0.6)" }}
    >
      {/* Main row */}
      <div className="relative flex h-[3.5rem] items-center px-4 sm:px-6 lg:px-8 w-full gap-2">

        {/* Mobile: hamburger (only when tabs exist) */}
        {hasTabs && (
          <div className="sm:hidden flex items-center w-10 shrink-0">
            <button
              ref={hamburgerRef}
              type="button"
              onClick={() => setMobileNavOpen((v) => !v)}
              aria-label={
                mobileNavLabel ?? (mobileNavOpen ? "關閉選單" : "開啟導航")
              }
              aria-expanded={mobileNavOpen}
              aria-controls="mobile-nav-overlay"
              className="flex items-center justify-center h-11 w-11 -ml-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-all duration-150"
            >
              {mobileNavOpen
                ? <X className="h-[15px] w-[15px]" />
                : <Menu className="h-[15px] w-[15px]" />}
            </button>
          </div>
        )}

        {/* Brand — centred on mobile (with tabs), left-aligned otherwise */}
        <a
          href={brandHref}
          className={cn(
            "flex items-center gap-2.5 shrink-0 group",
            hasTabs
              ? "absolute left-1/2 -translate-x-1/2 sm:static sm:translate-x-0"
              : ""
          )}
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

        {/* Right: trailing slot */}
        <div className="ml-auto flex items-center gap-1 shrink-0">
          {trailing}
        </div>
      </div>

      {/* Mobile nav — portal overlay (does not push layout) */}
      {hasTabs && mobileNavOpen && (
        <MobileNavOverlay
          tabs={tabs}
          activeTab={activeTab}
          mobileStudioHref={mobileStudioHref}
          triggerRef={hamburgerRef}
          onClose={() => setMobileNavOpen(false)}
        />
      )}
    </header>
  );
}
