import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { GalleryFilterBar } from "../components/gallery/GalleryFilterBar";
import { HorizontalScrollLane } from "../components/gallery/HorizontalScrollLane";
import { ScriptGalleryCard } from "../components/gallery/ScriptGalleryCard";
import { AuthorGalleryCard } from "../components/gallery/AuthorGalleryCard";
import { OrgGalleryCard } from "../components/gallery/OrgGalleryCard";
import { Button } from "../components/ui/button";
import { PublicTopBar } from "../components/public/PublicTopBar";
import { PublicHeroMarquee } from "../components/public/PublicHeroMarquee";
import { GalleryMobileFilterSheet } from "../components/gallery/GalleryMobileFilterSheet";
import { R18ConsentDialog } from "../components/public/R18ConsentDialog";
import { getPublicBundle, getPublicHomepageBanner } from "../lib/api/public";
import { useI18n } from "../contexts/I18nContext";
import { CircleHelp, LayoutDashboard, LogIn, Scale, Search, SlidersHorizontal, X } from "lucide-react";
import { HelpView } from "../components/gallery/views/HelpView";
import { AboutView } from "../components/gallery/views/AboutView";
import { LicenseView } from "../components/gallery/views/LicenseView";
import { CoverPlaceholder } from "../components/ui/CoverPlaceholder";
import { Input } from "../components/ui/input";
import { usePublicTerms } from "../hooks/public/usePublicTerms";
import { useDebouncedSearch } from "../hooks/useDebouncedSearch";
import { TermsConsentDialog } from "../components/public/TermsConsentDialog";
import { usePublicGalleryFiltering } from "../hooks/public/usePublicGalleryFiltering";

const SEGMENT_KEYS = {
  all: "all",
  allAges: "all-ages",
  adult: "adult",
  male: "male",
  female: "female",
};

const FEATURED_TAB_KEYS = {
  featured: "featured",
  top: "top",
  latest: "latest",
  series: "series",
};

let studioPreloadPromise = null;
const preloadStudioEntry = () => {
  if (!studioPreloadPromise) {
    studioPreloadPromise = Promise.all([
      import("./DashboardPage"),
      import("./CloudEditorPage"),
    ]).catch(() => {});
  }
  return studioPreloadPromise;
};

