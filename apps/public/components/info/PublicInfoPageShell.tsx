import type { ReactNode } from "react";
import Link from "next/link";
import { PublicShellTopBar } from "@write/public-ui/PublicShellTopBar";
import { PublicShellActions } from "@/components/PublicShellActions";

interface RelatedLink {
  href: string;
  label: string;
}

export interface PublicInfoPageShellProps {
  title: string;
  description?: string;
  activeKey?: "about" | "help" | "license" | "privacy" | "terms";
  children: ReactNode;
  relatedLinks?: RelatedLink[];
}

const INFO_TABS = [
  { key: "about", label: "關於", href: "/about" },
  { key: "help", label: "說明", href: "/help" },
  { key: "license", label: "授權", href: "/license" },
];

export function PublicInfoPageShell({
  title,
  description,
  activeKey,
  children,
  relatedLinks,
}: PublicInfoPageShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicShellTopBar
        tabs={INFO_TABS}
        activeTab={activeKey}
        brandName="公開台本"
        brandSubtitle="泛用型產品作坊"
        trailing={<PublicShellActions />}
      />

      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Hero */}
        <header className="mb-10">
          <h1 className="text-3xl font-serif font-bold">{title}</h1>
          {description && (
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          )}
        </header>

        {/* Content */}
        {children}

        {/* Footer links */}
        {relatedLinks && relatedLinks.length > 0 && (
          <footer className="mt-10 pt-6 border-t border-border flex flex-wrap gap-4 text-sm text-muted-foreground">
            {relatedLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-foreground underline">
                {link.label}
              </Link>
            ))}
          </footer>
        )}
      </main>
    </div>
  );
}
