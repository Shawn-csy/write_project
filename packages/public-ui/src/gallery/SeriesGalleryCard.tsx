import React, { useMemo } from "react";
import { Layers } from "lucide-react";
import { CoverPlaceholder } from "../cover/CoverPlaceholder";
import { CoverRenderer } from "../cover/CoverRenderer";
import { getMediaCropStyle } from "@write/media-crop";
import type { PublicSeriesGroup } from "./seriesModel";
import { normalizeCardText, normalizeOutlineText, truncateCardText } from "./cardText";
import { useGalleryHoverPreview } from "./GalleryHoverPreview";
import type { CoverImageRenderer } from "../ScriptGalleryCard";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SeriesGalleryCardProps {
  series: PublicSeriesGroup;
  variant?: "standard" | "compact";
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
  const d = new Date(ts);
  const now = Date.now();
  const diffMs = now - ts;
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffDays < 1) return "今天";
  if (diffDays < 7) return `${diffDays} 天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 週前`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} 個月前`;
  return `${d.getFullYear()}`;
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

  const authorName =
    typeof leadScript.author === "object"
      ? leadScript.author?.displayName
      : leadScript.author;

  const hoverCtx = useGalleryHoverPreview();
  const previewData = leadOutline ? { title: name, author: authorName, outline: leadOutline } : null;
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
        className="relative z-10 inline-flex min-w-0 max-w-full [font-size:var(--public-font-meta)] text-muted-foreground hover:text-foreground hover:underline no-underline"
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
          className: "h-full w-full object-cover transition-transform duration-500 group-hover:scale-105",
        })
      : (
        <img
          src={cropCover.src}
          style={cropCover.style as React.CSSProperties}
          alt={name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
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

  const ARTICLE_CLASS =
    "group relative rounded-xl border border-transparent bg-transparent px-2 pb-2 pt-1 shadow-none hover:-translate-y-[3px] hover:border-border hover:bg-card hover:shadow-[0_4px_16px_hsl(var(--foreground)/0.07),0_1px_3px_hsl(var(--foreground)/0.05)] transition-all duration-200";

  // ── Compact ──
  if (variant === "compact") {
    return (
      <article className="group relative rounded-xl bg-transparent transition-all duration-200" {...hoverPreviewProps}>
        <div className="mx-2 my-0.5 flex items-stretch gap-3 rounded-lg pl-0 pr-3 py-2 border-l-[3px] border-l-primary/40 transition-all duration-200 group-hover:border-l-primary group-hover:bg-primary/5">
          {/* Cover stack hint */}
          <div className="w-[40px] shrink-0 ml-3">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-sm border border-border/40 bg-muted/25 shadow-sm">
              <div className="absolute inset-0 translate-x-1 translate-y-1 rounded-sm border border-border/30 bg-muted/50" aria-hidden />
              <div className="absolute inset-0 overflow-hidden rounded-sm">
                {coverWrapEl}
              </div>
              {showAgeGate && (
                <>
                  <div className="absolute inset-0 bg-red-900/25 pointer-events-none" aria-hidden />
                  <span className="absolute top-0.5 left-0.5 z-10 rounded-[2px] bg-red-600 border border-red-400/60 px-1 py-px text-[8px] font-bold leading-none text-white pointer-events-none tracking-wide">R18</span>
                </>
              )}
            </div>
          </div>

          {/* Meta */}
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <Layers className="w-3 h-3 shrink-0 text-primary/60" aria-hidden />
              <span className="[font-size:var(--public-font-caption)] text-primary font-medium shrink-0">系列</span>
              <span className="[font-size:var(--public-font-caption)] text-muted-foreground">· {chapterCount} 部</span>
            </div>
            <div className="min-w-0 [font-size:var(--public-font-card-title)] font-semibold leading-tight text-foreground line-clamp-1 transition-colors duration-200 group-hover:text-primary">
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
        <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-lg bg-muted/60 border border-border/30" aria-hidden />
        <div className="absolute inset-0 translate-x-0.5 translate-y-0.5 rounded-lg bg-muted/40 border border-border/20" aria-hidden />
        <div
          className="absolute inset-0 overflow-hidden rounded-lg bg-muted transition-shadow"
          style={{ boxShadow: "0 1px 4px hsl(var(--foreground)/0.12), 0 0 0 1px hsl(var(--border)/0.6)" }}
        >
          {coverWrapEl}
          <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-foreground/5 pointer-events-none" aria-hidden />
          {showAgeGate && (
            <>
              <div className="absolute inset-0 bg-red-900/25 pointer-events-none" aria-hidden />
              <span className="absolute top-1.5 left-1.5 z-10 rounded border border-red-400/60 bg-red-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white pointer-events-none tracking-wide">R-18</span>
            </>
          )}
        </div>
        <div className="absolute top-1.5 right-1.5 z-10 flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 backdrop-blur-sm">
          <Layers className="w-3 h-3 text-white/80" aria-hidden />
          <span className="text-[10px] font-semibold text-white/90 leading-none">{chapterCount}</span>
        </div>
      </div>

      {/* Meta */}
      <div className="pt-2.5 space-y-1">
        <p className="[font-size:var(--public-font-caption)] text-primary font-medium flex items-center gap-1">
          <Layers className="w-3 h-3" aria-hidden />
          系列
        </p>
        <h2 className="font-serif [font-size:var(--public-font-card-title)] font-semibold leading-snug line-clamp-2">
          <a href={href} className="text-foreground group-hover:text-primary transition-colors no-underline">
            {name}
          </a>
        </h2>

        {authorEl}

        {cardSummary && (
          <p className="[font-size:var(--public-font-meta)] [line-height:var(--public-line-body)] text-muted-foreground line-clamp-2">{cardSummary}</p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-2">
          <span className="[font-size:var(--public-font-meta)] text-muted-foreground">
            {chapterCount} 部
          </span>
          {updatedLabel && (
            <span className="[font-size:var(--public-font-caption)] text-muted-foreground">
              更新 {updatedLabel}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export const SeriesGalleryCard = React.memo(SeriesGalleryCardInner);
