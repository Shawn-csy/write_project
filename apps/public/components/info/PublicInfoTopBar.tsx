/**
 * PublicInfoTopBar — server-only top navigation for info/static pages.
 * No "use client". No hooks. No state. Pure <a> navigation.
 * CSS-only responsive: desktop tabs inline, mobile tabs in a scrollable row.
 * No hamburger drawer — static pages don't need it.
 */

import { SITE_BRAND_NAME } from "@/lib/seo";

const INFO_TABS = [
  { key: "about", label: "關於", href: "/about" },
  { key: "help", label: "說明", href: "/help" },
  { key: "license", label: "授權", href: "/license" },
] as const;

type InfoTabKey = (typeof INFO_TABS)[number]["key"];

interface Props {
  activeKey?: InfoTabKey;
}

export function PublicInfoTopBar({ activeKey }: Props) {
  return (
    <header
      className="sticky top-0 z-40 bg-background/97 backdrop-blur-xl"
      style={{ borderBottom: "1px solid hsl(var(--border) / 0.6)" }}
    >
      {/* Main row */}
      <div className="relative flex h-[3.5rem] items-center px-4 sm:px-6 lg:px-8 w-full gap-2">
        {/* Brand */}
        <a
          href="/"
          className="flex items-center gap-2.5 shrink-0 group"
        >
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
          <span className="font-serif font-bold text-foreground text-[1.0625rem] leading-none group-hover:text-primary transition-colors duration-200">
            {SITE_BRAND_NAME}
          </span>
        </a>

        {/* Divider + desktop tabs */}
        <div className="hidden sm:block w-px h-5 bg-border/60 mx-1 shrink-0" aria-hidden="true" />
        <nav className="hidden sm:flex items-center gap-0.5" aria-label="說明頁面導航">
          {INFO_TABS.map((tab) => {
            const isActive = tab.key === activeKey;
            return (
              <a
                key={tab.key}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "relative h-9 px-3.5 text-[0.8125rem] rounded-md transition-all duration-150 whitespace-nowrap inline-flex items-center",
                  isActive
                    ? "text-foreground font-semibold bg-muted/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-normal",
                ].join(" ")}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-[5px] left-1/2 -translate-x-1/2 w-4 h-[2px] bg-primary rounded-full" />
                )}
              </a>
            );
          })}
        </nav>

        {/* Right: studio link */}
        <div className="ml-auto flex items-center gap-1 shrink-0">
          <a
            href="/dashboard"
            className="hidden sm:inline-flex items-center rounded-lg px-3 py-1.5 text-[0.8125rem] font-semibold text-primary-foreground bg-primary hover:opacity-90 transition-opacity duration-150"
          >
            進入工作室
          </a>
        </div>
      </div>

      {/* Mobile tab row — CSS-only, always visible on small screens */}
      <div
        className="sm:hidden overflow-x-auto"
        style={{ borderTop: "1px solid hsl(var(--border) / 0.4)" }}
      >
        <nav className="flex items-center gap-0.5 px-3 py-1.5" aria-label="說明頁面導航">
          {INFO_TABS.map((tab) => {
            const isActive = tab.key === activeKey;
            return (
              <a
                key={tab.key}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={[
                  "relative h-9 px-3.5 text-[0.8125rem] rounded-md transition-all duration-150 whitespace-nowrap inline-flex items-center",
                  isActive
                    ? "text-foreground font-semibold bg-muted/60"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/40 font-normal",
                ].join(" ")}
              >
                {tab.label}
                {isActive && (
                  <span className="absolute bottom-[5px] left-1/2 -translate-x-1/2 w-4 h-[2px] bg-primary rounded-full" />
                )}
              </a>
            );
          })}
          {/* Mobile studio link */}
          <a
            href="/dashboard"
            className="ml-auto inline-flex items-center rounded-lg px-3 py-1.5 text-[0.8125rem] font-semibold text-primary-foreground bg-primary hover:opacity-90 transition-opacity duration-150 shrink-0"
          >
            工作室
          </a>
        </nav>
      </div>
    </header>
  );
}
