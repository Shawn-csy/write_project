"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  parseBannerSlides,
  SEGMENT_KEYS,
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

export type GalleryTab = "scripts" | "authors" | "orgs";
export type GalleryViewMode = "standard" | "compact";

interface UseGalleryControllerOptions {
  initialScripts: PublicScript[];
  initialBannerSlides?: HeroSlide[];
}

export function useGalleryController({
  initialScripts,
  initialBannerSlides,
}: UseGalleryControllerOptions) {
  const [tab, setTab] = useState<GalleryTab>("scripts");
  const [rawScripts, setRawScripts] = useState<PublicScript[]>(initialScripts);
  const [bannerSlides, setBannerSlides] = useState<HeroSlide[] | undefined>(initialBannerSlides);
  const [authors, setAuthors] = useState<PublicPersona[]>([]);
  const [orgs, setOrgs] = useState<PublicOrg[]>([]);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [segmentFilter, setSegmentFilter] = useState<string>(SEGMENT_KEYS.all);
  const [usageFilter, setUsageFilter] = useState<string>("all");
  const [viewMode, setViewMode] = useState<GalleryViewMode>("standard");
  const [tagSearch, setTagSearch] = useState("");

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
    if (tab !== "authors" && tab !== "orgs") return;
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
  }, [tab, authors.length, orgs.length]);

  const galleryScripts = useMemo(() => rawScripts.map(toGalleryInput), [rawScripts]);
  const galleryAuthors = useMemo(() => authors.map(toAuthorLike), [authors]);
  const galleryOrgs = useMemo(() => orgs.map(toOrgLike), [orgs]);

  const galleryModel = useGalleryFilterModel({
    scripts: galleryScripts,
    authors: galleryAuthors,
    orgs: galleryOrgs,
    searchNeedle: searchTerm.toLowerCase(),
    selectedTags,
    selectedAuthorTags: [],
    selectedOrgTags: [],
    segmentFilter,
    usageFilter,
    featuredLaneMode: "latest",
  });

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
    searchTerm !== "" ||
    selectedTags.length > 0 ||
    segmentFilter !== SEGMENT_KEYS.all ||
    usageFilter !== "all";

  const toggleTag = useCallback((tag: string) => {
    setSelectedTags((previous) =>
      previous.includes(tag)
        ? previous.filter((selectedTag) => selectedTag !== tag)
        : [...previous, tag]
    );
  }, []);

  const resetFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedTags([]);
    setSegmentFilter(SEGMENT_KEYS.all);
    setUsageFilter("all");
    setTagSearch("");
  }, []);

  const openMobileFilter = useCallback(() => setMobileFilterOpen(true), []);
  const closeMobileFilter = useCallback(() => setMobileFilterOpen(false), []);

  const filterPanelProps = {
    searchTerm,
    onSearchChange: setSearchTerm,
    usageFilter,
    onUsageFilterChange: setUsageFilter,
    viewMode,
    onViewModeChange: setViewMode,
    licenseTagShortcuts: galleryModel.licenseTagShortcuts,
    allTags: galleryModel.allTags,
    selectedTags,
    onToggleTag: toggleTag,
    tagSearch,
    onTagSearchChange: setTagSearch,
    displayTags,
    hasFilters,
    onResetFilters: resetFilters,
  };

  const resultCount =
    tab === "scripts"
      ? galleryModel.filteredScripts.length
      : tab === "authors"
      ? galleryModel.filteredAuthors.length
      : galleryModel.filteredOrgs.length;

  return {
    tab,
    setTab,
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
    searchTerm,
    viewMode,
  };
}
