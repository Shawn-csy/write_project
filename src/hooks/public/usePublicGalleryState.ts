import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { getPublicBundle, getPublicHomepageBanner } from "../../lib/api/public";
import { usePublicTerms } from "./usePublicTerms";
import { useDebouncedSearch } from "../useDebouncedSearch";
import { usePublicGalleryFiltering } from "./usePublicGalleryFiltering";
import { useI18n } from "../../contexts/I18nContext";
import type { BaseScriptApi } from "../../types/api";

const SEGMENT_KEYS = {
  all: "all",
  allAges: "all-ages",
  adult: "adult",
  male: "male",
  female: "female",
};

export type GalleryView = "scripts" | "authors" | "orgs" | "help" | "license" | "about";
export type GalleryViewMode = "standard" | "compact";

export interface PublicGalleryAuthor {
  id?: string;
  displayName?: string;
  avatar?: string;
  avatarUrl?: string;
  tags?: string[];
  [key: string]: unknown;
}

export interface PublicGalleryOrg {
  id: string;
  name?: string;
  tags?: string[];
  [key: string]: unknown;
}

export type PublicGalleryScript = Omit<BaseScriptApi, "tags" | "author" | "coverUrl"> & {
  id: string;
  coverUrl?: string;
  tags: string[];
  author?: string | PublicGalleryAuthor | null;
};

export interface HomepageBannerItem {
  id?: string;
  title?: string;
  content?: string;
  link?: string;
  imageUrl?: string;
}

export interface HomepageBanner {
  title?: string;
  content?: string;
  link?: string;
  imageUrl?: string;
  items?: HomepageBannerItem[];
}

let studioPreloadPromise: Promise<unknown> | null = null;
export const preloadStudioEntry = () => {
  if (!studioPreloadPromise) {
    studioPreloadPromise = Promise.all([
      import("../../pages/DashboardPage"),
      import("../../pages/CloudEditorPage"),
    ]).catch(() => {});
  }
  return studioPreloadPromise;
};

