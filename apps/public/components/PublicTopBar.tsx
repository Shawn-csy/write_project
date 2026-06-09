/**
 * PublicTopBar — shared top navigation for public SSR pages.
 * Next-native: uses <a> for navigation, no react-router-dom.
 * Server-renderable (no hooks that need client).
 */

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
  /** Extra content rendered in the actions slot (right side) */
  actions?: React.ReactNode;
}

const DEFAULT_TABS: TopBarTab[] = [
  { key: "scripts", label: "台本", href: "/" },
  { key: "authors", label: "作者", href: "/?tab=authors" },
  { key: "orgs", label: "組織", href: "/?tab=orgs" },
];

export function PublicTopBar({
  activeTab,
  tabs = DEFAULT_TABS,
  showBack = false,
  backHref = "/",
  backLabel = "返回",
  actions,
}: Props) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/95 backdrop-blur">
      <div className="flex h-13 items-center gap-3 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Left: logo + back */}
        <div className="flex items-center gap-2 shrink-0">
          {showBack && (
            <a
              href={backHref}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              aria-label={backLabel}
            >
              ←
            </a>
          )}
          <a
            href="/"
            className="font-serif font-bold text-foreground text-base hover:text-primary transition-colors"
          >
            Screenplay Reader
          </a>
        </div>

        {/* Center: tab nav (hidden on mobile, shown on md+) */}
        {tabs.length > 0 && (
          <nav className="hidden md:flex items-center gap-1 ml-2">
            {tabs.map((tab) => (
              <a
                key={tab.key}
                href={tab.href}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {tab.label}
              </a>
            ))}
          </nav>
        )}

        {/* Right: actions */}
        <div className="ml-auto flex items-center gap-2">
          {actions}
          <a
            href="/dashboard"
            className="hidden sm:inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shrink-0"
          >
            工作室
          </a>
        </div>
      </div>

      {/* Mobile tab row */}
      {tabs.length > 0 && (
        <div className="md:hidden border-t border-border/40 overflow-x-auto">
          <nav className="flex items-center gap-1 px-4 py-2">
            {tabs.map((tab) => (
              <a
                key={tab.key}
                href={tab.href}
                className={`px-3 py-1 text-sm rounded-md whitespace-nowrap transition-colors ${
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {tab.label}
              </a>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
