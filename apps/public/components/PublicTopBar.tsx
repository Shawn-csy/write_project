/**
 * PublicTopBar — shared top navigation for public SSR pages.
 * Next-native: uses <a> for navigation, no react-router-dom.
 * Server-renderable (no hooks that need client).
 * Pass client-side actions (theme toggle, studio link, etc.) via the `trailing` prop.
 */

import type { ReactNode } from "react";
import Link from "next/link";
import { SITE_BRAND_NAME } from "@/lib/seo";

export interface TopBarTab {
  key: string;
  label: string;
  href: string;
}

interface Props {
  activeTab?: string;
  tabs?: TopBarTab[];
  showBack?: boolean;
  backHref?: string;
  backLabel?: string;
  /** Extra content rendered in the actions slot (right side). Use PublicShellActions for standard shell actions. */
  trailing?: ReactNode;
}

const DEFAULT_TABS: TopBarTab[] = [
  { key: "scripts", label: "台本", href: "/" },
  { key: "authors", label: "作者", href: "/?view=authors" },
  { key: "orgs", label: "組織", href: "/?view=orgs" },
];

export function PublicTopBar({
  activeTab,
  tabs = DEFAULT_TABS,
  showBack = false,
  backHref = "/",
  backLabel = "返回",
  trailing,
}: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="flex h-14 items-center gap-3 px-3 sm:px-5 lg:px-8 w-full">
        {/* Left: logo + back */}
        <div className="flex items-center gap-2 shrink-0">
          {showBack && (
            <Link
              href={backHref}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              aria-label={backLabel}
            >
              ←
            </Link>
          )}
          <Link
            href="/"
            className="font-serif font-bold text-foreground text-base hover:text-primary transition-colors"
          >
            {SITE_BRAND_NAME}
          </Link>
        </div>

        {/* Center: tab nav (hidden on mobile, shown on md+) */}
        {tabs.length > 0 && (
          <nav className="hidden md:flex items-center gap-1 ml-2 shrink-0">
            {tabs.map((tab) => (
              <Link
                key={tab.key}
                href={tab.href}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        )}

        {/* Right: trailing actions */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {trailing}
        </div>
      </div>

      {/* Mobile tab row */}
      {tabs.length > 0 && (
        <div className="md:hidden border-t border-border/40 overflow-x-auto">
          <nav className="flex items-center gap-1 px-4 py-2">
            {tabs.map((tab) => (
              <Link
                key={tab.key}
                href={tab.href}
                className={`px-3 py-1 text-sm rounded-md whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
