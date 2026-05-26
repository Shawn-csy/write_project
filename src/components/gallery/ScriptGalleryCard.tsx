import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { ChevronRight, Eye, Heart } from "lucide-react";
import { publicToggleScriptLike, getVisitorId, incrementScriptView } from "../../lib/api/scripts";
import { AuthorBadge } from "../ui/AuthorBadge";
import { CoverPlaceholder } from "../ui/CoverPlaceholder";
import { getMediaCropStyle } from "../../lib/mediaCropRef";
import type { TagLike } from "../../types/persona";
import type { BaseScript } from "../../types/script";

export interface ScriptGalleryItem extends BaseScript {
  title?: string;
  author?: string | { id?: string; displayName?: string; avatarUrl?: string; avatar?: string } | null;
  tags?: Array<string | TagLike>;
  views?: number;
  likes?: number;
  contentLength?: number;
  _disableAuthorLink?: boolean;
  seriesName?: string;
  _seriesName?: string;
  seriesOrder?: BaseScript["seriesOrder"];
  _seriesOrder?: number | string | null;
  _derivedLicenseTags?: Array<string | TagLike>;
}

interface ScriptGalleryCardProps {
  script: ScriptGalleryItem;
  onClick?: () => void;
  onScriptClick?: (script: ScriptGalleryItem) => void;
  variant?: "standard" | "compact";
}

