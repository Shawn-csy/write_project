"use client";

import Link from "next/link";
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

  const hasCover = Boolean(cover.src);

  return (
    <main className="min-h-screen bg-background">
      {/* Atmospheric banner — blurred cover or gradient fallback, same pattern as AuthorPageClient */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-r from-slate-900 to-slate-700">
        {hasCover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.src}
            alt=""
            aria-hidden
            className="w-full h-full object-cover scale-110 blur-xl opacity-60"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      <div className="w-full px-3 sm:px-5 lg:px-8 pb-20">
        {/* Header card — overlaps banner, same -mt pattern as AuthorPageClient */}
        <div className="relative -mt-16 mb-6 rounded-xl border border-border/60 bg-background p-6 shadow-sm md:p-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            {/* Cover thumbnail */}
            {hasCover && (
              <div className="w-24 h-32 sm:w-28 sm:h-40 shrink-0 rounded-lg overflow-hidden border border-border/50 shadow-md">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cover.src}
                  style={cover.style}
                  alt={seriesName}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex-1 space-y-3 pt-1">
              <p className="text-xs font-medium text-primary/70 uppercase tracking-widest">系列</p>
              <h1 className="text-3xl sm:text-4xl font-bold font-serif leading-tight">{seriesName}</h1>

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{scripts.length} 部作品</span>
              </div>

              {seriesMeta?.summary && (
                <p className="text-foreground/80 leading-relaxed max-w-2xl">
                  {seriesMeta.summary}
                </p>
              )}

              {/* CTA buttons */}
              {scripts.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {firstScript && (
                    <Link
                      href={`/read/${firstScript.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors no-underline"
                    >
                      開始閱讀
                    </Link>
                  )}
                  {latestScript && latestScript.id !== firstScript?.id && (
                    <Link
                      href={`/read/${latestScript.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted/50 transition-colors no-underline"
                    >
                      最新章節
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chapter list card */}
        {scripts.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-muted/20 py-16 text-center text-muted-foreground">
            <p>這個系列目前沒有公開作品。</p>
            <Link href="/" className="text-sm underline mt-2 inline-block">返回首頁</Link>
          </div>
        ) : (
          <section className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
              <h2 className="text-xl font-bold">章節列表</h2>
              <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border/60">
                {scripts.length} 部
              </span>
            </div>

            <div className="space-y-1">
              {scripts.map((script, index) => {
                const isLatest = script.id === latestScriptId && scripts.length > 1;
                const order = script.seriesOrder;
                const label = chapterLabel(order);
                const dateLabel = formatDate(script.lastModified ?? script.updatedAt);

                return (
                  <Link
                    key={script.id}
                    href={`/read/${script.id}`}
                    className="group flex items-center gap-4 rounded-lg px-3 py-3 hover:bg-background/80 border border-transparent hover:border-border/60 transition-all no-underline"
                  >
                    {/* Order number */}
                    <span className="shrink-0 w-7 text-center text-xs text-muted-foreground/50 font-mono tabular-nums">
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
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        <div className="mt-8 pt-6 border-t border-border/60">
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← 返回台本列表
          </Link>
        </div>
      </div>
    </main>
  );
}
