"use client";

import { useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  parseGalleryUrlState,
  serializeGalleryUrlState,
  mergeGalleryUrlState,
  type PublicHomepageUrlState,
} from "@write/public-ui";
import type { GalleryView, GalleryViewMode, GalleryLaneMode } from "@write/public-ui";

export type { GalleryView, GalleryViewMode, GalleryLaneMode, PublicHomepageUrlState };

export interface GalleryUrlStateActions {
  setView: (view: GalleryView) => void;
  setMode: (mode: GalleryViewMode) => void;
  setLane: (lane: GalleryLaneMode) => void;
  setSegment: (segment: string) => void;
  setUsage: (usage: string) => void;
  /** Uses history.replaceState — search fires on every keystroke; must not pollute history. */
  setQ: (q: string) => void;
  toggleTag: (tag: string) => void;
  toggleAuthorTag: (tag: string) => void;
  toggleOrgTag: (tag: string) => void;
  resetFilters: () => void;
  resetAuthorTags: () => void;
  resetOrgTags: () => void;
}

export function useGalleryUrlState(): {
  state: PublicHomepageUrlState;
  actions: GalleryUrlStateActions;
} {
  const searchParams = useSearchParams();
  const state = useMemo(
    () => parseGalleryUrlState(searchParams.toString()),
    [searchParams]
  );

  // Always points to the latest effective state. It is updated optimistically
  // after history writes so rapid consecutive clicks merge against the latest
  // intended URL, not the previous render's searchParams snapshot.
  const stateRef = useRef(state);
  stateRef.current = state;

  const nav = useCallback(
    (patch: Partial<PublicHomepageUrlState>, method: "push" | "replace" = "push") => {
      const current = stateRef.current;
      const next = mergeGalleryUrlState(current, patch);
      const params = serializeGalleryUrlState(next);
      const qs = params.toString();
      const url = qs ? `/?${qs}` : "/";

      // Homepage filters are client-owned URL state, not route navigation.
      // Native History API keeps interactions synchronous and still integrates
      // with Next's useSearchParams, avoiding App Router transition stalls.
      if (typeof window === "undefined") return;
      const currentUrl = `${window.location.pathname}${window.location.search}`;
      if (currentUrl === url) return;
      if (method === "replace") {
        window.history.replaceState(null, "", url);
      } else {
        window.history.pushState(null, "", url);
      }
      stateRef.current = next;
    },
    []
  );

  const setView = useCallback((view: GalleryView) => nav({ view }), [nav]);
  const setMode = useCallback((mode: GalleryViewMode) => nav({ mode }), [nav]);
  const setLane = useCallback((lane: GalleryLaneMode) => nav({ lane }), [nav]);
  const setSegment = useCallback((segment: string) => nav({ segment }), [nav]);
  const setUsage = useCallback((usage: string) => nav({ usage: usage as "all" | "commercial" }), [nav]);
  const setQ = useCallback((q: string) => nav({ q }, "replace"), [nav]);

  const toggleTag = useCallback(
    (tag: string) => {
      const current = stateRef.current;
      const tags = current.tags.includes(tag)
        ? current.tags.filter((t) => t !== tag)
        : [...current.tags, tag];
      nav({ tags });
    },
    [nav]
  );

  const toggleAuthorTag = useCallback(
    (tag: string) => {
      const current = stateRef.current;
      const authorTags = current.authorTags.includes(tag)
        ? current.authorTags.filter((t) => t !== tag)
        : [...current.authorTags, tag];
      nav({ authorTags });
    },
    [nav]
  );

  const toggleOrgTag = useCallback(
    (tag: string) => {
      const current = stateRef.current;
      const orgTags = current.orgTags.includes(tag)
        ? current.orgTags.filter((t) => t !== tag)
        : [...current.orgTags, tag];
      nav({ orgTags });
    },
    [nav]
  );

  const resetFilters = useCallback(
    () => nav({ tags: [], authorTags: [], orgTags: [], usage: "all", segment: "all", q: "" }),
    [nav]
  );

  const resetAuthorTags = useCallback(() => nav({ authorTags: [] }), [nav]);
  const resetOrgTags = useCallback(() => nav({ orgTags: [] }), [nav]);

  const actions: GalleryUrlStateActions = useMemo(
    () => ({
      setView,
      setMode,
      setLane,
      setSegment,
      setUsage,
      setQ,
      toggleTag,
      toggleAuthorTag,
      toggleOrgTag,
      resetFilters,
      resetAuthorTags,
      resetOrgTags,
    }),
    [setView, setMode, setLane, setSegment, setUsage, setQ, toggleTag, toggleAuthorTag, toggleOrgTag, resetFilters, resetAuthorTags, resetOrgTags]
  );

  return { state, actions };
}
