/**
 * ScriptGalleryCardFrame — pure presentational component.
 *
 * No hooks, no "use client", no context. Can be rendered by both server
 * components and client components. All interactive behavior (like state,
 * hover preview, pointer tilt) is injected via props by the client wrapper.
 *
 * This is the single source of truth for card DOM structure and styling.
 * ScriptGalleryCard (client wrapper) and server-side gallery renderers
 * both use this component.
 */

import React from "react";
import { Eye, Heart, ChevronRight } from "lucide-react";
import { CoverPlaceholder } from "./cover/CoverPlaceholder";
import type { CoverDesign } from "./cover/types";
import type { MediaCropLike as CropRef } from "@write/media-crop";
import { getMediaCropStyle } from "@write/media-crop";
// ─── Cover image renderer (defined here so Frame stays server-safe) ──────────

export interface CoverImageRendererProps {
  src: string;
  crop: import("@write/media-crop").MediaCropLike | null;
  alt: string;
  className?: string;
}
export type CoverImageRenderer = (props: CoverImageRendererProps) => React.ReactNode;

// ─── Resolved display model ─────────────────────────────────────────────────

export interface CardAuthorDisplay {
  displayName?: string;
  avatarUrl?: string;
  avatarCrop?: CropRef | null;
}

export interface ScriptGalleryCardFrameProps {
  id: string;
  title?: string;
  variant?: "standard" | "compact";

  // Cover
  coverUrl?: string | null;
  coverDesign?: CoverDesign | null;
  coverCrop?: CropRef | null;
  coverImageRenderer?: CoverImageRenderer;
  /** Render a CoverDesign cover. Injected by client wrapper so Frame stays server-safe (no hook imports). */
  coverDesignRenderer?: (design: CoverDesign, title: string) => React.ReactNode;
  showAgeGate?: boolean;

  // Author
  author?: CardAuthorDisplay | null;
  authorHref?: string;
  onAuthorClick?: () => void;

  // Series
  seriesName?: string;
  seriesOrderText?: string;
  seriesHref?: string;
  onSeriesClick?: () => void;

  // Tags
  primaryTags?: string[];
  secondaryTags?: string[];
  totalTagCount?: number;
  tagHref?: (tag: string) => string;
  onTagClick?: (tag: string) => void;

  // Summary
  cardSummary?: string;

  // Stats
  views?: number;
  likeCount?: number;
  isLiked?: boolean;
  estDurationMinutes?: number | null;
  onLikeClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;

  // Navigation
  href?: string;
  onArticleClick?: () => void;
  onViewTrack?: () => void;

  // Injected interactive behaviors (from client wrapper)
  /** Extra props spread on <article> — e.g. hover preview onMouseEnter/Leave/Move */
  articleProps?: React.HTMLAttributes<HTMLElement>;
  /** Extra props spread on cover container — e.g. pointer tilt onPointerMove/Leave */
  coverContainerProps?: React.HTMLAttributes<HTMLDivElement> & { style?: React.CSSProperties };
}

// ─── Internal sub-components ─────────────────────────────────────────────────

function AuthorBadge({
  author,
  authorHref,
  onAuthorClick,
}: {
  author?: CardAuthorDisplay | null;
  authorHref?: string;
  onAuthorClick?: () => void;
}) {
  const displayName = author?.displayName;
  const avatarUrl = author?.avatarUrl || "";
  const cropAvatar = getMediaCropStyle(
    String(avatarUrl || ""),
    author?.avatarCrop ?? null,
  );

  const avatarEl = avatarUrl ? (
    <img src={cropAvatar.src} style={cropAvatar.style as React.CSSProperties} alt="" className="w-4 h-4 rounded-full object-cover" aria-hidden="true" />
  ) : (
    <span className="w-3.5 h-3.5 inline-block" aria-hidden />
  );

  const nameEl = <span className="font-medium">{displayName || "未知作者"}</span>;

  const baseClass = "flex items-center gap-1.5 [font-size:var(--public-font-meta)] text-muted-foreground transition-colors";

  if (authorHref) {
    return (
      <a href={authorHref} className={`${baseClass} cursor-pointer hover:text-foreground hover:bg-muted no-underline`}>
        {avatarEl}
        {nameEl}
      </a>
    );
  }
  if (onAuthorClick) {
    return (
      <button
        type="button"
        className={`${baseClass} border-none bg-transparent p-0 cursor-pointer hover:text-foreground hover:bg-muted`}
        onClick={(e) => { e.stopPropagation(); onAuthorClick(); }}
      >
        {avatarEl}
        {nameEl}
      </button>
    );
  }
  return (
    <span className={`${baseClass} cursor-default`}>
      {avatarEl}
      {nameEl}
    </span>
  );
}

