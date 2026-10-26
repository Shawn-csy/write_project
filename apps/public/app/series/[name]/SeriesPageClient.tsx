"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { ExternalPublicScript, PublicScript } from "@/lib/types";
import { PublicImage } from "@/components/PublicImage";
import { externalEntityHref } from "@/lib/externalEntity";

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
  externalItems?: ExternalPublicScript[];
  seriesMeta: SeriesMeta | null;
}

type Chapter =
  | { kind: "local"; item: PublicScript }
  | { kind: "external"; item: ExternalPublicScript };

interface SeriesAuthor {
  name: string;
  href: string;
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

function renderSummaryWithLinks(summary: string): ReactNode[] {
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const lines = summary.split("\n");
  return lines.flatMap((line, lineIndex) => {
    const parts: ReactNode[] = [];
    let cursor = 0;
    for (const match of line.matchAll(urlPattern)) {
      const url = match[0];
      const start = match.index ?? 0;
      const trailing = url.match(/[.,，。；;、)）]+$/)?.[0] ?? "";
      const cleanUrl = trailing ? url.slice(0, -trailing.length) : url;
      if (start > cursor) parts.push(line.slice(cursor, start));
      parts.push(
        <a
          key={`${lineIndex}-${start}`}
          href={cleanUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {cleanUrl}
        </a>,
      );
      if (trailing) parts.push(trailing);
      cursor = start + url.length;
    }
    if (cursor < line.length) parts.push(line.slice(cursor));
    if (lineIndex < lines.length - 1) parts.push(<br key={`br-${lineIndex}`} />);
    return parts;
  });
}

export function SeriesPageClient({ seriesName, scripts, externalItems = [], seriesMeta }: Props) {
  const chapters: Chapter[] = [
    ...scripts.map((item) => ({ kind: "local" as const, item })),
    ...externalItems.map((item) => ({ kind: "external" as const, item })),
  ];
  const firstChapter = chapters[0] ?? null;
  const latestScriptId = seriesMeta?.latestScriptId;
  const latestChapter = chapters.find((chapter) => chapter.item.id === latestScriptId) ?? null;
  const authors = Array.from(
    new Map(
      chapters.flatMap((chapter): SeriesAuthor[] => {
        if (chapter.kind === "external") {
          const name = chapter.item.authorName?.trim();
          return name ? [{ name, href: externalEntityHref("author", name, chapter.item.authorUrl) }] : [];
        }
        const persona = chapter.item.persona;
        if (persona?.displayName?.trim() && persona.id) {
          return [{ name: persona.displayName.trim(), href: `/author/${persona.id}` }];
        }
        const owner = chapter.item.owner;
        return owner?.displayName?.trim() && owner.id
          ? [{ name: owner.displayName.trim(), href: `/author/${owner.id}` }]
          : [];
      }).map((author) => [author.name.toLocaleLowerCase(), author])
    ).values()
  );

  const hasCover = Boolean(seriesMeta?.coverUrl);

  return (
    <main className="min-h-screen bg-background">
      {/* Atmospheric banner — blurred cover or gradient fallback, same pattern as AuthorPageClient */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-r from-slate-900 to-slate-700">
        {hasCover && (
          <PublicImage
            src={seriesMeta!.coverUrl!}
            alt=""
            preset="hero-banner"
            className="scale-110 blur-xl opacity-60"
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
              <div className="relative w-24 h-32 sm:w-28 sm:h-40 shrink-0 rounded-lg overflow-hidden border border-border/50 shadow-md">
                <PublicImage
                  src={seriesMeta!.coverUrl!}
                  alt={seriesName}
                  preset="series-cover"
                  crop={seriesMeta?.coverCrop}
                />
              </div>
            )}

            <div className="flex-1 space-y-3 pt-1">
              <p className="text-xs font-medium text-primary/70 uppercase tracking-widest">系列</p>
              <h1 className="text-3xl sm:text-4xl font-bold font-serif leading-tight">{seriesName}</h1>

              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{chapters.length} 部作品</span>
              </div>

              {authors.length > 0 && (
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  <span>作者</span>
                  {authors.map((author) => (
                    <Link key={author.href} href={author.href} className="text-primary hover:underline">
                      {author.name}
                    </Link>
                  ))}
                </div>
              )}

              {seriesMeta?.summary && (
                <p className="text-foreground/80 leading-relaxed max-w-2xl">
                  {renderSummaryWithLinks(seriesMeta.summary)}
                </p>
              )}

              {/* CTA buttons */}
              {chapters.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {firstChapter && (firstChapter.kind === "external" ? (
                    <a href={firstChapter.item.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors no-underline">
                      前往原文
                    </a>
                  ) : (
                    <Link href={`/read/${firstChapter.item.id}`} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors no-underline">
                      開始閱讀
                    </Link>
                  ))}
                  {latestChapter && latestChapter.item.id !== firstChapter?.item.id && (latestChapter.kind === "external" ? (
                    <a href={latestChapter.item.sourceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted/50 transition-colors no-underline">
                      最新章節
                    </a>
                  ) : (
                    <Link href={`/read/${latestChapter.item.id}`} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg border border-border bg-background text-sm font-medium hover:bg-muted/50 transition-colors no-underline">
                      最新章節
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Chapter list card */}
        {chapters.length === 0 ? (
          <div className="rounded-xl border border-border/60 bg-muted/20 py-16 text-center text-muted-foreground">
            <p>這個系列目前沒有公開作品。</p>
            <Link href="/" className="text-sm underline mt-2 inline-block">返回首頁</Link>
          </div>
        ) : (
          <section className="rounded-xl border border-border/60 bg-muted/20 p-4 sm:p-6">
            <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
              <h2 className="text-xl font-bold">章節列表</h2>
              <span className="text-xs text-muted-foreground bg-background px-2 py-0.5 rounded-full border border-border/60">
                {chapters.length} 部
              </span>
            </div>

            <div className="space-y-1">
              {chapters.map((chapter, index) => {
                const isLatest = chapter.item.id === latestScriptId && chapters.length > 1;
                const isExternal = chapter.kind === "external";
                const script = chapter.kind === "local" ? chapter.item : null;
                const external = chapter.kind === "external" ? chapter.item : null;
                const order = chapter.item.seriesOrder;
                const label = chapterLabel(order);
                const dateLabel = formatDate(isExternal
                  ? (external?.mountedAt ?? external?.sourceCreatedAt ?? external?.createdAt)
                  : (script?.lastModified ?? script?.updatedAt));

                const row = (
                  <>
                    <span className="shrink-0 w-7 text-center text-xs text-muted-foreground/50 font-mono tabular-nums">
                      {order == null ? (index + 1) : order === 0 ? "★" : order}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {chapter.item.title}
                        </span>
                        {isLatest && (
                          <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 leading-none">
                            最新
                          </span>
                        )}
                      </div>
                      {label && <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>}
                    </div>
                    {dateLabel && <span className="shrink-0 text-[11px] text-muted-foreground/60 hidden sm:block">{dateLabel}</span>}
                    <span className="shrink-0 text-muted-foreground/30 group-hover:text-primary/60 transition-colors text-sm" aria-hidden>→</span>
                  </>
                );

                return (
                  isExternal ? (
                    <a key={chapter.item.id} href={external!.sourceUrl} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-4 rounded-lg px-3 py-3 hover:bg-background/80 border border-transparent hover:border-border/60 transition-all no-underline">
                      {row}
                    </a>
                  ) : (
                    <Link key={chapter.item.id} href={`/read/${script!.id}`} className="group flex items-center gap-4 rounded-lg px-3 py-3 hover:bg-background/80 border border-transparent hover:border-border/60 transition-all no-underline">
                      {row}
                    </Link>
                  )
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
