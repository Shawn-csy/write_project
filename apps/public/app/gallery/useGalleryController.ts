"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useGalleryFilterModel,
  buildPublicHomepageModel,
  SEGMENT_KEYS,
  SEGMENT_TAGS,
  type HeroSlide,
  type PublicHomepageModel,
} from "@write/public-ui";
import type { ExternalPublicScript, PublicOrg, PublicPersona, PublicScript } from "@/lib/types";
import {
  publicOrgsFromResponse,
  publicPersonasFromResponse,
  toAuthorLike,
  toGalleryInput,
  toOrgLike,
  externalPersonasFromScripts,
  externalOrgsFromScripts,
} from "@/lib/galleryProjection";
import { useGalleryUrlState } from "./useGalleryUrlState";
import type { GalleryView, GalleryViewMode, GalleryLaneMode, PublicHomepageUrlState } from "./useGalleryUrlState";

export type { GalleryView, GalleryViewMode, GalleryLaneMode, PublicHomepageModel };

interface UseGalleryControllerOptions {
  initialScripts: PublicScript[];
  initialExternalPublicScripts: ExternalPublicScript[];
  initialBannerSlides?: HeroSlide[];
  initialUrlState: PublicHomepageUrlState;
}

function externalCategories(item: ExternalPublicScript): string[] {
  return Array.from(
    new Set(
      (item.categories ?? []).flatMap((category) =>
        String(category || "")
          .split(/[,，、]/)
          .map((value) => value.trim())
          .filter(Boolean)
      )
    )
  );
}

function filterExternalPublicScripts(
  items: ExternalPublicScript[],
  searchNeedle: string,
  selectedTags: string[],
  segmentFilter: string,
  usageFilter: string,
): ExternalPublicScript[] {
  return items
    .filter((item) => {
      const categories = externalCategories(item);
      const haystack = [
        item.title,
        item.remoteTitle,
        item.summary,
        item.remoteSummary,
        item.sourceName,
        item.sourceDomain,
        item.authorName,
        item.organizationName,
        ...categories,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = !searchNeedle || haystack.includes(searchNeedle);
      const matchesTag = selectedTags.length === 0 || categories.some((category) => selectedTags.includes(category));
      const segmentTags = (SEGMENT_TAGS[segmentFilter] ?? []).map((tag) => tag.toLowerCase());
      const segmentAliases = segmentFilter === SEGMENT_KEYS.allAges ? ["全性向", "全年齡"] : [];
      const matchesSegment = segmentFilter === SEGMENT_KEYS.all
        || [...segmentTags, ...segmentAliases].some((tag) => categories.some((category) => category.toLowerCase() === tag));
      // External sources do not carry a verified commercial-use license.
      const matchesUsage = usageFilter !== "commercial";
      return matchesSearch && matchesTag && matchesSegment && matchesUsage;
    })
    .sort((a, b) =>
      (b.mountedAt || b.createdAt || b.updatedAt || 0) -
      (a.mountedAt || a.createdAt || a.updatedAt || 0)
    );
}

export function useGalleryController({
  initialScripts,
  initialExternalPublicScripts,
  initialBannerSlides,
  initialUrlState,
}: UseGalleryControllerOptions) {
  const { state: urlState, actions: urlActions } = useGalleryUrlState(initialUrlState);

  // ── Server data ────────────────────────────────────────────────────────────
  const rawScripts = initialScripts;
  const externalPublicScripts = initialExternalPublicScripts;
  const bannerSlides = initialBannerSlides;
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
  const publishedExternalPublicScripts = useMemo(
    () => externalPublicScripts.filter((item) => item.status === "published"),
    [externalPublicScripts]
  );
  const allAuthors = useMemo(() => {
    const map = new Map(authors.map((author) => [author.displayName.trim().toLocaleLowerCase(), author]));
    for (const externalAuthor of externalPersonasFromScripts(publishedExternalPublicScripts)) {
      const key = externalAuthor.displayName.trim().toLocaleLowerCase();
      if (!map.has(key)) map.set(key, externalAuthor);
    }
    return Array.from(map.values());
  }, [authors, publishedExternalPublicScripts]);
  const allOrgs = useMemo(() => {
    const map = new Map(orgs.map((org) => [org.name.trim().toLocaleLowerCase(), org]));
    for (const externalOrg of externalOrgsFromScripts(publishedExternalPublicScripts)) {
      const key = externalOrg.name.trim().toLocaleLowerCase();
      if (!map.has(key)) map.set(key, externalOrg);
    }
    return Array.from(map.values());
  }, [orgs, publishedExternalPublicScripts]);
  const galleryAuthors = useMemo(() => allAuthors.map(toAuthorLike), [allAuthors]);
  const galleryOrgs = useMemo(() => allOrgs.map(toOrgLike), [allOrgs]);
  const filteredExternalPublicScripts = useMemo(
    () => filterExternalPublicScripts(
      publishedExternalPublicScripts,
      urlState.q.toLowerCase(),
      urlState.tags,
      urlState.segment,
      urlState.usage,
    ),
    [publishedExternalPublicScripts, urlState.q, urlState.tags, urlState.segment, urlState.usage]
  );
  const externalTags = useMemo(
    () => Array.from(new Set(publishedExternalPublicScripts.flatMap(externalCategories))),
    [publishedExternalPublicScripts]
  );

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
    () => {
      const baseModel = buildPublicHomepageModel({
        view: urlState.view,
        viewMode: urlState.mode,
        laneMode: urlState.lane,
        filteredScripts: filterResult.filteredScripts,
        topViewedScripts: filterResult.topViewedScripts,
        latestScripts: filterResult.latestScripts,
        featuredSeries: filterResult.featuredSeries,
        allTags: Array.from(new Set([...filterResult.allTags, ...externalTags])),
        licenseTagShortcuts: filterResult.licenseTagShortcuts,
        filteredAuthors: filterResult.filteredAuthors,
        filteredOrgs: filterResult.filteredOrgs,
        selectedTags: urlState.tags,
        selectedAuthorTags: urlState.authorTags,
        selectedOrgTags: urlState.orgTags,
        segment: urlState.segment,
        usage: urlState.usage,
        q: urlState.q,
        totalScriptCount: galleryScripts.length + publishedExternalPublicScripts.length,
        totalAuthorCount: allAuthors.length,
        totalOrgCount: allOrgs.length,
        termsRequired,
      });
      if (urlState.view !== "scripts") return baseModel;
      const externalResultCount = filteredExternalPublicScripts.length;
      return {
        ...baseModel,
        resultCount: baseModel.resultCount + externalResultCount,
        emptyState: baseModel.filteredScripts.length + externalResultCount > 0 ? "none" as const : baseModel.emptyState,
      };
    },
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
      externalTags,
      publishedExternalPublicScripts,
      filteredExternalPublicScripts,
      galleryScripts.length,
      allAuthors.length,
      allOrgs.length,
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
    externalPublicScripts,
    filteredExternalPublicScripts,
    authors: allAuthors,
    orgs: allOrgs,
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
  };
}
