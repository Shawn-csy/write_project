"use client";

import Link from "next/link";
import type { ExternalPublicScript, PublicScript } from "@/lib/types";
import { EntityScriptGrid } from "@/components/EntityScriptGrid";
import { ExternalPublicScriptCard } from "@/components/ExternalPublicScriptSection";
import { GalleryHoverPreviewProvider } from "@write/public-ui";

interface Props {
  tagName: string;
  scripts: PublicScript[];
  externalScripts: ExternalPublicScript[];
}

export function TagPageClient({ tagName, scripts, externalScripts }: Props) {
  const totalCount = scripts.length + externalScripts.length;

  return (
    <main className="min-h-screen bg-background">
      <div className="w-full px-3 sm:px-5 lg:px-8 py-10 pb-20">
        {/* Tag header */}
        <div className="mb-6 rounded-xl border border-border/60 bg-muted/20 p-6">
          <p className="text-xs text-muted-foreground mb-1">標籤</p>
          <h1 className="text-2xl font-bold">#{tagName}</h1>
          <p className="text-sm text-muted-foreground mt-1">{totalCount} 部</p>
        </div>

        {scripts.length > 0 && <EntityScriptGrid scripts={scripts} />}

        {externalScripts.length > 0 && (
          <section className={scripts.length > 0 ? "mt-8" : ""}>
            <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-lg font-semibold">外部公開台本</h2>
              <span className="text-xs text-muted-foreground">{externalScripts.length} 部</span>
            </div>
            <GalleryHoverPreviewProvider>
              <div
                className="grid gap-4"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}
              >
                {externalScripts.map((script) => (
                  <ExternalPublicScriptCard key={script.id} item={script} />
                ))}
              </div>
            </GalleryHoverPreviewProvider>
          </section>
        )}

        <div className="mt-10 pt-6 border-t border-border">
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            ← 返回台本列表
          </Link>
        </div>
      </div>
    </main>
  );
}