function Tags({
  primaryTags,
  secondaryTags,
  totalCount,
  tagHref,
  onTagClick,
  compact,
}: {
  primaryTags: string[];
  secondaryTags: string[];
  totalCount: number;
  tagHref?: (tag: string) => string;
  onTagClick?: (tag: string) => void;
  compact?: boolean;
}) {
  if (primaryTags.length === 0) return null;

  const renderTag = (tag: string, key: string, hidden?: boolean) => {
    const cls = `${hidden ? "hidden sm:inline-flex" : ""} max-w-[110px] px-1.5 py-0 h-5 [font-size:var(--public-font-caption)] font-normal text-muted-foreground rounded-[4px] truncate` + " " + "border border-border/40 bg-muted/40";
    if (tagHref) {
      return <a key={key} href={tagHref(tag)} className={`${cls} hover:bg-secondary no-underline`} title={tag}>{tag}</a>;
    }
    if (onTagClick) {
      return (
        <button key={key} type="button" className={`${cls} bg-transparent hover:bg-secondary cursor-pointer`} onClick={(e) => { e.stopPropagation(); onTagClick(tag); }} title={tag}>
          {tag}
        </button>
      );
    }
    return <span key={key} className={`${cls} bg-transparent`} title={tag}>{tag}</span>;
  };

  if (compact) {
    return (
      <span className="[font-size:var(--public-font-caption)] text-muted-foreground line-clamp-1">
        {primaryTags.join(" · ")}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 pt-1">
      {primaryTags.map((tag, i) => renderTag(tag, `p-${i}`))}
      {secondaryTags.map((tag, i) => renderTag(tag, `s-${i}`, true))}
      {totalCount > 2 && <span className="sm:hidden [font-size:var(--public-font-caption)] text-muted-foreground self-center">+{totalCount - 2}</span>}
      {totalCount > 3 && <span className="hidden sm:inline [font-size:var(--public-font-caption)] text-muted-foreground self-center">+{totalCount - 3}</span>}
    </div>
  );
}

// ─── Cover element ───────────────────────────────────────────────────────────

function CoverElement({
  coverUrl,
  coverDesign,
  coverCrop,
  coverImageRenderer,
  coverDesignRenderer,
  title,
}: {
  coverUrl?: string | null;
  coverDesign?: CoverDesign | null;
  coverCrop?: CropRef | null;
  coverImageRenderer?: CoverImageRenderer;
  coverDesignRenderer?: (design: CoverDesign, title: string) => React.ReactNode;
  title?: string;
}) {
  if (coverUrl) {
    if (coverImageRenderer) {
      return coverImageRenderer({
        src: coverUrl,
        crop: coverCrop ?? null,
        alt: title ?? "",
        className: "h-full w-full object-cover transition-transform duration-500 group-hover:scale-105",
      });
    }
    const cropCover = getMediaCropStyle(String(coverUrl), coverCrop ?? null);
    return (
      <img
        src={cropCover.src}
        style={cropCover.style as React.CSSProperties}
        alt={title}
        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        loading="lazy"
        sizes="(max-width: 640px) 45vw, (max-width: 1024px) 25vw, 180px"
      />
    );
  }
  if (coverDesign) {
    if (coverDesignRenderer) return coverDesignRenderer(coverDesign, title ?? "");
    // Fallback: CoverPlaceholder when no client-side CoverRenderer is injected (server path)
    return <CoverPlaceholder title={title} compact />;
  }
  return <CoverPlaceholder title={title} compact />;
}

// ─── Series badge ─────────────────────────────────────────────────────────────

function SeriesBadge({
  seriesName,
  seriesOrderText,
  seriesHref,
  onSeriesClick,
}: {
  seriesName?: string;
  seriesOrderText?: string;
  seriesHref?: string;
  onSeriesClick?: () => void;
}) {
  if (!seriesName) return null;

  const content = (
    <span className="inline-flex max-w-[calc(100%-8px)] items-center rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium leading-none text-white/90 backdrop-blur-sm truncate">
      {seriesName}{seriesOrderText}
    </span>
  );

  return (
    <div className="absolute bottom-1.5 left-1.5 z-10 max-w-[calc(100%-8px)]">
      {seriesHref ? (
        <a
          href={seriesHref}
          className="inline-flex max-w-full no-underline"
          onClick={(e) => e.stopPropagation()}
          aria-label={`系列：${seriesName}`}
        >
          {content}
        </a>
      ) : onSeriesClick ? (
        <button
          type="button"
          className="inline-flex max-w-full bg-transparent border-none p-0 cursor-pointer"
          onClick={(e) => { e.stopPropagation(); onSeriesClick(); }}
          aria-label={`系列：${seriesName}`}
        >
          {content}
        </button>
      ) : (
        <span aria-label={`系列：${seriesName}`}>{content}</span>
      )}
    </div>
  );
}

// ─── Age gate overlay ─────────────────────────────────────────────────────────

function AgeGateOverlay({ variant }: { variant: "standard" | "compact" }) {
  const badgeClass = variant === "compact"
    ? "absolute top-0.5 left-0.5 z-10 rounded-[2px] bg-red-600 border border-red-400/60 px-1 py-px text-[8px] font-bold leading-none text-white pointer-events-none tracking-wide"
    : "absolute top-1.5 left-1.5 z-10 rounded border border-red-400/60 bg-red-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white pointer-events-none tracking-wide";
  const label = variant === "compact" ? "R18" : "R-18";
  return (
    <>
      <div className="absolute inset-0 bg-red-900/25 pointer-events-none" aria-hidden />
      <span className={badgeClass}>{label}</span>
    </>
  );
}

// ─── Main Frame ──────────────────────────────────────────────────────────────

const ARTICLE_CLASS = "group relative rounded-xl border border-transparent bg-transparent px-2 pb-2 pt-1 shadow-none hover:-translate-y-[3px] hover:border-border hover:bg-card hover:shadow-[0_4px_16px_hsl(var(--foreground)/0.07),0_1px_3px_hsl(var(--foreground)/0.05)] transition-all duration-200 cursor-default";

function ScriptGalleryCardFrameInner(props: ScriptGalleryCardFrameProps) {
  const {
    id,
    title,
    variant = "standard",
    coverUrl,
    coverDesign,
    coverCrop,
    coverImageRenderer,
    coverDesignRenderer,
    showAgeGate = false,
    author,
    authorHref,
    onAuthorClick,
    seriesName,
    seriesOrderText = "",
    seriesHref,
    onSeriesClick,
    primaryTags = [],
    secondaryTags = [],
    totalTagCount = 0,
    tagHref,
    onTagClick,
    cardSummary,
    views = 0,
    likeCount = 0,
    isLiked = false,
    estDurationMinutes,
    onLikeClick,
    href,
    onArticleClick,
    onViewTrack,
    articleProps,
    coverContainerProps,
  } = props;

  const coverEl = (
    <CoverElement
      coverUrl={coverUrl}
      coverDesign={coverDesign}
      coverCrop={coverCrop}
      coverImageRenderer={coverImageRenderer}
      coverDesignRenderer={coverDesignRenderer}
      title={title}
    />
  );

  const coverLinkEl = href ? (
    <a href={href} tabIndex={-1} aria-hidden className="block w-full h-full" onClick={() => onViewTrack?.()}>
      {coverEl}
    </a>
  ) : coverEl;

  const seriesBadgeEl = (
    <SeriesBadge
      seriesName={seriesName}
      seriesOrderText={seriesOrderText}
      seriesHref={seriesHref}
      onSeriesClick={onSeriesClick}
    />
  );

  const authorEl = (
    <AuthorBadge
      author={author}
      authorHref={authorHref}
      onAuthorClick={onAuthorClick}
    />
  );

  const likeEl = (
    <button
      type="button"
      className={`flex items-center gap-1 bg-transparent border-none p-0 ${onLikeClick ? "cursor-pointer transition-colors" : "cursor-default"} ${isLiked ? "text-destructive" : "hover:text-foreground"}`}
      onClick={onLikeClick}
      disabled={!onLikeClick}
      aria-label={isLiked ? `取消喜歡（${likeCount}）` : `喜歡（${likeCount}）`}
      aria-pressed={isLiked}
    >
      <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-current" : ""}`} aria-hidden="true" />
      <span aria-hidden="true">{likeCount.toLocaleString()}</span>
    </button>
  );

  // ── Compact variant ──
  if (variant === "compact") {
    return (
      <article
        className={`group relative rounded-xl bg-transparent transition-all duration-200 ${!href ? "cursor-pointer" : ""}`}
        onClick={onArticleClick}
        {...articleProps}
      >
        <div className="mx-1 my-0.5 flex items-stretch gap-3 rounded-lg pl-0 pr-3 py-2 border-l-2 border-l-transparent transition-all duration-150 group-hover:border-l-primary/70 group-hover:bg-muted/50">
          {/* Cover */}
          <div className="w-[40px] shrink-0 ml-3">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-sm border border-border/40 bg-muted/25 shadow-sm transition-transform duration-300 group-hover:scale-105">
              {href ? (
                <a href={href} tabIndex={-1} aria-hidden className="block w-full h-full" onClick={() => onViewTrack?.()}>
                  {coverEl}
                </a>
              ) : coverEl}
              {showAgeGate && <AgeGateOverlay variant="compact" />}
              {seriesBadgeEl}
            </div>
          </div>
          {/* Meta */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0 [font-size:var(--public-font-card-title)] font-semibold leading-tight text-foreground line-clamp-1 transition-colors duration-200 group-hover:text-primary">
                {href ? (
                  <a
                    href={href}
                    className="text-inherit no-underline before:absolute before:inset-0 before:z-0"
                    onClick={() => onViewTrack?.()}
                  >
                    {title}
                  </a>
                ) : title}
              </div>
              <div className="relative z-10 shrink-0 [font-size:var(--public-font-caption)] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3 w-3" aria-hidden />
                  <span>{views.toLocaleString()}</span>
                </span>
              </div>
            </div>
            <div className="relative z-10 min-w-0 flex items-center gap-2">
              {authorEl}
              {!seriesName && (
                <Tags
                  primaryTags={primaryTags}
                  secondaryTags={[]}
                  totalCount={totalTagCount}
                  tagHref={tagHref}
                  onTagClick={onTagClick}
                  compact
                />
              )}
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-1 group-hover:text-primary" aria-hidden />
            </div>
            {cardSummary && (
              <p className="relative z-10 [font-size:var(--public-font-meta)] [line-height:var(--public-line-body)] text-muted-foreground line-clamp-2">
                {cardSummary}
              </p>
            )}
          </div>
        </div>
      </article>
    );
  }

  // ── Standard variant ──
  return (
    <article
      className={`${ARTICLE_CLASS} ${!href ? "cursor-pointer" : ""}`}
      onClick={onArticleClick}
      {...articleProps}
    >
      {/* Cover */}
      <div
        className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted transition-all duration-300"
        style={{
          transformStyle: "preserve-3d",
          willChange: "transform",
          boxShadow: "0 1px 4px hsl(var(--foreground)/0.12), 0 0 0 1px hsl(var(--border)/0.6)",
          ...coverContainerProps?.style,
        }}
        {...(coverContainerProps ? { onPointerMove: coverContainerProps.onPointerMove, onPointerLeave: coverContainerProps.onPointerLeave } : {})}
      >
        {coverLinkEl}
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-foreground/5 pointer-events-none" aria-hidden />
        {showAgeGate && <AgeGateOverlay variant="standard" />}
        {seriesBadgeEl}
      </div>

      {/* Meta */}
      <div className="pt-2.5 space-y-1">
        <h2 className="font-serif [font-size:var(--public-font-card-title)] font-semibold leading-snug line-clamp-2">
          {href ? (
            <a href={href} className="text-foreground group-hover:text-primary transition-colors no-underline" onClick={() => onViewTrack?.()}>
              {title}
            </a>
          ) : (
            <span className="text-foreground group-hover:text-primary transition-colors">{title}</span>
          )}
        </h2>

        <div className="pt-1">{authorEl}</div>

        {cardSummary && (
          <p className="[font-size:var(--public-font-meta)] [line-height:var(--public-line-body)] text-muted-foreground line-clamp-2">
            {cardSummary}
          </p>
        )}

        <Tags
          primaryTags={primaryTags}
          secondaryTags={secondaryTags}
          totalCount={totalTagCount}
          tagHref={tagHref}
          onTagClick={onTagClick}
        />

        <div
          className="flex items-center justify-between pt-2 mt-2"
          style={{ borderTop: "1px solid hsl(var(--border) / 0.45)" }}
        >
          <div className="flex items-center gap-3 [font-size:var(--public-font-meta)] text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="w-3 h-3" aria-hidden />
              <span>{views.toLocaleString()}</span>
            </div>
            {likeEl}
          </div>
          {estDurationMinutes != null && estDurationMinutes > 0 && (
            <span className="[font-size:var(--public-font-caption)] text-muted-foreground">
              {estDurationMinutes < 1 ? "< 1 分" : `${estDurationMinutes} 分`}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export const ScriptGalleryCardFrame = React.memo(ScriptGalleryCardFrameInner);
