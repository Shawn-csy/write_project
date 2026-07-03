import type { ReactNode } from "react";
import Link from "next/link";
import { PublicInfoTopBar } from "@/components/info/PublicInfoTopBar";
import { PublicFooter } from "@/components/PublicFooter";

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

export function PublicInfoPageShell({
  title,
  description,
  activeKey,
  children,
  relatedLinks,
}: PublicInfoPageShellProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicInfoTopBar activeKey={activeKey as "about" | "help" | "license" | undefined} />

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

        {/* Page-specific back/related links */}
        {relatedLinks && relatedLinks.length > 0 && (
          <div className="mt-10 pt-6 border-t border-border flex flex-wrap gap-4 text-sm text-muted-foreground">
            {relatedLinks.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-foreground underline">
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </main>
      <PublicFooter />
    </div>
  );
}
