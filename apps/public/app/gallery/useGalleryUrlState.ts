"use client";

import { useCallback, useMemo, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  parseGalleryUrlState,
  serializeGalleryUrlState,
  mergeGalleryUrlState,
  type PublicHomepageUrlState,
} from "@write/public-ui";
import type { GalleryView, GalleryViewMode } from "@write/public-ui";

export type { GalleryView, GalleryViewMode, PublicHomepageUrlState };

export interface GalleryUrlStateActions {
  setView: (view: GalleryView) => void;
  setMode: (mode: GalleryViewMode) => void;
  setSegment: (segment: string) => void;
  setUsage: (usage: string) => void;
  /** Uses router.replace — search fires on every keystroke; must not pollute history. */
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
  const router = useRouter();

  const state = useMemo(
    () => parseGalleryUrlState(searchParams.toString()),
    [searchParams]
  );

  // Always points to latest searchParams so callbacks never close over stale state.
  const searchParamsRef = useRef(searchParams);
  searchParamsRef.current = searchParams;

  const nav = useCallback(
    (patch: Partial<PublicHomepageUrlState>, method: "push" | "replace" = "push") => {
      const current = parseGalleryUrlState(searchParamsRef.current.toString());
      const next = mergeGalleryUrlState(current, patch);
      const params = serializeGalleryUrlState(next);
      const qs = params.toString();
      const url = qs ? `/?${qs}` : "/";
      if (method === "replace") {
        router.replace(url, { scroll: false });
      } else {
        router.push(url, { scroll: false });
      }
    },
    [router]
  );

  const setView = useCallback((view: GalleryView) => nav({ view }), [nav]);
  const setMode = useCallback((mode: GalleryViewMode) => nav({ mode }), [nav]);
  const setSegment = useCallback((segment: string) => nav({ segment }), [nav]);
  const setUsage = useCallback((usage: string) => nav({ usage: usage as "all" | "commercial" }), [nav]);
  const setQ = useCallback((q: string) => nav({ q }, "replace"), [nav]);

  const toggleTag = useCallback(
    (tag: string) => {
      const current = parseGalleryUrlState(searchParamsRef.current.toString());
      const tags = current.tags.includes(tag)
        ? current.tags.filter((t) => t !== tag)
        : [...current.tags, tag];
      nav({ tags });
    },
    [nav]
  );

  const toggleAuthorTag = useCallback(
    (tag: string) => {
      const current = parseGalleryUrlState(searchParamsRef.current.toString());
      const authorTags = current.authorTags.includes(tag)
        ? current.authorTags.filter((t) => t !== tag)
        : [...current.authorTags, tag];
      nav({ authorTags });
    },
    [nav]
  );

  const toggleOrgTag = useCallback(
    (tag: string) => {
      const current = parseGalleryUrlState(searchParamsRef.current.toString());
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
    [setView, setMode, setSegment, setUsage, setQ, toggleTag, toggleAuthorTag, toggleOrgTag, resetFilters, resetAuthorTags, resetOrgTags]
  );

  return { state, actions };
}
