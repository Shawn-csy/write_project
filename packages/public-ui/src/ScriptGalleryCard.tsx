import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Eye, Heart, ChevronRight } from "lucide-react";
import { CoverPlaceholder } from "./cover/CoverPlaceholder";
import { CoverRenderer } from "./cover/CoverRenderer";
import type { CoverDesign } from "./cover/types";
import type { MediaCropLike as CropRef } from "@write/media-crop";
import { getMediaCropStyle } from "@write/media-crop";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface TagLike {
  id?: string;
  name?: string;
}

export interface AuthorInfo {
  id?: string;
  displayName?: string;
  avatarUrl?: string;
  avatar?: string;
  avatarCrop?: CropRef | null;
}

export interface ScriptGalleryItem {
  id: string;
  title?: string;
  author?: string | AuthorInfo | null;
  coverUrl?: string | null;
  coverDesign?: CoverDesign | null;
  coverCrop?: CropRef | null;
  tags?: Array<string | TagLike>;
  views?: number;
  likes?: number;
  contentLength?: number;
  isLiked?: boolean;
  _disableAuthorLink?: boolean;
  seriesName?: string;
  _seriesName?: string;
  seriesOrder?: number | string | null;
  _seriesOrder?: number | string | null;
  _derivedLicenseTags?: Array<string | TagLike>;
}

/**
 * Host provides resolved hrefs for navigation targets.
 * When a href is provided, the element renders as <a>.
 * When an action callback is provided, it renders as <button>.
 * When neither, it renders as static text.
 */
export interface PublicLinkConfig {
  /** href for the script read page (renders cover + title as <a>) */
  scriptHref?: string;
  /** href for the author page */
  authorHref?: string;
  /** href for the series page */
  seriesHref?: string;
  /** href builder for tag pages */
  tagHref?: (tag: string) => string;
  /** Fallback callbacks when hrefs are not available */
  onNavigate?: (id: string) => void;
  onAuthorClick?: (authorId: string) => void;
  onSeriesClick?: (seriesName: string) => void;
  onTagClick?: (tag: string) => void;
  /** Record a view — fire and forget */
  onView?: (id: string) => void;
  /** Toggle like */
  onLike?: (id: string, currentLiked: boolean) => Promise<{ liked: boolean; likes: number }> | void;
}

export interface ScriptGalleryCardProps extends PublicLinkConfig {
  script: ScriptGalleryItem;
  variant?: "standard" | "compact";
  // Legacy compat — map to PublicLinkConfig internally
  href?: string;
  authorHref?: string;
  seriesHref?: string;
  /** Show R-18 age gate indicator over the cover */
  showAgeGate?: boolean;
}

// ─── Internal author badge ─────────────────────────────────────────────────

interface AuthorBadgeInternalProps {
  author: AuthorInfo | string | undefined;
  authorHref?: string;
  onAuthorClick?: () => void;
}