function ScriptGalleryCardInner({ script, onClick, onScriptClick, variant = "standard" }: ScriptGalleryCardProps): React.JSX.Element {
  const navigate = useNavigate();
  const { id, title, author, coverUrl, tags = [], views = 0, likes = 0, contentLength } = script;
  const cropCover = getMediaCropStyle(String(coverUrl || ""));
  const estDurationMinutes = contentLength && contentLength > 0
    ? Math.round(contentLength / 2 / 200)  // chars/2 = CJK chars, /200 = chars per min
    : null;
  const authorForBadge = author ?? undefined;
  const authorClickable = !script?._disableAuthorLink;

  const { seriesName, seriesOrderText, displayTags, primaryTags, secondaryTags } = useMemo(() => {
    const sName = String(script?.seriesName || script?._seriesName || "").trim();
    const seriesOrderRaw = script?.seriesOrder ?? script?._seriesOrder;
    const parsedSeriesOrder = Number(seriesOrderRaw);
    const hasSeriesOrder = Number.isFinite(parsedSeriesOrder) && parsedSeriesOrder >= 0;
    const sOrderText = !hasSeriesOrder ? "" : Math.floor(parsedSeriesOrder) === 0 ? " · 設定/背景" : ` · 第 ${Math.floor(parsedSeriesOrder)} 作`;
    const normalizedTags = (tags || [])
      .map((tag) => (typeof tag === "string" ? tag : tag?.name))
      .filter((tag): tag is string => Boolean(tag));
    const licenseTags = (script?._derivedLicenseTags || [])
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
  }, [tags, script?._derivedLicenseTags, script?.seriesName, script?._seriesName, script?.seriesOrder, script?._seriesOrder]);

  const [isLiked, setIsLiked] = useState<boolean>(false);
  const [likeCount, setLikeCount] = useState<number>(likes);

  useEffect(() => {
    const visitorId = getVisitorId();
    const stored = localStorage.getItem(`liked_script_${visitorId}_${id}`);
    if (stored === 'true') {
      setIsLiked(true);
      setLikeCount(likes + 1);
    } else {
      setLikeCount(likes);
    }
  }, [id, likes]);

  const handleLike = useCallback(async (e: React.MouseEvent<HTMLElement>): Promise<void> => {
    e.stopPropagation();
    const newState = !isLiked;
    setIsLiked(newState);
    setLikeCount(prev => newState ? prev + 1 : prev - 1);
    try {
      const res = await publicToggleScriptLike(id);
      setIsLiked(res.liked);
      setLikeCount(res.likes);
      const visitorId = getVisitorId();
      localStorage.setItem(`liked_script_${visitorId}_${id}`, String(res.liked));
    } catch (error) {
      console.error("Failed to toggle like:", error);
      setIsLiked(!newState);
      setLikeCount(prev => !newState ? prev + 1 : prev - 1);
    }
  }, [id, isLiked]);

  const handleCardClick = useCallback((): void => {
    incrementScriptView(id).catch(err => console.error("Failed to count view", err));
    if (onScriptClick) onScriptClick(script);
    else if (onClick) onClick();
  }, [id, onClick, onScriptClick, script]);

  const handleSeriesClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/series/${encodeURIComponent(seriesName)}`);
  }, [navigate, seriesName]);

  const handleTagClick = useCallback((e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    navigate(`/?tag=${encodeURIComponent(tag)}`);
  }, [navigate]);

  if (variant === "compact") {
    return (
      <Card
        onClick={handleCardClick}
        className="group relative overflow-hidden rounded-none border-0 bg-transparent shadow-none hover:cursor-pointer"
      >
        <div className="mx-2 my-1 flex items-stretch gap-2.5 rounded-lg border border-transparent px-3 py-2 transition-all duration-200 hover:border-primary/35 hover:bg-muted/35">
          <div className="w-[44px] shrink-0">
            <div className="aspect-[2/3] w-full overflow-hidden rounded-sm border border-border/40 bg-muted/25 shadow-sm">
              {coverUrl ? (
                <img
                  src={cropCover.src}
                  style={cropCover.style}
                  alt={title}
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  loading="lazy"
                />
              ) : (
                <CoverPlaceholder title={title} compact />
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <div className="min-w-0 text-sm font-semibold leading-tight text-foreground line-clamp-1 group-hover:text-primary">
                {title}
              </div>
              <div className="shrink-0 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1" title="Views">
                  <Eye className="h-3 w-3" />
                  <span>{views.toLocaleString()}</span>
                </span>
              </div>
            </div>
            <div className="min-w-0 flex items-center gap-2">
              <AuthorBadge author={authorForBadge} clickable={authorClickable} />
              {seriesName && (
                <button
                  type="button"
                  className="min-w-0 text-[10px] text-muted-foreground line-clamp-1 hover:text-primary"
                  onClick={handleSeriesClick}
                >
                  {seriesName}{seriesOrderText}
                </button>
              )}
              {!seriesName && displayTags.length > 0 && (
                <span className="text-[10px] text-muted-foreground line-clamp-1">
                  {primaryTags.join(" · ")}
                </span>
              )}
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/70 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      onClick={handleCardClick}
      className="group relative overflow-hidden rounded-xl border border-transparent bg-transparent px-2 pb-2 pt-1 shadow-none hover:-translate-y-0.5 hover:cursor-pointer hover:border-primary/60 hover:bg-muted/25 hover:shadow-md transition-all duration-200"
    >
      {/* Cover Image Container */}
      <div className="aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted shadow-sm group-hover:shadow-md transition-shadow">
        {coverUrl ? (
          <img 
            src={cropCover.src}
            style={cropCover.style}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <CoverPlaceholder title={title} compact />
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-primary/10" />
      </div>

      {/* Info Section */}
      <div className="pt-2.5 space-y-1">
        {/* Title */}
        <h3 className="font-serif text-sm md:text-base font-semibold leading-snug text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </h3>

        {/* Author */}
        <div className="pt-1">
            <AuthorBadge author={authorForBadge} clickable={authorClickable} />
        </div>
        {seriesName && (
          <button
            type="button"
            className="text-[11px] text-muted-foreground line-clamp-1 hover:text-primary"
            onClick={handleSeriesClick}
          >
            {seriesName}{seriesOrderText}
          </button>
        )}

        {/* Tags */}
        {displayTags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {primaryTags.map((tag, i) => (
              <Badge
                key={i}
                variant="outline"
                className="max-w-[110px] px-1.5 py-0 h-5 text-[10px] font-normal hover:bg-secondary cursor-pointer border-primary/20 text-muted-foreground"
                onClick={(e) => handleTagClick(e, tag)}
                title={tag}
              >
                <span className="truncate">{tag}</span>
              </Badge>
            ))}
            {secondaryTags.map((tag, i) => (
              <Badge
                key={`secondary-${i}`}
                variant="outline"
                className="hidden sm:inline-flex max-w-[110px] px-1.5 py-0 h-5 text-[10px] font-normal hover:bg-secondary cursor-pointer border-primary/20 text-muted-foreground"
                onClick={(e) => handleTagClick(e, tag)}
                title={tag}
              >
                <span className="truncate">{tag}</span>
              </Badge>
            ))}
            {displayTags.length > 2 && (
                <span className="sm:hidden text-[10px] text-muted-foreground self-center">+{displayTags.length - 2}</span>
            )}
            {displayTags.length > 3 && (
                <span className="hidden sm:inline text-[10px] text-muted-foreground self-center">+{displayTags.length - 3}</span>
            )}
          </div>
        )}

        {/* Engagement Stats */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50 mt-2">
             <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1" title="Views">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{views.toLocaleString()}</span>
                </div>
                <div
                    className={`flex items-center gap-1 cursor-pointer transition-colors ${isLiked ? "text-destructive" : "hover:text-foreground"}`}
                    onClick={handleLike}
                    title="Like"
                >
                    <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-current" : ""}`} />
                    <span>{likeCount.toLocaleString()}</span>
                </div>
             </div>
             {estDurationMinutes !== null && estDurationMinutes > 0 && (
               <span className="text-[10px] text-muted-foreground/70">
                 ⏱ {estDurationMinutes < 1 ? "< 1 分" : `約 ${estDurationMinutes} 分`}
               </span>
             )}
        </div>
      </div>
    </Card>
  );
}

export const ScriptGalleryCard = React.memo(ScriptGalleryCardInner);