export default function PublicGalleryPage() {
  const { t } = useI18n();
  const appVersion = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser, login } = useAuth();
  const view = searchParams.get("view") || "scripts";
  const authorTag = searchParams.get("authorTag");
  const orgTag = searchParams.get("orgTag");
  const setView = (next) => {
      const params = new URLSearchParams(searchParams);
      params.set("view", next);
      if (next !== "scripts") params.delete("tag");
      if (next !== "authors") params.delete("authorTag");
      if (next !== "orgs") params.delete("orgTag");
      if (next !== "scripts") params.delete("usage");
      if (next !== "scripts") params.delete("segment");
      setSearchParams(params);
  };
  const [scripts, setScripts] = useState([]);
  const [authors, setAuthors] = useState([]);
  const [orgs, setOrgs] = useState([]);
  const [topTags, setTopTags] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [featuredLaneMode, setFeaturedLaneMode] = useState(null);
  const [pendingR18Route, setPendingR18Route] = useState(null);
  const [pendingScript, setPendingScript] = useState(null);

  const {
    termsConfig,
    isTermsConfigLoading,
    termsDialogOpen,
    setTermsDialogOpen,
    termsScrollRef,
    termsReadToBottom,
    termsRequireScroll,
    acceptedChecks,
    isSubmittingTerms,
    canConfirmTerms,
    missingRequiredCheckCount,
    handleTermsScroll,
    toggleRequiredCheck,
    openTermsDialog,
    confirmTermsConsent: confirmTermsConsentBase,
    hasAcceptedTermsVersion,
  } = usePublicTerms({
    onAccepted: (scriptId) => {
      const script = pendingScript;
      setPendingScript(null);
      if (script) continueToScript(script);
    },
  });
  const normalizeViewMode = (value) => (value === "compact" ? "compact" : "standard");
  const normalizeUsageFilter = (value) => (value === "commercial" ? "commercial" : "all");

  const [viewMode, setViewMode] = useState(() => {
      const fromUrl = searchParams.get("mode");
      if (fromUrl) return normalizeViewMode(fromUrl);
      if (typeof window !== "undefined") {
          if (window.matchMedia && window.matchMedia("(max-width: 640px)").matches) {
              return "compact";
          }
      }
      return "standard";
  });
  const parseTagParam = (value) => {
      if (!value) return [];
      return value.split(",").map(v => v.trim()).filter(Boolean);
  };
  // Sync selected tags with URL params
  const selectedTags = parseTagParam(searchParams.get("tag"));
  const selectedAuthorTags = parseTagParam(searchParams.get("authorTag"));
  const selectedOrgTags = parseTagParam(searchParams.get("orgTag"));
  const usageFilter = normalizeUsageFilter(searchParams.get("usage"));
  const segmentFilter = searchParams.get("segment") || SEGMENT_KEYS.all;

  const setSelectedTags = (tags) => {
      const params = new URLSearchParams(searchParams);
      if (tags.length > 0) {
          params.set("tag", tags.join(","));
          params.set("view", "scripts");
      } else {
          params.delete("tag");
      }
      setSearchParams(params);
  };
  const setAuthorTags = (tags) => {
      const params = new URLSearchParams(searchParams);
      params.set("view", "authors");
      if (tags.length > 0) {
        params.set("authorTag", tags.join(","));
      } else {
        params.delete("authorTag");
      }
      setSearchParams(params);
  };
  const setOrgTags = (tags) => {
      const params = new URLSearchParams(searchParams);
      params.set("view", "orgs");
      if (tags.length > 0) {
        params.set("orgTag", tags.join(","));
      } else {
        params.delete("orgTag");
      }
      setSearchParams(params);
  };
  const setUsageFilter = (usage) => {
      const params = new URLSearchParams(searchParams);
      if (usage === "all") params.delete("usage");
      else params.set("usage", usage);
      params.set("view", "scripts");
      setSearchParams(params);
  };
  const setSegmentFilter = (segment) => {
      const params = new URLSearchParams(searchParams);
      if (segment === SEGMENT_KEYS.all) params.delete("segment");
      else params.set("segment", segment);
      params.set("view", "scripts");
      setSearchParams(params);
  };
  const resetScriptFilters = () => {
      const params = new URLSearchParams(searchParams);
      params.set("view", "scripts");
      params.delete("usage");
      params.delete("segment");
      params.delete("tag");
      setSearchParams(params);
      setSearchTerm("");
  };
  const handleViewModeChange = (mode) => {
      const normalized = normalizeViewMode(mode);
      const params = new URLSearchParams(searchParams);
      params.set("mode", normalized);
      setSearchParams(params);
      setViewMode(normalized);
  };
  const debouncedSearchTerm = useDebouncedSearch(searchTerm, 180);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPeople, setIsLoadingPeople] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [homepageBanner, setHomepageBanner] = useState(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(() => {
        preloadStudioEntry();
      });
      return () => window.cancelIdleCallback(idleId);
    }
    const timeoutId = window.setTimeout(() => {
      preloadStudioEntry();
    }, 600);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const loadHomepageBanner = async () => {
      try {
        const banner = await getPublicHomepageBanner();
        setHomepageBanner(banner || null);
      } catch (error) {
        console.error("Failed to load homepage banner", error);
        setHomepageBanner(null);
      }
    };
    loadHomepageBanner();
  }, []);

  // Data Fetching
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

          const normalized = scriptsData.map((script) => ({
              ...script,
              author: script.persona || script.owner || script.author,
              tags: (script.tags || []).map((tag) =>
                typeof tag === "string" ? tag : tag?.name
              ).filter(Boolean),
          }));
          setScripts(normalized);

          const normalizeEntity = (entity) => ({
              ...entity,
              displayName: entity.displayName || entity.name || t("publicGallery.unknown"),
              avatar: entity.avatar || entity.avatarUrl || entity.logoUrl || null,
              tags: (entity.tags || []).map(t => typeof t === "string" ? t : t?.name).filter(Boolean)
          });

          setAuthors(personasData.map(normalizeEntity));
          setOrgs(orgsData.map(o => ({
              ...o,
              tags: (o.tags || []).map(t => typeof t === "string" ? t : t?.name).filter(Boolean)
          })));
          setTopTags(hotTags);
      } catch (e) {
          console.error("Failed to load public bundle:", e);
      } finally {
          setIsLoading(false);
          setIsLoadingPeople(false);
      }
    };
    loadBundle();
  }, []);

  const searchNeedle = debouncedSearchTerm.trim().toLowerCase();

  const {
    scriptsWithMeta,
    filteredScripts,
    topViewedScripts,
    latestScripts,
    topViewedScriptsPreview,
    latestScriptsPreview,
    featuredLaneScripts,
    featuredSeries,
    allTags,
    licenseTagShortcuts,
    filteredAuthors,
    filteredOrgs,
    authorTags: hookAuthorTags,
    orgTags: hookOrgTags,
  } = usePublicGalleryFiltering({
    scripts,
    authors,
    orgs,
    searchNeedle,
    selectedTags,
    selectedAuthorTags,
    selectedOrgTags,
    segmentFilter,
    usageFilter,
    featuredLaneMode,
  });

  // Calculate default view lanes (when no filters are actively applied)
  const isDefaultView = searchNeedle === "" && selectedTags.length === 0 && usageFilter === "all" && segmentFilter === SEGMENT_KEYS.all;
  const mobileResultCount =
    view === "scripts" ? filteredScripts.length :
    view === "authors" ? filteredAuthors.length :
    filteredOrgs.length;
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
    { key: FEATURED_TAB_KEYS.featured, label: t("publicGallery.featuredTab", "精選") },
    { key: FEATURED_TAB_KEYS.top, label: t("publicGallery.categoryTopViewed", "點閱排行") },
    { key: FEATURED_TAB_KEYS.latest, label: t("publicGallery.categoryLatest", "最新發布") },
    { key: FEATURED_TAB_KEYS.series, label: t("publicGallery.categorySeries", "熱門系列") },
  ]), [t]);
  const hasScriptFilters = searchNeedle !== "" || selectedTags.length > 0 || usageFilter !== "all" || segmentFilter !== SEGMENT_KEYS.all;
  useEffect(() => {
    if (!isDefaultView && featuredLaneMode) setFeaturedLaneMode(null);
  }, [isDefaultView, featuredLaneMode]);
  useEffect(() => {
    if (view !== "scripts" && featuredLaneMode) setFeaturedLaneMode(null);
  }, [view, featuredLaneMode]);
  const activeTagFilterCount =
    view === "scripts" ? selectedTags.length :
    view === "authors" ? selectedAuthorTags.length :
    selectedOrgTags.length;
  const activeScriptExtraFilterCount =
    (usageFilter !== "all" ? 1 : 0) + (segmentFilter !== SEGMENT_KEYS.all ? 1 : 0);
  const activeMobileFilterCount =
    activeTagFilterCount + (view === "scripts" ? activeScriptExtraFilterCount : 0);
  const authorTags = hookAuthorTags;
  const orgTags = hookOrgTags;

  const continueToScript = (script) => {
    if (!script?.id) return;
    const isAdult = script.tags?.some((tag) => {
      const normalized = String(tag).toLowerCase();
      return normalized === "r-18" || normalized === "r18" || normalized === "成人向";
    });

    if (isAdult) {
      const hasConsented = localStorage.getItem("r18_consented") === "true";
      if (!hasConsented) {
        setPendingR18Route(script.id);
        return;
      }
    }

    navigate(`/read/${script.id}`);
  };

  const handleScriptClick = (script) => {
    if (isTermsConfigLoading) return;
    const version = termsConfig?.version;
    if (!version || hasAcceptedTermsVersion(version)) {
      continueToScript(script);
      return;
    }
    setPendingScript(script);
    openTermsDialog();
  };

  const confirmTermsConsent = () => confirmTermsConsentBase(pendingScript?.id);

  const confirmR18Consent = () => {
    if (pendingR18Route) {
      localStorage.setItem("r18_consented", "true");
      navigate(`/read/${pendingR18Route}`);
      setPendingR18Route(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <PublicTopBar
        fullBleed
        tabs={tabs}
        activeTab={view}
        onTabChange={setView}
        actions={
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-10 lg:hidden"
              onClick={() => setIsMobileFilterOpen(true)}
              title={t("publicGallery.mobileFilter", "篩選")}
              aria-label={t("publicGallery.mobileFilter", "篩選")}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-10 px-0 sm:w-auto sm:px-3"
                onClick={() => setView("license")}
                title={t("publicGallery.licenseTerms")}
                aria-label={t("publicGallery.licenseTerms")}
              >
                <Scale className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{t("publicGallery.licenseTerms")}</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-10 px-0 sm:w-auto sm:px-3"
                onClick={() => setView("help")}
                title={t("publicGallery.help")}
                aria-label={t("publicGallery.help")}
              >
                <CircleHelp className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{t("publicGallery.help")}</span>
              </Button>
            </div>
            {currentUser ? (
              <Button
                variant="default"
                size="sm"
                className="w-10 px-0 sm:w-auto sm:px-3"
                onClick={() => navigate("/dashboard")}
                onMouseEnter={preloadStudioEntry}
                onFocus={preloadStudioEntry}
                title={t("publicGallery.goStudio")}
                aria-label={t("publicGallery.goStudio")}
              >
                <LayoutDashboard className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{t("publicGallery.goStudio")}</span>
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-10 px-0 sm:w-auto sm:px-3"
                onClick={async () => {
                  try { await login(); } catch(e) { console.error(e); }
                }}
                onMouseEnter={preloadStudioEntry}
                onFocus={preloadStudioEntry}
                title={t("publicGallery.login")}
                aria-label={t("publicGallery.login")}
              >
                <LogIn className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">{t("publicGallery.login")}</span>
              </Button>
            )}
          </div>
        }
      />
      {view === "scripts" ? (
        <PublicHeroMarquee
          fullBleed
          slides={(() => {
            const items = Array.isArray(homepageBanner?.items) ? homepageBanner.items : [];
            const valid = items.filter((item) => item && (item.title || item.content || item.link || item.imageUrl));
            if (valid.length > 0) {
              return valid.map((item, idx) => ({
                id: item.id || `admin-homepage-banner-${idx + 1}`,
                title: item.title || "",
                content: item.content || "",
                subtitle: item.content || "",
                link: item.link || "",
                imageUrl: item.imageUrl || "",
              }));
            }
            if (homepageBanner && (homepageBanner.title || homepageBanner.content || homepageBanner.link || homepageBanner.imageUrl)) {
              return [{
                id: "admin-homepage-banner",
                title: homepageBanner.title || "",
                content: homepageBanner.content || "",
                subtitle: homepageBanner.content || "",
                link: homepageBanner.link || "",
                imageUrl: homepageBanner.imageUrl || "",
              }];
            }
            return undefined;
          })()}
        />
      ) : null}

      {/* Main Content */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-5 sm:py-8 pb-20">
        {view === "scripts" && (
          <div className="mb-4 sm:mb-6 overflow-x-auto border-b border-border/70">
            <div className="flex min-w-max items-end gap-1">
              {scriptSegmentTabs.map((segment) => (
                <button
                  key={segment.key}
                  type="button"
                  onClick={() => setSegmentFilter(segment.key)}
                  className={`whitespace-nowrap px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                    segmentFilter === segment.key
                      ? "border-primary text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  {segment.label}
                </button>
              ))}
            </div>
          </div>
        )}
        {view === "scripts" && isDefaultView && (
          <div className="mb-4 overflow-x-auto lg:hidden">
            <div className="flex min-w-max items-center gap-2">
              {featuredViewTabs.map((tab) => {
                const isActive = (featuredLaneMode || FEATURED_TAB_KEYS.featured) === tab.key;
                return (
                  <Button
                    key={tab.key}
                    type="button"
                    size="sm"
                    variant={isActive ? "default" : "outline"}
                    className={`h-8 rounded-full px-3 text-xs ${
                      isActive
                        ? "border border-primary bg-primary text-primary-foreground shadow ring-1 ring-primary/35"
                        : "border-border/60 bg-background text-muted-foreground"
                    }`}
                    onClick={() => setFeaturedLaneMode(tab.key === FEATURED_TAB_KEYS.featured ? null : tab.key)}
                  >
                    {tab.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
        {["scripts", "authors", "orgs"].includes(view) && <>
        <div className="mb-3 space-y-2 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={
                  view === "scripts" ? t("publicGallery.searchScripts", "搜尋劇本...") :
                  view === "authors" ? t("publicGallery.searchAuthors", "搜尋作者...") :
                  t("publicGallery.searchOrgs", "搜尋組織...")
                }
                className="h-9 rounded-full border-border/70 bg-background/90 pl-8 pr-8 text-sm"
              />
              {searchTerm ? (
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setSearchTerm("")}
                  aria-label={t("publicGallery.clearSearch", "清除搜尋")}
                  title={t("publicGallery.clearSearch", "清除搜尋")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="relative h-9 rounded-full px-3 text-xs"
              onClick={() => setIsMobileFilterOpen(true)}
            >
              <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
              {t("publicGallery.mobileFilter", "篩選")}
              {activeMobileFilterCount > 0 ? (
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                  {activeMobileFilterCount}
                </span>
              ) : null}
            </Button>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {mobileResultCount} {view === "scripts" ? t("publicReader.worksUnit", "部") : t("publicGallery.results", "筆")}
            </span>
            {view === "scripts" && hasScriptFilters ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 rounded-full px-2 text-xs text-muted-foreground"
                onClick={resetScriptFilters}
              >
                {t("publicGallery.clearFilters")}
              </Button>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">

          <aside id="desktop-filter-panel" className="hidden lg:block w-[280px] shrink-0">
            <div className="sticky top-24 rounded-2xl border border-border/70 bg-card/70 px-4 py-3 shadow-sm backdrop-blur">
              <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">
                {t("publicGallery.mobileFilterTitle", "篩選與搜尋")}
              </p>
              <GalleryFilterBar
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                selectedTags={
                  view === "scripts" ? selectedTags :
                  view === "authors" ? selectedAuthorTags :
                  selectedOrgTags
                }
                onSelectTags={
                  view === "scripts" ? setSelectedTags :
                  view === "authors" ? setAuthorTags :
                  setOrgTags
                }
                featuredTags={view === "scripts" ? topTags : []}
                tags={
                  view === "scripts" ? allTags :
                  view === "authors" ? authorTags :
                  orgTags
                }
                placeholder={
                  view === "scripts" ? t("publicGallery.searchScripts", "搜尋劇本...") :
                  view === "authors" ? t("publicGallery.searchAuthors", "搜尋作者...") :
                  t("publicGallery.searchOrgs", "搜尋組織...")
                }
                showViewToggle={false}
                viewValue={viewMode}
                onViewChange={handleViewModeChange}
                viewOptions={[
                  { value: "standard", label: t("publicGallery.viewStandard", "圖文排版") },
                  { value: "compact", label: t("publicGallery.viewCompact", "緊湊排版") }
                ]}
                quickFilters={[]}
                quickTagFilters={view === "scripts" ? [
                  ...licenseTagShortcuts.map((tag) => ({
                    value: tag,
                    label: tag.replace(/^授權:/, "").replace(/^License:/, "")
                  }))
                ] : []}
              />
            </div>
          </aside>

          <div className="flex-1 min-w-0 flex flex-col">
            {view === "scripts" && (
              <div className="mb-4 hidden lg:flex items-center gap-4 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="shrink-0 text-xs font-medium text-foreground">
                    {t("galleryFilterBar.usageRights", "使用權限")}
                  </span>
                  {usageOptions.map((opt) => (
                    <Button
                      key={opt.value}
                      type="button"
                      size="sm"
                      variant={usageFilter === opt.value ? "default" : "outline"}
                      className={`h-7 min-w-[92px] rounded-full px-3 text-xs transition-colors ${
                        usageFilter === opt.value
                          ? "border border-primary bg-primary text-primary-foreground shadow ring-1 ring-primary/35"
                          : "border-transparent bg-transparent text-muted-foreground shadow-none hover:bg-muted/60 hover:text-foreground"
                      }`}
                      onClick={() => setUsageFilter(opt.value)}
                    >
                      {opt.label}
                    </Button>
                  ))}
                  {hasScriptFilters && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={resetScriptFilters}
                    >
                      {t("publicGallery.clearFilters")}
                    </Button>
                  )}
                </div>

                <div className="h-6 w-px bg-border/70" aria-hidden="true" />

                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-xs font-medium text-foreground">
                    {t("publicGallery.viewMode", "顯示模式")}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant={viewMode === "standard" ? "default" : "outline"}
                    className={`h-7 rounded-full px-3 text-xs transition-colors ${
                      viewMode === "standard"
                        ? "border border-primary bg-primary text-primary-foreground shadow ring-1 ring-primary/35"
                        : "border-transparent bg-transparent text-muted-foreground shadow-none hover:bg-muted/60 hover:text-foreground"
                    }`}
                    onClick={() => handleViewModeChange("standard")}
                  >
                    {t("publicGallery.viewStandard", "圖文排版")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={viewMode === "compact" ? "default" : "outline"}
                    className={`h-7 rounded-full px-3 text-xs transition-colors ${
                      viewMode === "compact"
                        ? "border border-primary bg-primary text-primary-foreground shadow ring-1 ring-primary/35"
                        : "border-transparent bg-transparent text-muted-foreground shadow-none hover:bg-muted/60 hover:text-foreground"
                    }`}
                    onClick={() => handleViewModeChange("compact")}
                  >
                    {t("publicGallery.viewCompact", "緊湊排版")}
                  </Button>
                </div>
              </div>
            )}
            {view === "scripts" && (
          isLoading ? (
              <div
                className="grid gap-4 sm:gap-5"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}
              >
                  {[1,2,3,4,5].map(i => (
                      <div key={i} className="aspect-[2/3] bg-muted/30 animate-pulse rounded-lg" />
                  ))}
              </div>
          ) : viewMode === "compact" ? (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">
                        {isDefaultView ? t("publicGallery.scripts", "作品列表") : t("publicGallery.searchResults", "篩選結果")} <span className="text-muted-foreground text-sm font-normal">({filteredScripts.length})</span>
                    </h2>
                </div>
                <div className="overflow-hidden rounded-xl border border-border/65 bg-background/55 divide-y divide-border/55">
                    {filteredScripts.map(script => (
                        <ScriptGalleryCard
                            key={script.id}
                            script={script}
                            variant="compact"
                            onClick={() => handleScriptClick(script)}
                        />
                    ))}
                </div>
              </div>
          ) : isDefaultView && !featuredLaneMode ? (
              <div className="space-y-12 animate-in fade-in duration-500">
                  {/* Category Lane: Top Viewed */}
                  {topViewedScriptsPreview.length > 0 && (
                      <HorizontalScrollLane
                        title={t("publicGallery.categoryTopViewed", "點閱排行")}
                        actionLabel={t("publicGallery.viewAll", "查看全部")}
                        onAction={() => setFeaturedLaneMode("top")}
                      >
                          {topViewedScriptsPreview.map(script => (
                              <div
                                key={script.id}
                                className="w-[145px] sm:w-[178px] shrink-0 snap-start"
                              >
                                  <ScriptGalleryCard 
                                      script={script}
                                      variant="standard"
                                      onClick={() => handleScriptClick(script)}
                                  />
                              </div>
                          ))}
                      </HorizontalScrollLane>
                  )}

                  {/* Category Lane: Latest Uploads */}
                  {latestScriptsPreview.length > 0 && (
                      <HorizontalScrollLane
                        title={t("publicGallery.categoryLatest", "最新發布")}
                        actionLabel={t("publicGallery.viewAll", "查看全部")}
                        onAction={() => setFeaturedLaneMode("latest")}
                      >
                          {latestScriptsPreview.map(script => (
                              <div
                                key={script.id}
                                className="w-[145px] sm:w-[178px] shrink-0 snap-start"
                              >
                                  <ScriptGalleryCard 
                                      script={script}
                                      variant="standard"
                                      onClick={() => handleScriptClick(script)}
                                  />
                              </div>
                          ))}
                      </HorizontalScrollLane>
                  )}

                  {featuredSeries.length > 0 && (
                      <HorizontalScrollLane
                        title={t("publicGallery.categorySeries", "熱門系列")}
                        actionLabel={t("publicGallery.viewAll", "查看全部")}
                        onAction={() => setFeaturedLaneMode("series")}
                      >
                          {featuredSeries.map((series) => (
                              <button
                                key={series.name}
                                type="button"
                                className="w-[145px] sm:w-[178px] shrink-0 snap-start text-left group"
                                onClick={() => navigate(`/series/${encodeURIComponent(series.name)}`)}
                              >
                                <div className="aspect-[2/3] overflow-hidden rounded-lg border border-border/60 bg-muted/25">
                                  {series.coverUrl ? (
                                    <img
                                      src={series.coverUrl}
                                      alt={series.name}
                                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                      loading="lazy"
                                    />
                                  ) : (
                                    <CoverPlaceholder title={series.name} compact />
                                  )}
                                </div>
                                <div className="pt-2">
                                  <p className="line-clamp-1 text-sm font-semibold text-foreground group-hover:text-primary">{series.name}</p>
                                  <p className="line-clamp-1 text-[11px] text-muted-foreground">{series.count} {t("publicReader.worksUnit", "部")}</p>
                                </div>
                              </button>
                          ))}
                      </HorizontalScrollLane>
                  )}
              </div>
          ) : featuredLaneMode === "series" ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">
                        {t("publicGallery.categorySeries", "熱門系列")} <span className="text-muted-foreground text-sm font-normal">({featuredSeries.length})</span>
                    </h2>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setFeaturedLaneMode(null)}
                    >
                      {t("publicGallery.backToFeatured", "返回精選")}
                    </Button>
                </div>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {featuredSeries.map((series) => (
                    <button
                      key={series.name}
                      type="button"
                      className="text-left group"
                      onClick={() => navigate(`/series/${encodeURIComponent(series.name)}`)}
                    >
                      <div className="aspect-[2/3] overflow-hidden rounded-lg border border-border/60 bg-muted/25">
                        {series.coverUrl ? (
                          <img
                            src={series.coverUrl}
                            alt={series.name}
                            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                            loading="lazy"
                          />
                        ) : (
                          <CoverPlaceholder title={series.name} compact />
                        )}
                      </div>
                      <div className="pt-2">
                        <p className="line-clamp-1 text-sm font-semibold text-foreground group-hover:text-primary">{series.name}</p>
                        <p className="line-clamp-1 text-[11px] text-muted-foreground">{series.count} {t("publicReader.worksUnit", "部")}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
          ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">
                        {featuredLaneMode === "top"
                          ? t("publicGallery.categoryTopViewed", "點閱排行")
                          : featuredLaneMode === "latest"
                          ? t("publicGallery.categoryLatest", "最新發布")
                          : t("publicGallery.searchResults", "篩選結果")}{" "}
                        <span className="text-muted-foreground text-sm font-normal">({featuredLaneScripts.length})</span>
                    </h2>
                    {featuredLaneMode ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setFeaturedLaneMode(null)}
                      >
                        {t("publicGallery.backToFeatured", "返回精選")}
                      </Button>
                    ) : null}
                </div>
                <div
                  className="grid gap-4 sm:gap-5 animate-in fade-in duration-500"
                  style={{
                    gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))",
                  }}
                >
                    {featuredLaneScripts.map(script => (
                        <ScriptGalleryCard 
                            key={script.id}
                            script={script}
                            variant="standard"
                            onClick={() => handleScriptClick(script)}
                        />
                    ))}
                </div>
              </div>
          )
        )}

        {view === "scripts" && !isLoading && filteredScripts.length === 0 && (
          <div className="py-20 text-center text-muted-foreground">
              <p>{t("publicGallery.emptyScripts")}</p>
              <Button variant="link" onClick={() => { setSearchTerm(""); setSelectedTags([]); setUsageFilter("all"); setSegmentFilter(SEGMENT_KEYS.all); }}>
                  {t("publicGallery.clearFilters")}
              </Button>
          </div>
        )}

        {view === "authors" && (
          isLoadingPeople ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-32 bg-muted/30 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
              {filteredAuthors.map(author => (
                <AuthorGalleryCard
                  key={author.id}
                  author={author}
                  onClick={() => navigate(`/author/${author.id}`)}
                  onTagClick={(tag) => setAuthorTags([tag])}
                />
              ))}
            </div>
          )
        )}
        
        {view === "authors" && !isLoadingPeople && filteredAuthors.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-10">
                <p>{t("publicGallery.emptyAuthors")}</p>
            </div>
        )}

        {view === "orgs" && (
          isLoadingPeople ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-32 bg-muted/30 animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
              {filteredOrgs.map(org => (
                <OrgGalleryCard
                  key={org.id}
                  org={org}
                  onClick={() => navigate(`/org/${org.id}`)}
                  onTagClick={(tag) => setOrgTags([tag])}
                />
              ))}
            </div>
          )
        )}

        {view === "orgs" && !isLoadingPeople && filteredOrgs.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-10">
                <p>{t("publicGallery.emptyOrgs")}</p>
            </div>
        )}
          </div>
        </div>
        </>}
        {view === "help" && <HelpView />}
        {view === "license" && <LicenseView />}
        {view === "about" && <AboutView />}
      </main>

      <footer className="border-t border-border/60 bg-muted/20">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">{t("publicGallery.footerText")}</p>
          <div className="flex items-center gap-3">
            <span className="text-[10px] tracking-wide text-muted-foreground/70">v{appVersion}</span>
            <Button variant="link" size="sm" className="h-auto px-0 text-xs" onClick={() => setView("about")}>
              {t("publicGallery.about")}
            </Button>
          </div>
        </div>
      </footer>

      <GalleryMobileFilterSheet
        open={isMobileFilterOpen}
        onOpenChange={setIsMobileFilterOpen}
        view={view}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedTags={selectedTags}
        selectedAuthorTags={selectedAuthorTags}
        selectedOrgTags={selectedOrgTags}
        onSelectScriptTags={setSelectedTags}
        onSelectAuthorTags={setAuthorTags}
        onSelectOrgTags={setOrgTags}
        allTags={allTags}
        authorTags={authorTags}
        orgTags={orgTags}
        topTags={topTags}
        licenseTagShortcuts={licenseTagShortcuts}
        usageFilter={usageFilter}
        usageOptions={usageOptions}
        onSetUsageFilter={setUsageFilter}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        hasScriptFilters={hasScriptFilters}
        onResetScriptFilters={resetScriptFilters}
      />

      <TermsConsentDialog
        open={termsDialogOpen}
        onOpenChange={(open) => { if (!open && !isSubmittingTerms) { setTermsDialogOpen(false); setPendingScript(null); } }}
        termsConfig={termsConfig}
        termsScrollRef={termsScrollRef}
        termsReadToBottom={termsReadToBottom}
        termsRequireScroll={termsRequireScroll}
        acceptedChecks={acceptedChecks}
        isSubmittingTerms={isSubmittingTerms}
        canConfirmTerms={canConfirmTerms}
        missingRequiredCheckCount={missingRequiredCheckCount}
        handleTermsScroll={handleTermsScroll}
        toggleRequiredCheck={toggleRequiredCheck}
        onConfirm={confirmTermsConsent}
        onCancel={() => { setTermsDialogOpen(false); setPendingScript(null); }}
      />

      <R18ConsentDialog
        open={!!pendingR18Route}
        onOpenChange={(open) => !open && setPendingR18Route(null)}
        onConfirm={confirmR18Consent}
      />

    </div>
  );
}
