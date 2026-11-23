import React, { useMemo } from "react";
import { Layers } from "lucide-react";
import { CoverPlaceholder } from "../cover/CoverPlaceholder";
import { CoverRenderer } from "../cover/CoverRenderer";
import { getMediaCropStyle } from "@write/media-crop";
import type { PublicSeriesGroup } from "./seriesModel";
import { normalizeCardText, normalizeOutlineText, truncateCardText } from "./cardText";
import { useGalleryHoverPreview } from "./GalleryHoverPreview";
import type { CoverImageRenderer } from "../ScriptGalleryCard";
import { formatPublicYear } from "../publicDate";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SeriesGalleryCardProps {
  series: PublicSeriesGroup;
  variant?: "standard" | "compact" | "dense";
  /** href for the series index page (e.g. /series/[name]). Required for keyboard/a11y. */
  href: string;
  /** href for the primary author page. App-owned so this package stays router-neutral. */
  authorHref?: string;
  /** Show R-18 age gate indicator when series contains adult content */
  showAgeGate?: boolean;
  /**
   * Optional renderer for the cover image. When provided, the card delegates
   * image rendering to the host (e.g. next/image with srcset). Falls back to
   * plain <img> when absent.
   */
  coverImageRenderer?: CoverImageRenderer;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatUpdatedAt(updatedAt: number | string | null): string {
  if (updatedAt == null) return "";
  const ts = typeof updatedAt === "number" ? updatedAt : Date.parse(updatedAt);
  if (!Number.isFinite(ts) || ts === 0) return "";
  const now = Date.now();
  const diffMs = now - ts;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 1) return "今天";
  if (diffDays < 7) return `${diffDays} 天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 週前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} 個月前`;
  return formatPublicYear(ts);
}

// ─── SeriesGalleryCard ────────────────────────────────────────────────────────

