"use client";

import { useCallback, useMemo } from "react";
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
}

function navigate(
  router: ReturnType<typeof useRouter>,
  current: PublicHomepageUrlState,
  patch: Partial<PublicHomepageUrlState>,
  method: "push" | "replace" = "push"
): void {
  const next = mergeGalleryUrlState(current, patch);
  const params = serializeGalleryUrlState(next);
  const qs = params.toString();
  const url = qs ? `?${qs}` : "?";
  if (method === "replace") {
    router.replace(url, { scroll: false });
  } else {
    router.push(url, { scroll: false });
  }
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

  const setView = useCallback(
    (view: GalleryView) => navigate(router, state, { view }),
    [router, state]
  );

  const setMode = useCallback(
    (mode: GalleryViewMode) => navigate(router, state, { mode }),
    [router, state]
  );

  const setSegment = useCallback(
    (segment: string) => navigate(router, state, { segment }),
    [router, state]
  );

  const setUsage = useCallback(
    (usage: string) => navigate(router, state, { usage: usage as "all" | "commercial" }),
    [router, state]
  );

  const setQ = useCallback(
    (q: string) => navigate(router, state, { q }, "replace"),
    [router, state]
  );

  const toggleTag = useCallback(
    (tag: string) => {
      const tags = state.tags.includes(tag)
        ? state.tags.filter((t) => t !== tag)
        : [...state.tags, tag];
      navigate(router, state, { tags });
    },
    [router, state]
  );

  const toggleAuthorTag = useCallback(
    (tag: string) => {
      const authorTags = state.authorTags.includes(tag)
        ? state.authorTags.filter((t) => t !== tag)
        : [...state.authorTags, tag];
      navigate(router, state, { authorTags });
    },
    [router, state]
  );

  const toggleOrgTag = useCallback(
    (tag: string) => {
      const orgTags = state.orgTags.includes(tag)
        ? state.orgTags.filter((t) => t !== tag)
        : [...state.orgTags, tag];
      navigate(router, state, { orgTags });
    },
    [router, state]
  );

  const resetFilters = useCallback(
    () =>
      navigate(router, state, {
        tags: [],
        authorTags: [],
        orgTags: [],
        usage: "all",
        segment: "all",
        q: "",
      }),
    [router, state]
  );

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
    }),
    [setView, setMode, setSegment, setUsage, setQ, toggleTag, toggleAuthorTag, toggleOrgTag, resetFilters]
  );

  return { state, actions };
}
