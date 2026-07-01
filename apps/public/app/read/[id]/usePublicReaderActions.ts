"use client";

import { useCallback, useEffect, useRef, useState } from "react";

function getOrCreateVisitorId(): string {
  try {
    const key = "visitor_id";
    let id = localStorage.getItem(key);
    if (!id) {
      id = `v-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
      localStorage.setItem(key, id);
    }
    return id;
  } catch {
    return "anonymous";
  }
}

export interface PublicReaderActions {
  views: number;
  likes: number;
  liked: boolean;
  likeInFlight: boolean;
  handleLike: () => Promise<void>;
}

export function usePublicReaderActions(
  scriptId: string,
  initialViews: number,
  initialLikes: number,
): PublicReaderActions {
  const [views, setViews] = useState(initialViews);
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [likeInFlight, setLikeInFlight] = useState(false);
  const likeRef = useRef(liked);
  likeRef.current = liked;

  useEffect(() => {
    fetch(`/api/scripts/${scriptId}/view`, { method: "POST" }).catch(() => {});
  }, [scriptId]);

  useEffect(() => {
    const visitorId = getOrCreateVisitorId();
    fetch(`/api/public-scripts/${scriptId}/like-status?visitorId=${encodeURIComponent(visitorId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setLiked(Boolean(data.liked));
          setLikes(Number(data.likes ?? 0));
          setViews((v) => (data.views != null ? Number(data.views) : v));
        }
      })
      .catch(() => {});
  }, [scriptId]);

  const handleLike = useCallback(async () => {
    if (likeInFlight) return;
    setLikeInFlight(true);
    const prev = likeRef.current;
    setLiked(!prev);
    setLikes((l) => (prev ? Math.max(0, l - 1) : l + 1));
    try {
      const visitorId = getOrCreateVisitorId();
      const res = await fetch(`/api/public-scripts/${scriptId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId }),
      });
      if (res.ok) {
        const data = await res.json();
        setLiked(Boolean(data.liked));
        setLikes(Number(data.likes));
      }
    } catch {
      setLiked(prev);
      setLikes((l) => (prev ? l + 1 : Math.max(0, l - 1)));
    } finally {
      setLikeInFlight(false);
    }
  }, [scriptId, likeInFlight]);

  return {
    views, likes, liked, likeInFlight,
    handleLike,
  };
}
