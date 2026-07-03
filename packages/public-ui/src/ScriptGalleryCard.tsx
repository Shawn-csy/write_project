import React, { useState, useEffect, useCallback, useMemo } from "react";
import type { CoverDesign } from "./cover/types";
import type { MediaCropLike as CropRef } from "@write/media-crop";
import { normalizeOutlineText, truncateCardText } from "./gallery/cardText";
import { useGalleryHoverPreview } from "./gallery/GalleryHoverPreview";
import { CoverRenderer } from "./cover/CoverRenderer";
import { ScriptGalleryCardFrame } from "./ScriptGalleryCardFrame";
import type { CardAuthorDisplay, CoverImageRenderer } from "./ScriptGalleryCardFrame";
export type { CoverImageRenderer, CoverImageRendererProps } from "./ScriptGalleryCardFrame";

// ─── Types (public API — unchanged) ─────────────────────────────────────────

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
  synopsis?: string | null;
  outline?: string | null;
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
  _cardSummary?: string;
  _hoverOutline?: string;
}

export interface PublicLinkConfig {
  scriptHref?: string;
  authorHref?: string;
  seriesHref?: string;
  tagHref?: (tag: string) => string;
  onNavigate?: (id: string) => void;
  onAuthorClick?: (authorId: string) => void;
  onSeriesClick?: (seriesName: string) => void;
  onTagClick?: (tag: string) => void;
  onView?: (id: string) => void;
  onLike?: (id: string, currentLiked: boolean) => Promise<{ liked: boolean; likes: number }> | void;
}

export interface ScriptGalleryCardProps extends PublicLinkConfig {
  script: ScriptGalleryItem;
  variant?: "standard" | "compact";
  showAgeGate?: boolean;
  coverImageRenderer?: CoverImageRenderer;
}

// Module-level stable renderer — CoverRenderer is a client component, injected into Frame via slot.
const renderCoverDesign = (design: CoverDesign, title: string) => (
  <CoverRenderer design={design} title={title} compact responsive className="h-full w-full" />
);

// ─── Tag/series resolution (pure) ────────────────────────────────────────────

function resolveTagsAndSeries(script: ScriptGalleryItem) {
  const seriesName = String(script.seriesName || script._seriesName || "").trim();
  const seriesOrderRaw = script.seriesOrder ?? script._seriesOrder;
  const parsedSeriesOrder = Number(seriesOrderRaw);
  const hasSeriesOrder = Number.isFinite(parsedSeriesOrder) && parsedSeriesOrder >= 0;
  const seriesOrderText = !hasSeriesOrder ? "" : Math.floor(parsedSeriesOrder) === 0 ? " · 設定/背景" : ` · 第 ${Math.floor(parsedSeriesOrder)} 作`;

  const normalizedTags = (script.tags || [])
    .map((tag) => (typeof tag === "string" ? tag : tag?.name))
    .filter((tag): tag is string => Boolean(tag));
  const licenseTags = (script._derivedLicenseTags || [])
    .map((tag) => (typeof tag === "string" ? tag : tag?.name))
    .filter((tag): tag is string => Boolean(tag));
  const licenseTagSet = new Set(licenseTags);
  const displayTags = normalizedTags.filter((tag) => !licenseTagSet.has(tag));

  return {
    seriesName,
    seriesOrderText,
    displayTags,
    primaryTags: displayTags.slice(0, 2),
    secondaryTags: displayTags.slice(2, 3),
  };
}

// ─── Main client wrapper ─────────────────────────────────────────────────────

