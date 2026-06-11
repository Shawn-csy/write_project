"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  parseBannerSlides,
  useGalleryFilterModel,
  type HeroSlide,
} from "@write/public-ui";
import type { PublicOrg, PublicPersona, PublicScript } from "@/lib/types";
import {
  publicOrgsFromResponse,
  publicPersonasFromResponse,
  publicScriptsFromBundle,
  toAuthorLike,
  toGalleryInput,
  toOrgLike,
} from "@/lib/galleryProjection";
import { useGalleryUrlState } from "./useGalleryUrlState";
import type { GalleryView, GalleryViewMode } from "./useGalleryUrlState";

export type { GalleryView, GalleryViewMode };

interface UseGalleryControllerOptions {
  initialScripts: PublicScript[];
  initialBannerSlides?: HeroSlide[];
}

export function useGalleryController({
  initialScripts,
  initialBannerSlides,
}: UseGalleryControllerOptions) {
  const { state: urlState, actions: urlActions } = useGalleryUrlState();

  // ── Server data ────────────────────────────────────────────────────────────
  const [rawScripts, setRawScripts] = useState<PublicScript[]>(initialScripts);
  const [bannerSlides, setBannerSlides] = useState<HeroSlide[] | undefined>(initialBannerSlides);
  const [authors, setAuthors] = useState<PublicPersona[]>([]);
  const [orgs, setOrgs] = useState<PublicOrg[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);

  // ── Transient UI state (not shareable) ────────────────────────────────────
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");

  // ── Client-side refresh ───────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/public-bundle")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data && typeof data === "object" && "scripts" in data) {
          setRawScripts(publicScriptsFromBundle(data));
        }
        if (data && typeof data === "object" && "banner" in data) {
          setBannerSlides(parseBannerSlides((data as { banner?: unknown }).banner));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (urlState.view !== "authors" && urlState.view !== "orgs") return;
    if (authors.length > 0 || orgs.length > 0) return;
    setLoadingPeople(true);
    Promise.all([
      fetch("/api/public-personas").then((response) => (response.ok ? response.json() : [])),
      fetch("/api/public-organizations").then((response) => (response.ok ? response.json() : [])),
    ])
      .then(([personaData, orgData]) => {
        setAuthors(publicPersonasFromResponse(personaData));
        setOrgs(publicOrgsFromResponse(orgData));
      })
      .catch(() => {})
      .finally(() => setLoadingPeople(false));
  }, [urlState.view, authors.length, orgs.length]);

  // ── Gallery model inputs ───────────────────────────────────────────────────
  const galleryScripts = useMemo(() => rawScripts.map(toGalleryInput), [rawScripts]);
  const galleryAuthors = useMemo(() => authors.map(toAuthorLike), [authors]);
  const galleryOrgs = useMemo(() => orgs.map(toOrgLike), [orgs]);

  const galleryModel = useGalleryFilterModel({
    scripts: galleryScripts,
    authors: galleryAuthors,
    orgs: galleryOrgs,
    searchNeedle: urlState.q.toLowerCase(),
    selectedTags: urlState.tags,
    selectedAuthorTags: urlState.authorTags,
    selectedOrgTags: urlState.orgTags,
    segmentFilter: urlState.segment,
    usageFilter: urlState.usage,
    featuredLaneMode: "latest",
  });

  // ── Derived display state ─────────────────────────────────────────────────
  const displayTags = useMemo(
    () =>
      tagSearch
        ? galleryModel.allTags.filter((tag) =>
            tag.toLowerCase().includes(tagSearch.toLowerCase())
          )
        : galleryModel.allTags,
    [galleryModel.allTags, tagSearch]
  );

  const hasFilters =
    urlState.q !== "" ||
    urlState.tags.length > 0 ||
    urlState.segment !== "all" ||
    urlState.usage !== "all";

  // ── Callbacks ──────────────────────────────────────────────────────────────
  const openMobileFilter = useCallback(() => setMobileFilterOpen(true), []);
  const closeMobileFilter = useCallback(() => setMobileFilterOpen(false), []);

  const filterPanelProps = {
    searchTerm: urlState.q,
    onSearchChange: urlActions.setQ,
    usageFilter: urlState.usage,
    onUsageFilterChange: urlActions.setUsage,
    viewMode: urlState.mode,
    onViewModeChange: urlActions.setMode,
    licenseTagShortcuts: galleryModel.licenseTagShortcuts,
    allTags: galleryModel.allTags,
    selectedTags: urlState.tags,
    onToggleTag: urlActions.toggleTag,
    tagSearch,
    onTagSearchChange: setTagSearch,
    displayTags,
    hasFilters,
    onResetFilters: urlActions.resetFilters,
  };

  const resultCount =
    urlState.view === "scripts"
      ? galleryModel.filteredScripts.length
      : urlState.view === "authors"
      ? galleryModel.filteredAuthors.length
      : galleryModel.filteredOrgs.length;

  return {
    tab: urlState.view,
    setTab: urlActions.setView,
    bannerSlides,
    authors,
    orgs,
    loadingPeople,
    mobileFilterOpen,
    openMobileFilter,
    closeMobileFilter,
    filterPanelProps,
    galleryModel,
    hasFilters,
    isDefaultView: !hasFilters,
    resultCount,
    searchTerm: urlState.q,
    viewMode: urlState.mode,
  };
}