export function usePublicGalleryState() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, login, logout } = useAuth();

  const normalizeView = (value: string | null): GalleryView => {
    if (value === "authors" || value === "orgs" || value === "help" || value === "license" || value === "about") return value;
    return "scripts";
  };
  const normalizeViewMode = (value: string | null): GalleryViewMode => (value === "compact" ? "compact" : "standard");
  const normalizeUsageFilter = (value: string | null): "all" | "commercial" =>
    value === "commercial" ? "commercial" : "all";
  const parseTagParam = (value: string | null): string[] => {
    if (!value) return [];
    return value.split(",").map(v => v.trim()).filter(Boolean);
  };

  const view = normalizeView(searchParams.get("view"));
  const selectedTags = parseTagParam(searchParams.get("tag"));
  const selectedAuthorTags = parseTagParam(searchParams.get("authorTag"));
  const selectedOrgTags = parseTagParam(searchParams.get("orgTag"));
  const usageFilter = normalizeUsageFilter(searchParams.get("usage"));
  const segmentFilter = searchParams.get("segment") || SEGMENT_KEYS.all;

  const setView = (next: GalleryView) => {
    const params = new URLSearchParams(searchParams);
    params.set("view", next);
    if (next !== "scripts") params.delete("tag");
    if (next !== "authors") params.delete("authorTag");
    if (next !== "orgs") params.delete("orgTag");
    if (next !== "scripts") params.delete("usage");
    if (next !== "scripts") params.delete("segment");
    setSearchParams(params);
  };

  const setSelectedTags = (tags: string[]) => {
    const params = new URLSearchParams(searchParams);
    if (tags.length > 0) { params.set("tag", tags.join(",")); params.set("view", "scripts"); }
    else params.delete("tag");
    setSearchParams(params);
  };
  const setAuthorTags = (tags: string[]) => {
    const params = new URLSearchParams(searchParams);
    params.set("view", "authors");
    if (tags.length > 0) params.set("authorTag", tags.join(","));
    else params.delete("authorTag");
    setSearchParams(params);
  };
  const setOrgTags = (tags: string[]) => {
    const params = new URLSearchParams(searchParams);
    params.set("view", "orgs");
    if (tags.length > 0) params.set("orgTag", tags.join(","));
    else params.delete("orgTag");
    setSearchParams(params);
  };
  const setUsageFilter = (usage: string) => {
    const params = new URLSearchParams(searchParams);
    if (usage === "all") params.delete("usage"); else params.set("usage", usage);
    params.set("view", "scripts");
    setSearchParams(params);
  };
  const setSegmentFilter = (segment: string) => {
    const params = new URLSearchParams(searchParams);
    if (segment === SEGMENT_KEYS.all) params.delete("segment"); else params.set("segment", segment);
    params.set("view", "scripts");
    setSearchParams(params);
  };

  const [viewMode, setViewMode] = useState<GalleryViewMode>(() => {
    const fromUrl = searchParams.get("mode");
    if (fromUrl) return normalizeViewMode(fromUrl);
    if (typeof window !== "undefined" && window.matchMedia?.("(max-width: 640px)").matches) return "compact";
    return "standard";
  });

  const handleViewModeChange = (mode: GalleryViewMode) => {
    const normalized = normalizeViewMode(mode);
    const params = new URLSearchParams(searchParams);
    params.set("mode", normalized);
    setSearchParams(params);
    setViewMode(normalized);
  };

  const [scripts, setScripts] = useState<PublicGalleryScript[]>([]);
  const [authors, setAuthors] = useState<PublicGalleryAuthor[]>([]);
  const [orgs, setOrgs] = useState<PublicGalleryOrg[]>([]);
  const [topTags, setTopTags] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [featuredLaneMode, setFeaturedLaneMode] = useState<string | boolean>(false);
  const [pendingR18Route, setPendingR18Route] = useState<string | null>(null);
  const [pendingScript, setPendingScript] = useState<{ id: string; tags?: unknown[] } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPeople, setIsLoadingPeople] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [homepageBanner, setHomepageBanner] = useState<HomepageBanner | null>(null);

  const debouncedSearchTerm = useDebouncedSearch(searchTerm, 180);
  const searchNeedle = debouncedSearchTerm.trim().toLowerCase();

  const {
    termsConfig, isTermsConfigLoading,
    termsDialogOpen, setTermsDialogOpen,
    termsScrollRef, termsReadToBottom, termsRequireScroll,
    acceptedChecks, isSubmittingTerms, canConfirmTerms,
    missingRequiredCheckCount, handleTermsScroll, toggleRequiredCheck,
    openTermsDialog, confirmTermsConsent: confirmTermsConsentBase, hasAcceptedTermsVersion,
  } = usePublicTerms({
    onAccepted: (_scriptId) => {
      const script = pendingScript;
      setPendingScript(null);
      if (script) continueToScript(script);
    },
  });

  useEffect(() => {
    getPublicHomepageBanner()
      .then(banner => setHomepageBanner(banner || null))
      .catch(() => setHomepageBanner(null));
  }, []);

  useEffect(() => {
    const loadBundle = async () => {
      setIsLoading(true);
      setIsLoadingPeople(true);
      try {
        const data = await getPublicBundle();
        const scriptsData = data?.scripts || [];
        const personasData = data?.personas || [];
        const orgsData = data?.organizations || [];
        const hotTags = data?.topTags || [];

        const normalized: PublicGalleryScript[] = scriptsData.map((script) => {
          const rawAuthor = script.persona || script.owner || script.author;
          const normalizedAuthor: string | PublicGalleryAuthor | null =
            typeof rawAuthor === "string"
              ? rawAuthor
              : rawAuthor && typeof rawAuthor === "object"
                ? {
                    id: typeof rawAuthor.id === "string" ? rawAuthor.id : undefined,
                    displayName: String(rawAuthor.displayName || rawAuthor.name || ""),
                    avatarUrl:
                      typeof rawAuthor.avatarUrl === "string" ? rawAuthor.avatarUrl
                      : typeof rawAuthor.avatar === "string" ? rawAuthor.avatar
                      : undefined,
                  }
                : null;
          return {
            ...script,
            author: normalizedAuthor,
            coverUrl: typeof script.coverUrl === "string" ? script.coverUrl : undefined,
            tags: (script.tags || []).map((tag) => typeof tag === "string" ? tag : tag?.name).filter(Boolean),
          };
        });
        setScripts(normalized);

        const normalizeEntity = (entity: Record<string, unknown>): PublicGalleryAuthor => ({
          ...entity,
          id: String(entity.id || ""),
          displayName: String(entity.displayName || entity.name || t("publicGallery.unknown")),
          avatar: String(entity.avatar || entity.avatarUrl || entity.logoUrl || "") || undefined,
          tags: (Array.isArray(entity.tags) ? entity.tags : [])
            .map((tag) => (typeof tag === "string" ? tag : String((tag as { name?: unknown })?.name || "")))
            .filter(Boolean),
        });
        setAuthors(personasData.map(normalizeEntity).filter(e => Boolean(e.id)));
        setOrgs(
          orgsData
            .map((o: Record<string, unknown>): PublicGalleryOrg => ({
              ...o,
              id: String(o.id || ""),
              tags: (Array.isArray(o.tags) ? o.tags : [])
                .map((tag) => (typeof tag === "string" ? tag : String((tag as { name?: unknown })?.name || "")))
                .filter(Boolean),
            }))
            .filter(org => Boolean(org.id))
        );
        setTopTags(Array.isArray(hotTags) ? hotTags.map(tag => String(tag || "")).filter(Boolean) : []);
      } catch (e) {
        console.error("Failed to load public bundle:", e);
      } finally {
        setIsLoading(false);
        setIsLoadingPeople(false);
      }
    };
    loadBundle();
  }, []);

  const {
    filteredScripts, topViewedScriptsPreview, latestScriptsPreview,
    featuredLaneScripts, featuredSeries, allTags, licenseTagShortcuts,
    filteredAuthors, filteredOrgs, authorTags, orgTags,
  } = usePublicGalleryFiltering({
    scripts, authors, orgs, searchNeedle,
    selectedTags, selectedAuthorTags, selectedOrgTags,
    segmentFilter, usageFilter, featuredLaneMode,
  });

  const isDefaultView = searchNeedle === "" && selectedTags.length === 0 && usageFilter === "all" && segmentFilter === SEGMENT_KEYS.all;
  const hasScriptFilters = searchNeedle !== "" || selectedTags.length > 0 || usageFilter !== "all" || segmentFilter !== SEGMENT_KEYS.all;

  const mobileResultCount =
    view === "scripts" ? filteredScripts.length :
    view === "authors" ? filteredAuthors.length :
    filteredOrgs.length;

  const activeTagFilterCount =
    view === "scripts" ? selectedTags.length :
    view === "authors" ? selectedAuthorTags.length :
    selectedOrgTags.length;
  const activeScriptExtraFilterCount = (usageFilter !== "all" ? 1 : 0) + (segmentFilter !== SEGMENT_KEYS.all ? 1 : 0);
  const activeMobileFilterCount = activeTagFilterCount + (view === "scripts" ? activeScriptExtraFilterCount : 0);

  const tabs = useMemo(() => ([
    { key: "scripts", label: t("publicTopbar.scripts") },
    { key: "authors", label: t("publicTopbar.authors") },
    { key: "orgs", label: t("publicTopbar.orgs") },
  ]), [t]);

  const scriptSegmentTabs = useMemo(() => ([
    { key: SEGMENT_KEYS.all, label: t("publicGallery.segmentAll", "全部") },
    { key: SEGMENT_KEYS.allAges, label: t("publicGallery.segmentAllAges", "全年齡向") },
    { key: SEGMENT_KEYS.adult, label: t("publicGallery.segmentAdult", "成人向") },
    { key: SEGMENT_KEYS.male, label: t("publicGallery.segmentMale", "男性向") },
    { key: SEGMENT_KEYS.female, label: t("publicGallery.segmentFemale", "女性向") },
  ]), [t]);

  const usageOptions = useMemo(() => ([
    { value: "all", label: t("publicGallery.usageAll") },
    { value: "commercial", label: t("publicGallery.usageCommercial") },
  ]), [t]);

  const featuredViewTabs = useMemo(() => ([
    { key: "featured", label: t("publicGallery.featuredTab", "精選") },
    { key: "top", label: t("publicGallery.categoryTopViewed", "點閱排行") },
    { key: "latest", label: t("publicGallery.categoryLatest", "最新發布") },
    { key: "series", label: t("publicGallery.categorySeries", "熱門系列") },
  ]), [t]);

  useEffect(() => { if (!isDefaultView && featuredLaneMode) setFeaturedLaneMode(false); }, [isDefaultView, featuredLaneMode]);
  useEffect(() => { if (view !== "scripts" && featuredLaneMode) setFeaturedLaneMode(false); }, [view, featuredLaneMode]);

  const continueToScript = (script: { id?: string; tags?: unknown[] }) => {
    if (!script?.id) return;
    const isAdult = script.tags?.some((tag) => {
      const n = String(tag).toLowerCase();
      return n === "r-18" || n === "r18" || n === "成人向";
    });
    if (isAdult && localStorage.getItem("r18_consented") !== "true") {
      setPendingR18Route(script.id);
      return;
    }
    navigate(`/read/${script.id}`);
  };

  const handleScriptClick = (script: { id?: string; tags?: unknown[] }) => {
    if (isTermsConfigLoading) return;
    const version = termsConfig?.version;
    if (!version || hasAcceptedTermsVersion(version)) { continueToScript(script); return; }
    if (!script.id) return;
    setPendingScript({ id: script.id, tags: script.tags });
    openTermsDialog();
  };

  const confirmTermsConsent = () => {
    const pendingId = pendingScript?.id;
    confirmTermsConsentBase(typeof pendingId === "string" ? pendingId : undefined);
  };

  const confirmR18Consent = () => {
    if (pendingR18Route) {
      localStorage.setItem("r18_consented", "true");
      navigate(`/read/${pendingR18Route}`);
      setPendingR18Route(null);
    }
  };

  const resetScriptFilters = () => {
    const params = new URLSearchParams(searchParams);
    params.set("view", "scripts");
    params.delete("usage"); params.delete("segment"); params.delete("tag");
    setSearchParams(params);
    setSearchTerm("");
  };

  return {
    t, navigate, currentUser, login, logout,
    view, setView, normalizeView,
    viewMode, handleViewModeChange, normalizeViewMode,
    selectedTags, setSelectedTags,
    selectedAuthorTags, setAuthorTags,
    selectedOrgTags, setOrgTags,
    usageFilter, setUsageFilter,
    segmentFilter, setSegmentFilter,
    searchTerm, setSearchTerm,
    featuredLaneMode, setFeaturedLaneMode,
    isLoading, isLoadingPeople,
    isMobileFilterOpen, setIsMobileFilterOpen,
    homepageBanner,
    filteredScripts, topViewedScriptsPreview, latestScriptsPreview,
    featuredLaneScripts, featuredSeries,
    allTags, licenseTagShortcuts, topTags,
    filteredAuthors, filteredOrgs, authorTags, orgTags,
    isDefaultView, hasScriptFilters,
    mobileResultCount, activeMobileFilterCount,
    tabs, scriptSegmentTabs, usageOptions, featuredViewTabs,
    handleScriptClick,
    pendingR18Route, setPendingR18Route, confirmR18Consent,
    // terms
    termsDialogOpen, setTermsDialogOpen,
    termsScrollRef, termsReadToBottom, termsRequireScroll,
    acceptedChecks, isSubmittingTerms, canConfirmTerms,
    missingRequiredCheckCount, handleTermsScroll, toggleRequiredCheck,
    confirmTermsConsent, pendingScript, setPendingScript,
    termsConfig,
  };
}