function ScriptGalleryCardInner({
  script,
  variant = "standard",
  onNavigate,
  onSeriesClick,
  onTagClick,
  onAuthorClick,
  onLike,
  onView,
  scriptHref: href,
  authorHref,
  seriesHref,
  tagHref,
  showAgeGate = false,
  coverImageRenderer,
}: ScriptGalleryCardProps): React.JSX.Element {
  const { id, title, author, coverUrl, coverDesign, views = 0, likes = 0, contentLength } = script;

  const estDurationMinutes = contentLength && contentLength > 0
    ? Math.round(contentLength / 2 / 200)
    : null;

  const authorId = typeof author === "object" ? author?.id : undefined;
  const resolvedAuthorHref = script._disableAuthorLink ? undefined : authorHref;
  const resolvedAuthorClick = (!script._disableAuthorLink && !resolvedAuthorHref && onAuthorClick && authorId)
    ? () => onAuthorClick(authorId)
    : undefined;

  const { seriesName, seriesOrderText, displayTags, primaryTags, secondaryTags } = useMemo(
    () => resolveTagsAndSeries(script),
    [script.tags, script._derivedLicenseTags, script.seriesName, script._seriesName, script.seriesOrder, script._seriesOrder]
  );

  const [isLiked, setIsLiked] = useState<boolean>(script.isLiked ?? false);
  const [likeCount, setLikeCount] = useState<number>(likes);
  const cardSummary = truncateCardText(script._cardSummary || script.synopsis || "");
  const hoverOutline = normalizeOutlineText(script._hoverOutline || script.outline || "");
  const authorDisplayName = typeof author === "object" ? author?.displayName : (typeof author === "string" ? author : undefined);

  // Gallery-level hover preview
  const hoverCtx = useGalleryHoverPreview();
  const previewData = hoverOutline ? { title, author: authorDisplayName, outline: hoverOutline } : null;
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

  // 3D tilt on cover (standard only)
  const handleCoverPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    e.currentTarget.style.transform = `perspective(500px) rotateY(${x * 12}deg) rotateX(${-y * 10}deg) scale(1.03)`;
  };
  const handleCoverPointerLeave = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.style.transform = "";
  };

  const handleArticleClick = !href
    ? () => { onView?.(id); onNavigate?.(id); }
    : undefined;

  // Resolve author display for the frame
  const authorDisplay: CardAuthorDisplay | null = typeof author === "object" && author
    ? { displayName: author.displayName, avatarUrl: author.avatarUrl || author.avatar || "", avatarCrop: author.avatarCrop ?? null }
    : typeof author === "string"
    ? { displayName: author }
    : null;

  return (
    <ScriptGalleryCardFrame
      id={id}
      title={title}
      variant={variant}
      coverUrl={coverUrl}
      coverDesign={coverDesign}
      coverCrop={script.coverCrop}
      coverImageRenderer={coverImageRenderer}
      coverDesignRenderer={renderCoverDesign}
      showAgeGate={showAgeGate}
      author={authorDisplay}
      authorHref={resolvedAuthorHref}
      onAuthorClick={resolvedAuthorClick}
      seriesName={seriesName}
      seriesOrderText={seriesOrderText}
      seriesHref={seriesHref}
      onSeriesClick={seriesName && onSeriesClick ? () => onSeriesClick(seriesName) : undefined}
      primaryTags={primaryTags}
      secondaryTags={secondaryTags}
      totalTagCount={displayTags.length}
      tagHref={tagHref}
      onTagClick={onTagClick}
      cardSummary={cardSummary}
      views={views}
      likeCount={likeCount}
      isLiked={isLiked}
      estDurationMinutes={estDurationMinutes}
      onLikeClick={onLike ? handleLike : undefined}
      href={href}
      onArticleClick={handleArticleClick}
      onViewTrack={onView ? () => onView(id) : undefined}
      articleProps={hoverPreviewProps}
      coverContainerProps={variant === "standard" ? { onPointerMove: handleCoverPointerMove as unknown as React.PointerEventHandler<HTMLDivElement>, onPointerLeave: handleCoverPointerLeave as unknown as React.PointerEventHandler<HTMLDivElement> } : undefined}
    />
  );
}

export const ScriptGalleryCard = React.memo(ScriptGalleryCardInner);