function AuthorBadgeInternal({ author, authorHref, onAuthorClick }: AuthorBadgeInternalProps) {
  const displayName = typeof author === "object" ? author?.displayName : author;
  const avatarUrl = typeof author === "object" ? (author?.avatarUrl || author?.avatar || "") : "";
  const cropAvatar = getMediaCropStyle(
    String(avatarUrl || ""),
    typeof author === "object" ? author?.avatarCrop ?? null : null,
  );

  const avatarEl = avatarUrl ? (
    <img src={cropAvatar.src} style={cropAvatar.style as React.CSSProperties} alt={displayName} className="w-4 h-4 rounded-full object-cover" />
  ) : (
    <span className="w-3.5 h-3.5 inline-block" aria-hidden />
  );

  const nameEl = <span className="font-medium">{displayName || "未知作者"}</span>;

  const baseClass = "flex items-center gap-1.5 text-xs text-muted-foreground transition-colors bg-muted/40 px-2 py-1 rounded-full";

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

// ─── Shared sub-elements ────────────────────────────────────────────────────

interface TagsProps {
  primaryTags: string[];
  secondaryTags: string[];
  totalCount: number;
  tagHref?: (tag: string) => string;
  onTagClick?: (tag: string) => void;
  compact?: boolean;
}

function Tags({ primaryTags, secondaryTags, totalCount, tagHref, onTagClick, compact }: TagsProps) {
  if (primaryTags.length === 0) return null;

  const renderTag = (tag: string, key: string, hidden?: boolean) => {
    const cls = `${hidden ? "hidden sm:inline-flex" : ""} max-w-[110px] px-1.5 py-0 h-5 text-[10px] font-normal border border-primary/20 text-muted-foreground rounded-full truncate`;
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
      <span className="text-[10px] text-muted-foreground line-clamp-1">
        {primaryTags.join(" · ")}
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1 pt-1">
      {primaryTags.map((tag, i) => renderTag(tag, `p-${i}`))}
      {secondaryTags.map((tag, i) => renderTag(tag, `s-${i}`, true))}
      {totalCount > 2 && <span className="sm:hidden text-[10px] text-muted-foreground self-center">+{totalCount - 2}</span>}
      {totalCount > 3 && <span className="hidden sm:inline text-[10px] text-muted-foreground self-center">+{totalCount - 3}</span>}
    </div>
  );
}

// ─── Main card ──────────────────────────────────────────────────────────────

function ScriptGalleryCardInner({
  script,
  variant = "standard",
  onNavigate,
  onSeriesClick,
  onTagClick,
  onAuthorClick,
  onLike,
  onView,
  href,
  authorHref,
  seriesHref,
  tagHref,
  showAgeGate = false,
}: ScriptGalleryCardProps): React.JSX.Element {
  const { id, title, author, coverUrl, coverDesign, tags = [], views = 0, likes = 0, contentLength } = script;

  const cropCover = getMediaCropStyle(String(coverUrl || ""), script.coverCrop ?? null);

  const estDurationMinutes = contentLength && contentLength > 0
    ? Math.round(contentLength / 2 / 200)
    : null;

  const authorId = typeof author === "object" ? author?.id : undefined;
  const resolvedAuthorHref = script._disableAuthorLink ? undefined : authorHref;
  const resolvedAuthorClick = (!script._disableAuthorLink && !resolvedAuthorHref && onAuthorClick && authorId)
    ? () => onAuthorClick(authorId)
    : undefined;

  const { seriesName, seriesOrderText, primaryTags, secondaryTags, displayTags } = useMemo(() => {
    const sName = String(script.seriesName || script._seriesName || "").trim();
    const seriesOrderRaw = script.seriesOrder ?? script._seriesOrder;
    const parsedSeriesOrder = Number(seriesOrderRaw);
    const hasSeriesOrder = Number.isFinite(parsedSeriesOrder) && parsedSeriesOrder >= 0;
    const sOrderText = !hasSeriesOrder ? "" : Math.floor(parsedSeriesOrder) === 0 ? " · 設定/背景" : ` · 第 ${Math.floor(parsedSeriesOrder)} 作`;
    const normalizedTags = (tags || [])
      .map((tag) => (typeof tag === "string" ? tag : tag?.name))
      .filter((tag): tag is string => Boolean(tag));
    const licenseTags = (script._derivedLicenseTags || [])
      .map((tag) => (typeof tag === "string" ? tag : tag?.name))
      .filter((tag): tag is string => Boolean(tag));
    const licenseTagSet = new Set(licenseTags);
    const dTags = normalizedTags.filter((tag) => !licenseTagSet.has(tag));
    return {
      seriesName: sName,
      seriesOrderText: sOrderText,
      displayTags: dTags,
      primaryTags: dTags.slice(0, 2),
      secondaryTags: dTags.slice(2, 3),
    };
  }, [tags, script._derivedLicenseTags, script.seriesName, script._seriesName, script.seriesOrder, script._seriesOrder]);

  const [isLiked, setIsLiked] = useState<boolean>(script.isLiked ?? false);
  const [likeCount, setLikeCount] = useState<number>(likes);

  useEffect(() => {
    setLikeCount(likes);
    setIsLiked(script.isLiked ?? false);
  }, [likes, script.isLiked]);

  const handleLike = useCallback(async (e: React.MouseEvent<HTMLButtonElement>): Promise<void> => {
    e.stopPropagation();
    if (!onLike) return;
    const newState = !isLiked;
    setIsLiked(newState);
    setLikeCount((prev) => newState ? prev + 1 : prev - 1);
    const result = await onLike(id, isLiked);
    if (result) {
      setIsLiked(result.liked);
      setLikeCount(result.likes);
    }
  }, [id, isLiked, onLike]);

  // Cover: <a> if href, else plain div (card itself is clickable via onNavigate)
  const coverEl = coverUrl ? (
    <img
      src={cropCover.src}
      style={cropCover.style as React.CSSProperties}
      alt={title}
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      loading="lazy"
    />
  ) : coverDesign ? (
    <CoverRenderer design={coverDesign} title={title ?? ""} compact responsive className="h-full w-full" />
  ) : (
    <CoverPlaceholder title={title} compact />
  );

  const coverLinkEl = href ? (
    <a href={href} tabIndex={-1} aria-hidden className="block w-full h-full" onClick={() => onView?.(id)}>
      {coverEl}
    </a>
  ) : (
    coverEl
  );

  // Series element — <a> or <button>
  const seriesEl = seriesName ? (
    seriesHref ? (
      <a href={seriesHref} className="text-[11px] text-muted-foreground line-clamp-1 hover:text-primary no-underline">
        {seriesName}{seriesOrderText}
      </a>
    ) : onSeriesClick ? (
      <button
        type="button"
        className="text-[11px] text-muted-foreground line-clamp-1 hover:text-primary bg-transparent border-none cursor-pointer text-left p-0"
        onClick={(e) => { e.stopPropagation(); onSeriesClick(seriesName); }}
      >
        {seriesName}{seriesOrderText}
      </button>
    ) : (
      <span className="text-[11px] text-muted-foreground line-clamp-1">{seriesName}{seriesOrderText}</span>
    )
  ) : null;

  // Like button — always <button>, disabled when no handler
  const likeEl = (
    <button
      type="button"
      className={`flex items-center gap-1 bg-transparent border-none p-0 ${onLike ? "cursor-pointer transition-colors" : "cursor-default"} ${isLiked ? "text-destructive" : "hover:text-foreground"}`}
      onClick={onLike ? handleLike : undefined}
      disabled={!onLike}
      aria-label={isLiked ? "取消喜歡" : "喜歡"}
      aria-pressed={isLiked}
    >
      <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-current" : ""}`} />
      <span>{likeCount.toLocaleString()}</span>
    </button>
  );

  const authorEl = (
    <AuthorBadgeInternal
      author={author ?? undefined}
      authorHref={resolvedAuthorHref}
      onAuthorClick={resolvedAuthorClick}
    />
  );

  const ARTICLE_CLASS = "group relative rounded-xl border border-transparent bg-transparent px-2 pb-2 pt-1 shadow-none hover:-translate-y-0.5 hover:border-primary/60 hover:bg-muted/25 hover:shadow-md transition-all duration-200";

  // ── Compact variant ──
  // DOM contract: <article> root, title is <a> with stretched-link (::before covers article),
  // cover is aria-hidden decorative <a>, author/series/tags are z-10 siblings above the link.
  if (variant === "compact") {
    const handleArticleClick = !href
      ? () => { onView?.(id); onNavigate?.(id); }
      : undefined;

    return (
      <article
        className={`group relative rounded-xl bg-transparent transition-all duration-200 ${!href ? "cursor-pointer" : ""}`}
        onClick={handleArticleClick}
      >
        <div className="mx-2 my-0.5 flex items-stretch gap-3 rounded-lg pl-0 pr-3 py-2 border-l-[3px] border-l-transparent transition-all duration-200 group-hover:border-l-primary group-hover:bg-primary/5">
          {/* Cover */}
          <div className="w-[40px] shrink-0 ml-3">
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-sm border border-border/40 bg-muted/25 shadow-sm transition-transform duration-300 group-hover:scale-105">
              {href ? (
                <a href={href} tabIndex={-1} aria-hidden className="block w-full h-full" onClick={() => onView?.(id)}>
                  {coverEl}
                </a>
              ) : coverEl}
              {showAgeGate && (
                <>
                  <div className="absolute inset-0 bg-red-900/25 pointer-events-none" aria-hidden />
                  <span className="absolute top-0.5 left-0.5 z-10 rounded-[2px] bg-red-600 border border-red-400/60 px-1 py-px text-[8px] font-bold leading-none text-white pointer-events-none tracking-wide">R18</span>
                </>
              )}
            </div>
          </div>
          {/* Meta */}
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0 text-sm font-semibold leading-tight text-foreground line-clamp-1 transition-colors duration-200 group-hover:text-primary">
                {href ? (
                  <a
                    href={href}
                    className="text-inherit no-underline before:absolute before:inset-0 before:z-0"
                    onClick={() => onView?.(id)}
                  >
                    {title}
                  </a>
                ) : title}
              </div>
              <div className="relative z-10 shrink-0 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Eye className="h-3 w-3" aria-hidden />
                  <span>{views.toLocaleString()}</span>
                </span>
              </div>
            </div>
            <div className="relative z-10 min-w-0 flex items-center gap-2">
              {authorEl}
              {seriesEl}
              {!seriesName && (
                <Tags
                  primaryTags={primaryTags}
                  secondaryTags={[]}
                  totalCount={displayTags.length}
                  tagHref={tagHref}
                  onTagClick={onTagClick}
                  compact
                />
              )}
              <ChevronRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-1 group-hover:text-primary" aria-hidden />
            </div>
          </div>
        </div>
      </article>
    );
  }

  // ── Standard variant ──
  const handleArticleClick = !href
    ? () => { onView?.(id); onNavigate?.(id); }
    : undefined;

  return (
    <article
      className={`${ARTICLE_CLASS} ${!href ? "cursor-pointer" : ""}`}
      onClick={handleArticleClick}
    >
      {/* Cover */}
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted shadow-sm group-hover:shadow-md transition-shadow">
        {coverLinkEl}
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-primary/10 pointer-events-none" aria-hidden />
        {showAgeGate && (
          <>
            <div className="absolute inset-0 bg-red-900/25 pointer-events-none" aria-hidden />
            <span className="absolute top-1.5 left-1.5 z-10 rounded border border-red-400/60 bg-red-600 px-1.5 py-0.5 text-[11px] font-bold leading-none text-white pointer-events-none tracking-wide">R-18</span>
          </>
        )}
      </div>

      {/* Meta */}
      <div className="pt-2.5 space-y-1">
        <h3 className="font-serif text-sm md:text-base font-semibold leading-snug line-clamp-2">
          {href ? (
            <a href={href} className="text-foreground group-hover:text-primary transition-colors no-underline" onClick={() => onView?.(id)}>
              {title}
            </a>
          ) : (
            <span className="text-foreground group-hover:text-primary transition-colors">{title}</span>
          )}
        </h3>

        <div className="pt-1">{authorEl}</div>

        {seriesEl}

        <Tags
          primaryTags={primaryTags}
          secondaryTags={secondaryTags}
          totalCount={displayTags.length}
          tagHref={tagHref}
          onTagClick={onTagClick}
        />

        <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-2">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" aria-hidden />
              <span>{views.toLocaleString()}</span>
            </div>
            {likeEl}
          </div>
          {estDurationMinutes !== null && estDurationMinutes > 0 && (
            <span className="text-[10px] text-muted-foreground/70">
              ⏱ {estDurationMinutes < 1 ? "< 1 分" : `約 ${estDurationMinutes} 分`}
            </span>
          )}
        </div>
      </div>
    </article>
  );
}

export const ScriptGalleryCard = React.memo(ScriptGalleryCardInner);
