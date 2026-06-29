"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  parseBannerSlides,
  useGalleryFilterModel,
  buildPublicHomepageModel,
  type HeroSlide,
  type PublicHomepageModel,
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
import type { GalleryView, GalleryViewMode, GalleryLaneMode } from "./useGalleryUrlState";
import { arePublicScriptsEquivalent, areHeroSlidesEquivalent } from "@/lib/refreshDiff";

export type { GalleryView, GalleryViewMode, GalleryLaneMode, PublicHomepageModel };

interface UseGalleryControllerOptions {
  initialScripts: PublicScript[];
  initialBannerSlides?: HeroSlide[];
}

export function useGalleryController({
  initialScripts,
  initialBannerSlides,
}: UseGalleryControllerOptions) {
  const { state: urlState, actions: urlActions, isPending } = useGalleryUrlState();

  // ── Server data ────────────────────────────────────────────────────────────
  const [rawScripts, setRawScripts] = useState<PublicScript[]>(initialScripts);
  const [bannerSlides, setBannerSlides] = useState<HeroSlide[] | undefined>(initialBannerSlides);
  const [authors, setAuthors] = useState<PublicPersona[]>([]);
  const [orgs, setOrgs] = useState<PublicOrg[]>([]);
  const [peopleStatus, setPeopleStatus] = useState<"idle" | "loading" | "loaded" | "error">("idle");
  const [termsRequired, setTermsRequired] = useState(false);

  // ── Transient UI state (not shareable) ────────────────────────────────────
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [tagSearch, setTagSearch] = useState("");

  // ── Terms config (determines platform-wide gate policy) ──────────────────
  useEffect(() => {
    fetch("/api/public-terms-config")
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => {
        if (cfg && typeof cfg === "object" && "version" in cfg) {
          setTermsRequired(true);
        }
      })
      .catch(() => {});
  }, []);

  // ── Client-side refresh ───────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/public-bundle")
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data && typeof data === "object" && "scripts" in data) {
          const next = publicScriptsFromBundle(data);
          setRawScripts((prev) =>
            arePublicScriptsEquivalent(prev, next) ? prev : next
          );
        }
        if (data && typeof data === "object" && "banner" in data) {
          const next = parseBannerSlides((data as { banner?: unknown }).banner);
          setBannerSlides((prev) =>
            areHeroSlidesEquivalent(prev, next) ? prev : next
          );
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (urlState.view !== "authors" && urlState.view !== "orgs") return;
    // Only fetch when idle. error stops here — retryPeople() resets to idle.
    if (peopleStatus !== "idle") return;
    setPeopleStatus("loading");
    Promise.all([
      fetch("/api/public-personas").then((r) => (r.ok ? r.json() : Promise.reject(new Error(`personas ${r.status}`)))),
      fetch("/api/public-organizations").then((r) => (r.ok ? r.json() : Promise.reject(new Error(`organizations ${r.status}`)))),
    ])
      .then(([personaData, orgData]) => {
        setAuthors(publicPersonasFromResponse(personaData));
        setOrgs(publicOrgsFromResponse(orgData));
        setPeopleStatus("loaded");
      })
      .catch(() => {
        setPeopleStatus("error");
      });
  }, [urlState.view, peopleStatus]);

  // ── Gallery model inputs ───────────────────────────────────────────────────
  const galleryScripts = useMemo(() => rawScripts.map(toGalleryInput), [rawScripts]);
  const galleryAuthors = useMemo(() => authors.map(toAuthorLike), [authors]);
  const galleryOrgs = useMemo(() => orgs.map(toOrgLike), [orgs]);

  const filterResult = useGalleryFilterModel({
    scripts: galleryScripts,
    authors: galleryAuthors,
    orgs: galleryOrgs,
    searchNeedle: urlState.q.toLowerCase(),
    selectedTags: urlState.tags,
    selectedAuthorTags: urlState.authorTags,
    selectedOrgTags: urlState.orgTags,
    segmentFilter: urlState.segment,
    usageFilter: urlState.usage,
  });

  // ── Homepage model (pure — all display semantics here) ────────────────────
  const homepageModel = useMemo(
    () =>
      buildPublicHomepageModel({
        view: urlState.view,
        viewMode: urlState.mode,
        laneMode: urlState.lane,
        filteredScripts: filterResult.filteredScripts,
        topViewedScripts: filterResult.topViewedScripts,
        latestScripts: filterResult.latestScripts,
        featuredSeries: filterResult.featuredSeries,
        allTags: filterResult.allTags,
        licenseTagShortcuts: filterResult.licenseTagShortcuts,
        filteredAuthors: filterResult.filteredAuthors,
        filteredOrgs: filterResult.filteredOrgs,
        selectedTags: urlState.tags,
        selectedAuthorTags: urlState.authorTags,
        selectedOrgTags: urlState.orgTags,
        segment: urlState.segment,
        usage: urlState.usage,
        q: urlState.q,
        totalScriptCount: galleryScripts.length,
        totalAuthorCount: galleryAuthors.length,
        totalOrgCount: galleryOrgs.length,
        termsRequired,
      }),
    [
      urlState.view,
      urlState.mode,
      urlState.lane,
      urlState.tags,
      urlState.authorTags,
      urlState.orgTags,
      urlState.segment,
      urlState.usage,
      urlState.q,
      filterResult,
      galleryScripts.length,
      galleryAuthors.length,
      galleryOrgs.length,
      termsRequired,
    ]
  );

  // ── Derived display tags (transient tagSearch not in URL) ─────────────────
  const displayTags = useMemo(
    () =>
      tagSearch
        ? homepageModel.allTags.filter((tag) =>
            tag.toLowerCase().includes(tagSearch.toLowerCase())
          )
        : homepageModel.allTags,
    [homepageModel.allTags, tagSearch]
  );

  // ── Callbacks ──────────────────────────────────────────────────────────────
  const openMobileFilter = useCallback(() => setMobileFilterOpen(true), []);
  const closeMobileFilter = useCallback(() => setMobileFilterOpen(false), []);
  /** Reset people fetch from error state. Only valid when peopleStatus === "error". */
  const retryPeople = useCallback(() => setPeopleStatus("idle"), []);

  const filterPanelProps = {
    searchTerm: urlState.q,
    onSearchChange: urlActions.setQ,
    licenseTagShortcuts: homepageModel.licenseTagShortcuts,
    allTags: homepageModel.allTags,
    selectedTags: urlState.tags,
    onToggleTag: urlActions.toggleTag,
    tagSearch,
    onTagSearchChange: setTagSearch,
    displayTags,
    hasFilters: homepageModel.hasFilters,
    onResetFilters: urlActions.resetFilters,
    usage: urlState.usage,
    onUsageChange: urlActions.setUsage,
  };

  return {
    tab: urlState.view,
    setTab: urlActions.setView,
    segment: urlState.segment,
    setSegment: urlActions.setSegment,
    usage: urlState.usage,
    setUsage: urlActions.setUsage,
    viewMode: urlState.mode,
    setViewMode: urlActions.setMode,
    laneMode: urlState.lane,
    setLaneMode: urlActions.setLane,
    bannerSlides,
    authors,
    orgs,
    peopleStatus,
    retryPeople,
    mobileFilterOpen,
    openMobileFilter,
    closeMobileFilter,
    filterPanelProps,
    homepageModel,
    // author/org tag filter
    allAuthorTags: filterResult.authorTags,
    allOrgTags: filterResult.orgTags,
    selectedAuthorTags: urlState.authorTags,
    selectedOrgTags: urlState.orgTags,
    onToggleAuthorTag: urlActions.toggleAuthorTag,
    onToggleOrgTag: urlActions.toggleOrgTag,
    onResetAuthorTags: urlActions.resetAuthorTags,
    onResetOrgTags: urlActions.resetOrgTags,
    isPending,
  };
}
