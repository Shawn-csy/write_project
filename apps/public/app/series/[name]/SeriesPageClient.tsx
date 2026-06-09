"use client";

import type { PublicScript } from "@/lib/types";

interface SeriesMeta {
  name?: string;
  summary?: string;
  coverUrl?: string;
}

interface Props {
  seriesName: string;
  scripts: PublicScript[];
  seriesMeta: SeriesMeta | null;
}

export function SeriesPageClient({ seriesName, scripts, seriesMeta }: Props) {
  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
        {/* Series header */}
        <div className="mb-6 rounded-xl border border-border/60 bg-muted/20 p-6">
          <div className="flex gap-5 items-start">
            {seriesMeta?.coverUrl && (
              <div className="w-20 h-28 shrink-0 rounded overflow-hidden border border-border/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={seriesMeta.coverUrl} alt={seriesName} className="w-full h-full object-cover" />
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-1">系列</p>
              <h1 className="text-2xl font-bold">{seriesName}</h1>
              <p className="text-sm text-muted-foreground mt-1">{scripts.length} 部</p>
              {seriesMeta?.summary && (
                <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{seriesMeta.summary}</p>
              )}
            </div>
          </div>
        </div>

        {/* Scripts grid */}
        <div
          className="grid gap-4"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}
        >
          {scripts.map((script) => (
            <a
              key={script.id}
              href={`/read/${script.id}`}
              className="group rounded-lg border border-border/60 bg-background hover:border-primary/50 transition-colors overflow-hidden"
            >
              <div className="aspect-[2/3] bg-muted relative overflow-hidden">
                {script.coverUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={script.coverUrl} alt={script.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center p-3">
                    <span className="text-xs text-muted-foreground text-center line-clamp-4">{script.title}</span>
                  </div>
                )}
                {script.seriesOrder != null && (
                  <div className="absolute top-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
                    #{script.seriesOrder}
                  </div>
                )}
              </div>
              <div className="p-2">
                <p className="text-xs font-medium line-clamp-2 group-hover:text-primary transition-colors">
                  {script.title}
                </p>
              </div>
            </a>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-border">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground underline">
            ← 返回台本列表
          </a>
        </div>
      </div>
    </main>
  );
}
