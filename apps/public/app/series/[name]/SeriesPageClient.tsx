"use client";

import type { PublicScript } from "@/lib/types";
import { getMediaCropStyle } from "@write/media-crop";
import { ScriptCard } from "@/components/ScriptCard";

interface SeriesMeta {
  name?: string;
  summary?: string;
  coverUrl?: string;
  coverCrop?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null;
}

interface Props {
  seriesName: string;
  scripts: PublicScript[];
  seriesMeta: SeriesMeta | null;
}

export function SeriesPageClient({ seriesName, scripts, seriesMeta }: Props) {
  const cover = getMediaCropStyle(seriesMeta?.coverUrl ?? "", seriesMeta?.coverCrop);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20">
        {/* Series header */}
        <div className="mb-6 rounded-xl border border-border/60 bg-muted/20 p-6">
          <div className="flex gap-5 items-start">
            {cover.src && (
              <div className="w-20 h-28 shrink-0 rounded overflow-hidden border border-border/50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cover.src}
                  style={cover.style}
                  alt={seriesName}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground mb-1">系列</p>
              <h1 className="text-2xl font-bold">{seriesName}</h1>
              <p className="text-sm text-muted-foreground mt-1">{scripts.length} 部</p>
              {seriesMeta?.summary && (
                <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
                  {seriesMeta.summary}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Scripts grid */}
        {scripts.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p>這個系列目前沒有公開作品。</p>
            <a href="/" className="text-sm underline mt-2 inline-block">
              返回首頁
            </a>
          </div>
        ) : (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}
          >
            {scripts.map((script) => (
              <ScriptCard key={script.id} script={script} />
            ))}
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-border">
          <a
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground underline"
          >
            ← 返回台本列表
          </a>
        </div>
      </div>
    </main>
  );
}
