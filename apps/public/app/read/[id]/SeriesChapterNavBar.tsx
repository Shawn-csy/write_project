"use client";

import type { SeriesChapterNav } from "./useSeriesChapterNav";

interface Props {
  nav: SeriesChapterNav;
  /** True when the series has a chapter the visitor hasn't seen yet. */
  hasNewChapter?: boolean;
}

function chapterLabel(order: number | null, fallbackIndex: number): string {
  if (order === 0) return "設定／背景";
  if (order != null) return `第 ${order} 部`;
  return `第 ${fallbackIndex + 1} 部`;
}

export function SeriesChapterNavBar({ nav, hasNewChapter = false }: Props) {
  const {
    seriesName,
    seriesHref,
    chapters,
    currentIndex,
    prev,
    next,
    latestChapter,
    isLatest,
  } = nav;

  const currentChapter = currentIndex >= 0 ? chapters[currentIndex] : null;
  const positionLabel = currentChapter
    ? chapterLabel(currentChapter.seriesOrder, currentIndex)
    : null;
  const totalLabel = `共 ${chapters.length} 部`;

  return (
    <nav
      className="w-full max-w-4xl mx-auto px-6 pt-4 pb-2"
      aria-label="系列章節導覽"
    >
      <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-3 space-y-2">
        {/* Series name + position */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <a
              href={seriesHref}
              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline no-underline"
            >
              <span aria-hidden>←</span>
              <span>{seriesName}</span>
            </a>
            {hasNewChapter && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 leading-none shrink-0">
                有新章節
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground">
            {positionLabel && `${positionLabel}・`}{totalLabel}
          </span>
        </div>

        {/* Latest hint */}
        {latestChapter && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 leading-none shrink-0">
              最新
            </span>
            <a
              href={`/read/${latestChapter.id}`}
              className="text-xs text-muted-foreground hover:text-foreground line-clamp-1 no-underline hover:underline"
            >
              {latestChapter.title}
            </a>
          </div>
        )}
        {isLatest && (
          <p className="text-[11px] text-primary/70">
            ✓ 你正在閱讀最新章節
          </p>
        )}

        {/* Prev / Next */}
        <div className="flex items-center gap-2 pt-0.5">
          {prev ? (
            <a
              href={`/read/${prev.id}`}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-border/60 bg-background hover:bg-muted/40 transition-colors no-underline text-foreground"
            >
              <span aria-hidden>←</span>
              <span className="max-w-[120px] truncate hidden sm:inline">{prev.title}</span>
              <span className="sm:hidden">上一部</span>
            </a>
          ) : (
            <span className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-border/30 text-muted-foreground/40 cursor-not-allowed">
              <span aria-hidden>←</span>
              <span>上一部</span>
            </span>
          )}

          <span className="flex-1" />

          {next ? (
            <a
              href={`/read/${next.id}`}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-border/60 bg-background hover:bg-muted/40 transition-colors no-underline text-foreground"
            >
              <span className="max-w-[120px] truncate hidden sm:inline">{next.title}</span>
              <span className="sm:hidden">下一部</span>
              <span aria-hidden>→</span>
            </a>
          ) : (
            <span className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border border-border/30 text-muted-foreground/40 cursor-not-allowed">
              <span>下一部</span>
              <span aria-hidden>→</span>
            </span>
          )}
        </div>
      </div>
    </nav>
  );
}
