"use client";

import type { PublicScript } from "@/lib/types";
import { getMediaCropStyle } from "@write/media-crop";

interface SeriesMeta {
  name?: string;
  summary?: string;
  coverUrl?: string;
  coverCrop?: { cx?: number | null; cy?: number | null; zoom?: number | null } | null;
  latestScriptId?: string;
}

interface Props {
  seriesName: string;
  scripts: PublicScript[];
  seriesMeta: SeriesMeta | null;
}

function formatDate(value: number | string | null | undefined): string {
  if (value == null) return "";
  const ts = typeof value === "number" ? value : Date.parse(String(value));
  if (!Number.isFinite(ts) || ts === 0) return "";
  const diffDays = Math.floor((Date.now() - ts) / 86400000);
  if (diffDays < 1) return "今天";
  if (diffDays < 7) return `${diffDays} 天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 週前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} 個月前`;
  return new Date(ts).getFullYear().toString();
}

function chapterLabel(order: number | null | undefined): string {
  if (order == null) return "";
  if (order === 0) return "設定／背景";
  return `第 ${order} 部`;
}

export function SeriesPageClient({ seriesName, scripts, seriesMeta }: Props) {
  const cover = getMediaCropStyle(seriesMeta?.coverUrl ?? "", seriesMeta?.coverCrop);

  const firstScript = scripts[0] ?? null;
  const latestScriptId = seriesMeta?.latestScriptId;
  const latestScript = scripts.find((s) => s.id === latestScriptId) ?? null;

  return (
    <main className="min-h-screen bg-background">
      <div className="w-full max-w-3xl mx-auto px-3 sm:px-5 py-10 pb-20">

        {/* Series header */}
        <div className="mb-8 flex gap-5 items-start">
          {cover.src && (
            <div className="w-24 h-32 shrink-0 rounded-lg overflow-hidden border border-border/50 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cover.src}
                style={cover.style}
                alt={seriesName}
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-primary/70 mb-1 uppercase tracking-wide">系列</p>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{seriesName}</h1>
            <p className="text-sm text-muted-foreground mt-1">{scripts.length} 部作品</p>
            {seriesMeta?.summary && (
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xl">
                {seriesMeta.summary}
              </p>
            )}

            {/* CTA buttons */}
            {scripts.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {firstScript && (
                  <a
                    href={`/read/${firstScript.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors no-underline"
                  >
                    開始閱讀
                  </a>
                )}
                {latestScript && latestScript.id !== firstScript?.id && (
                  <a
                    href={`/read/${latestScript.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted/50 transition-colors no-underline"
                  >
                    最新章節
                  </a>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chapter list */}
        {scripts.length === 0 ? (
          <div className="py-16 text-center text-muted-foreground">
            <p>這個系列目前沒有公開作品。</p>
            <a href="/" className="text-sm underline mt-2 inline-block">返回首頁</a>
          </div>
        ) : (
          <div className="space-y-1">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
              章節列表
            </h2>
            {scripts.map((script, index) => {
              const isLatest = script.id === latestScriptId && scripts.length > 1;
              const order = script.seriesOrder;
              const label = chapterLabel(order);
              const dateLabel = formatDate(script.lastModified ?? script.updatedAt);

              return (
                <a
                  key={script.id}
                  href={`/read/${script.id}`}
                  className="group flex items-center gap-4 rounded-xl px-4 py-3 border border-transparent hover:border-primary/30 hover:bg-muted/30 transition-all no-underline"
                >
                  {/* Order number */}
                  <span className="shrink-0 w-8 text-center text-xs text-muted-foreground/60 font-mono tabular-nums">
                    {order == null ? (index + 1) : order === 0 ? "★" : order}
                  </span>

                  {/* Title + label */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                        {script.title}
                      </span>
                      {isLatest && (
                        <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 leading-none">
                          最新
                        </span>
                      )}
                    </div>
                    {label && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
                    )}
                  </div>

                  {/* Date */}
                  {dateLabel && (
                    <span className="shrink-0 text-[11px] text-muted-foreground/60 hidden sm:block">
                      {dateLabel}
                    </span>
                  )}

                  {/* Arrow */}
                  <span className="shrink-0 text-muted-foreground/30 group-hover:text-primary/60 transition-colors text-sm" aria-hidden>
                    →
                  </span>
                </a>
              );
            })}
          </div>
        )}

        <div className="mt-10 pt-6 border-t border-border">
          <a href="/" className="text-sm text-muted-foreground hover:text-foreground underline">
            ← 返回台本列表
          </a>
        </div>
      </div>
    </main>
  );
}
