/**
 * Vite adapter — thin wrapper over @write/public-ui ScriptGalleryCard.
 * All side effects (localStorage, API, router) live here.
 * The shared component receives only resolved hrefs/callbacks.
 */
import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScriptGalleryCard as SharedScriptGalleryCard } from "@write/public-ui";
import type { ScriptGalleryItem } from "@write/public-ui";
import { publicToggleScriptLike, getVisitorId, incrementScriptView } from "../../lib/api/scripts";

export type { ScriptGalleryItem };

interface ScriptGalleryCardProps {
  script: ScriptGalleryItem;
  onClick?: () => void;
  onScriptClick?: (script: ScriptGalleryItem) => void;
  variant?: "standard" | "compact";
}

function usePublicScriptLikeState(script: ScriptGalleryItem) {
  const [storedLiked, setStoredLiked] = useState<boolean | null>(null);

  // Restore liked state from localStorage after mount (never in render)
  useEffect(() => {
    try {
      const visitorId = getVisitorId();
      const stored = localStorage.getItem(`liked_script_${visitorId}_${script.id}`);
      if (stored === "true") setStoredLiked(true);
    } catch { /* localStorage unavailable */ }
  }, [script.id]);

  const resolvedScript: ScriptGalleryItem = storedLiked === true
    ? { ...script, isLiked: true, likes: (script.likes ?? 0) + 1 }
    : script;

  const handleLike = useCallback(async (id: string, _currentLiked: boolean) => {
    const res = await publicToggleScriptLike(id);
    try {
      const visitorId = getVisitorId();
      localStorage.setItem(`liked_script_${visitorId}_${id}`, String(res.liked));
    } catch { /* ignore */ }
    setStoredLiked(res.liked ? true : null);
    return { liked: res.liked, likes: res.likes };
  }, []);

  return { resolvedScript, handleLike };
}

function ScriptGalleryCardAdapter({ script, onClick, onScriptClick, variant = "standard" }: ScriptGalleryCardProps): React.JSX.Element {
  const navigate = useNavigate();
  const { resolvedScript, handleLike } = usePublicScriptLikeState(script);

  const handleNavigate = useCallback((id: string) => {
    if (onScriptClick) onScriptClick(script);
    else if (onClick) onClick();
    else navigate(`/read/${id}`);
  }, [navigate, onClick, onScriptClick, script]);

  const handleView = useCallback((id: string) => {
    incrementScriptView(id).catch((err) => console.error("Failed to count view", err));
  }, []);

  const handleSeriesClick = useCallback((seriesName: string) => {
    navigate(`/series/${encodeURIComponent(seriesName)}`);
  }, [navigate]);

  const handleTagClick = useCallback((tag: string) => {
    navigate(`/?tag=${encodeURIComponent(tag)}`);
  }, [navigate]);

  const handleAuthorClick = useCallback((authorId: string) => {
    navigate(`/author/${authorId}`);
  }, [navigate]);

  return (
    <SharedScriptGalleryCard
      script={resolvedScript}
      variant={variant}
      onNavigate={handleNavigate}
      onView={handleView}
      onLike={handleLike}
      onSeriesClick={handleSeriesClick}
      onTagClick={handleTagClick}
      onAuthorClick={handleAuthorClick}
    />
  );
}

export const ScriptGalleryCard = React.memo(ScriptGalleryCardAdapter);
