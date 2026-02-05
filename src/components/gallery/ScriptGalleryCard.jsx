import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../ui/badge";
import { Card } from "../ui/card";
import { Eye, Heart } from "lucide-react";
import { toggleScriptLike, incrementScriptView } from "../../lib/db";
import { AuthorBadge } from "../ui/AuthorBadge";

export function ScriptGalleryCard({ script, onClick, variant = "standard" }) {
  const navigate = useNavigate();
  const { id, title, author, coverUrl, tags = [], views = 0, likes = 0 } = script;
  const normalizedTags = (tags || [])
    .map((tag) => (typeof tag === "string" ? tag : tag?.name))
    .filter(Boolean);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(likes);

  useEffect(() => {
    // Load like state from local storage (mock persistence)
    const stored = localStorage.getItem(`liked_script_${id}`);
    if (stored === 'true') {
        setIsLiked(true);
    }
    setLikeCount(likes + (stored === 'true' ? 1 : 0)); 
  }, [id, likes]);

  const handleLike = async (e) => {
    e.stopPropagation();
    // Optimistic Update
    const newState = !isLiked;
    setIsLiked(newState);
    setLikeCount(prev => newState ? prev + 1 : prev - 1);
    
    // API Call (Fire and forget, or handle error revert)
    try {
        await toggleScriptLike(id);
        localStorage.setItem(`liked_script_${id}`, newState);
    } catch (error) {
        console.error("Failed to toggle like:", error);
        // Revert on error
        setIsLiked(!newState);
        setLikeCount(prev => !newState ? prev + 1 : prev - 1);
    }
  };

  const handleCardClick = () => {
     // Increment view count (fire and forget)
     incrementScriptView(id).catch(err => console.error("Failed to count view", err));
     if (onClick) onClick();
  };

  if (variant === "compact") {
    return (
      <Card
        onClick={handleCardClick}
        className="group relative overflow-hidden border border-border/40 bg-background/40 hover:bg-background/70 hover:cursor-pointer transition-all duration-200"
      >
        <div className="flex gap-3 p-3">
          <div className="w-16 shrink-0">
            <div className="aspect-[2/3] w-full overflow-hidden rounded-md bg-muted">
              {coverUrl ? (
                <img
                  src={coverUrl}
                  alt={title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-secondary/30 text-muted-foreground text-xs px-2 text-center">
                  {title}
                </div>
              )}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold leading-snug line-clamp-2">{title}</div>
            <div className="mt-1">
              <AuthorBadge author={author} />
            </div>
            <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
              <div className="flex items-center gap-1" title="Views">
                <Eye className="w-3.5 h-3.5" />
                <span>{views.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      onClick={handleCardClick}
      className="group relative overflow-hidden border-0 bg-transparent shadow-none hover:cursor-pointer transition-all duration-300"
    >
      {/* Cover Image Container */}
      <div className="aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted shadow-sm group-hover:shadow-md transition-shadow">
        {coverUrl ? (
          <img 
            src={coverUrl} 
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary/30 text-muted-foreground p-4 text-center">
            <span className="text-lg font-serif italic opacity-50">{title}</span>
          </div>
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/5" />
      </div>

      {/* Info Section */}
      <div className="pt-3 space-y-1.5">
        {/* Title */}
        <h3 className="font-serif text-base md:text-lg font-semibold leading-tight text-foreground group-hover:text-primary transition-colors line-clamp-2">
          {title}
        </h3>

        {/* Author */}
        <div className="pt-1">
            <AuthorBadge author={author} />
        </div>

        {/* Tags */}
        {normalizedTags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {normalizedTags.slice(0, 3).map((tag, i) => (
              <Badge 
                key={i} 
                variant="outline" 
                className="px-1.5 py-0 h-5 text-[10px] font-normal border-primary/20 text-muted-foreground hover:bg-secondary cursor-pointer"
                onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/?tag=${encodeURIComponent(tag)}`);
                }}
              >
                {tag}
              </Badge>
            ))}
            {normalizedTags.length > 3 && (
                <span className="text-[10px] text-muted-foreground self-center">+{normalizedTags.length - 3}</span>
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
                    className={`flex items-center gap-1 cursor-pointer transition-colors ${isLiked ? "text-red-500" : "hover:text-foreground"}`}
                    onClick={handleLike}
                    title="Like"
                >
                    <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-current" : ""}`} />
                    <span>{likeCount.toLocaleString()}</span>
                </div>
             </div>
        </div>
      </div>
    </Card>
  );
}
