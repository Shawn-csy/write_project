"use client";

import Link from "next/link";
import type { PublicScript } from "@/lib/types";
import { EntityScriptGrid } from "@/components/EntityScriptGrid";

interface Props {
  tagName: string;
  scripts: PublicScript[];
}

export function TagPageClient({ tagName, scripts }: Props) {
  return (
    <main className="min-h-screen bg-background">
      <div className="w-full px-3 sm:px-5 lg:px-8 py-10 pb-20">
        {/* Tag header */}
        <div className="mb-6 rounded-xl border border-border/60 bg-muted/20 p-6">
          <p className="text-xs text-muted-foreground mb-1">標籤</p>
          <h1 className="text-2xl font-bold">#{tagName}</h1>
          <p className="text-sm text-muted-foreground mt-1">{scripts.length} 部</p>
        </div>

        <EntityScriptGrid scripts={scripts} />

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
