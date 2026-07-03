/**
 * PublicFooter — server-safe component. No hooks. Pure <a> links.
 * Houses legal/trust links so topbar/info-menu stays focused on navigation.
 */

import { SITE_BRAND_NAME } from "@/lib/seo";

const FOOTER_LINKS = [
  { href: "/about", label: "關於我們" },
  { href: "/help", label: "使用說明" },
  { href: "/license", label: "授權說明" },
  { href: "/privacy", label: "隱私政策" },
  { href: "/terms", label: "使用條款" },
] as const;

export function PublicFooter() {
  return (
    <footer
      className="mt-auto px-4 sm:px-6 lg:px-8 py-6 text-muted-foreground"
      style={{ borderTop: "1px solid hsl(var(--border) / 0.6)" }}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
        {/* Brand */}
        <a
          href="/"
          className="text-[0.8125rem] font-semibold text-foreground/70 hover:text-foreground transition-colors shrink-0"
        >
          {SITE_BRAND_NAME}
        </a>

        {/* Links — wrap on mobile */}
        <nav aria-label="頁尾導航" className="flex flex-wrap gap-x-4 gap-y-1.5">
          {FOOTER_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              className="text-[0.8125rem] hover:text-foreground transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