function SeriesGalleryCardInner({
  series,
  variant = "standard",
  href,
  authorHref,
  showAgeGate = false,
  coverImageRenderer,
}: SeriesGalleryCardProps): React.JSX.Element {
  const { name, scripts, leadScript, latestScript, coverUrl, summary, updatedAt } = series;
  const leadSummary = normalizeCardText(leadScript?._cardSummary || leadScript?.synopsis || "");
  const leadOutline = normalizeOutlineText(leadScript?._hoverOutline || leadScript?.outline || "");
  const cardSummary = truncateCardText(summary || leadSummary);
  const hoverText = leadOutline || cardSummary || "尚未提供大綱";
  const hoverLabel = leadOutline ? "大綱" : cardSummary ? "作品簡介" : "系列資訊";

  const authorName =
    typeof leadScript.author === "object"
      ? leadScript.author?.displayName
      : leadScript.author;

  const hoverCtx = useGalleryHoverPreview();
  const previewData = { title: name, author: authorName, outline: hoverText, label: hoverLabel };
  const hoverPreviewProps: React.HTMLAttributes<HTMLElement> = previewData && hoverCtx ? {
    onMouseEnter: (e) => hoverCtx.show(previewData, e.clientX, e.clientY),
    onMouseMove: (e) => hoverCtx.move(e.clientX, e.clientY),
    onMouseLeave: () => hoverCtx.hide(),
    onFocus: (e) => {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      hoverCtx.show(previewData, rect.right + 8, rect.top);
    },
    onBlur: () => hoverCtx.hide(),
  } : {};

  const cropCover = getMediaCropStyle(
    String(coverUrl || leadScript?.coverUrl || ""),
    null
  );

  const { latestTitle, chapterCount, updatedLabel } = useMemo(() => {
    return {
      latestTitle: latestScript?.title ?? "",
      chapterCount: scripts.length,
      updatedLabel: formatUpdatedAt(updatedAt),
    };
  }, [scripts.length, latestScript, updatedAt]);

  const authorEl = authorName ? (
    authorHref ? (
      <a
        href={authorHref}
        className="relative z-10 inline-flex min-w-0 max-w-full [font-size:var(--public-font-meta)] text-link hover:underline no-underline"
      >
        <span className="truncate">{authorName}</span>
      </a>
    ) : (
      <span className="inline-flex min-w-0 max-w-full [font-size:var(--public-font-meta)] text-muted-foreground">
        <span className="truncate">{authorName}</span>
      </span>
    )
  ) : null;

  // Cover element — series cover or lead script cover or design
  const rawCoverSrc = String(coverUrl || leadScript?.coverUrl || "");
  const coverEl = rawCoverSrc ? (
    coverImageRenderer
      ? coverImageRenderer({
          src: rawCoverSrc,
          crop: null,
          alt: name,
          className: "h-full w-full object-cover",
        })
      : (
        <img
          src={cropCover.src}
          style={cropCover.style as React.CSSProperties}
          alt={name}
          className="h-full w-full object-cover"
          loading="lazy"
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 180px"
        />
      )
  ) : leadScript?.coverDesign ? (
    <CoverRenderer
      design={leadScript.coverDesign}
      title={name}
      compact
      responsive
      className="h-full w-full"
    />
  ) : (
    <CoverPlaceholder title={name} compact />
  );

  const coverWrapEl = (
    <a href={href} tabIndex={-1} aria-hidden className="block w-full h-full">
      {coverEl}
    </a>
  );

  const ARTICLE_CLASS = "group relative cursor-default";

  // ── Dense cover grid ──
  if (variant === "dense") {
    return (
      <article className="group relative min-w-0" data-gallery-card="dense" {...hoverPreviewProps}>
        <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[2px] border border-border bg-muted group-hover:opacity-90">
          {coverWrapEl}
          {showAgeGate && <>
            <div className="pointer-events-none absolute inset-0 bg-danger-muted opacity-25" aria-hidden />
            <span className="pointer-events-none absolute left-0.5 top-0.5 z-10 rounded-[2px] bg-seal px-1 py-0.5 text-[9px] font-bold leading-none text-white">R18</span>
          </>}
          <span className="pointer-events-none absolute right-1 top-1 z-10 rounded-[2px] bg-black/80 px-1.5 py-0.5 text-[10px] font-medium text-white">{chapterCount} 部</span>
        </div>
        <div className="min-w-0 pt-1.5">
          <h2 className="line-clamp-2 min-h-[2.5em] [font-size:var(--public-font-meta)] font-semibold leading-tight text-foreground group-hover:text-link">
            <a href={href} className="text-inherit no-underline">{name}</a>
          </h2>
          {authorName && <div className="mt-0.5 truncate [font-size:var(--public-font-caption)] text-muted-foreground">
            {authorHref ? <a href={authorHref} className="hover:text-foreground hover:underline">{authorName}</a> : authorName}
          </div>}
        </div>
      </article>
    );
  }

  // ── Compact list ──
  if (variant === "compact") {
    return (
      <article className="group relative border-b border-border" {...hoverPreviewProps}>
        <div className="flex items-stretch gap-3 py-2.5 pr-2 group-hover:bg-muted">
          {/* Cover stack hint */}
          <div className="w-[40px] shrink-0 ml-1">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[3px] border border-border bg-muted">
                            <div className="absolute inset-0 overflow-hidden rounded-sm">
                {coverWrapEl}
              </div>
              {showAgeGate && (
                <>
                  <div className="absolute inset-0 bg-danger-muted opacity-25 pointer-events-none" aria-hidden />
                  <span className="absolute top-1 left-1 z-10 rounded-[2px] bg-seal px-1 py-0.5 text-[9px] font-bold leading-none text-white pointer-events-none">R18</span>
                </>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <Layers className="w-3 h-3 shrink-0 text-link" aria-hidden />
              <span className="[font-size:var(--public-font-caption)] text-muted-foreground font-medium shrink-0">系列</span>
              <span className="[font-size:var(--public-font-caption)] text-muted-foreground">· {chapterCount} 部</span>
            </div>
            <div className="min-w-0 [font-size:var(--public-font-card-title)] font-semibold leading-tight text-foreground line-clamp-1 group-hover:text-link">
              <a href={href} className="text-inherit no-underline before:absolute before:inset-0 before:z-0">
                {name}
              </a>
            </div>
            {latestTitle && (
              <p className="[font-size:var(--public-font-caption)] text-muted-foreground line-clamp-1">
                最新：{latestTitle}
              </p>
            )}
            {authorEl && <div className="pt-0.5">{authorEl}</div>}
            {cardSummary && (
              <p className="[font-size:var(--public-font-caption)] [line-height:var(--public-line-body)] text-muted-foreground line-clamp-1">
                {cardSummary}
              </p>
            )}
          </div>
        </div>
      </article>
    );
  }

  // ── Standard ──
  return (
    <article className={ARTICLE_CLASS} {...hoverPreviewProps}>
      {/* Cover with stack decoration */}
      <div className="relative aspect-[2/3] w-full">
        <div className="absolute inset-0 translate-x-[6px] translate-y-[6px] rounded-[3px] border border-border bg-card" aria-hidden />
        <div className="absolute inset-0 translate-x-[3px] translate-y-[3px] rounded-[3px] border border-border bg-card" aria-hidden />
        <div
          className="absolute inset-0 overflow-hidden rounded-[2px] border border-border bg-muted group-hover:opacity-90"
        >
          {coverWrapEl}
          {showAgeGate && (
            <>
              <div className="absolute inset-0 bg-danger-muted opacity-25 pointer-events-none" aria-hidden />
              <span className="absolute top-1 left-1 z-10 rounded-[2px] bg-seal px-1.5 py-1 text-[11px] font-bold leading-none text-white pointer-events-none">R-18</span>
            </>
          )}
        </div>
        <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 rounded-[2px] bg-black/80 px-1.5 py-1">
          <Layers className="w-3 h-3 text-white/80" aria-hidden />
          <span className="text-[10px] font-semibold text-white/90 leading-none">{chapterCount}</span>
        </div>
      </div>

      {/* Meta */}
      <div className="pt-2.5 space-y-1">
        <p className="[font-size:var(--public-font-caption)] text-muted-foreground font-medium flex items-center gap-1">
          <Layers className="w-3 h-3" aria-hidden />
          系列
        </p>
        <h2 className="[font-size:var(--public-font-card-title)] font-bold leading-snug line-clamp-2">
          <a href={href} className="text-foreground no-underline hover:text-link hover:underline">
            {name}
          </a>
        </h2>

        {authorEl}

        {cardSummary && (
          <p className="[font-size:var(--public-font-meta)] [line-height:var(--public-line-body)] text-muted-foreground line-clamp-2">{cardSummary}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 pt-1.5 [font-size:var(--public-font-caption)] tabular-nums text-muted-foreground">
          <span>{chapterCount} 部</span>
          {updatedLabel && <span>更新 {updatedLabel}</span>}
        </div>
      </div>
    </article>
  );
}

export const SeriesGalleryCard = React.memo(SeriesGalleryCardInner);
