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
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "../components/ui/sheet";
import { getPublicBundle } from "../lib/api/public";
import { extractMetadataWithRaw } from "../lib/metadataParser";
import { deriveSimpleLicenseTags, parseBasicLicenseFromMeta } from "../lib/licenseRights";
import { normalizeSeriesName, parseSeriesOrder } from "../lib/series";
import { useI18n } from "../contexts/I18nContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../components/ui/alert-dialog";
import { SlidersHorizontal } from "lucide-react";
import { CoverPlaceholder } from "../components/ui/CoverPlaceholder";

const SEGMENT_KEYS = {
  all: "all",
  allAges: "all-ages",
  adult: "adult",
  male: "male",
  female: "female",
};

const SEGMENT_TAGS = {
  [SEGMENT_KEYS.allAges]: ["全年齡向", "一般", "一般內容"],
  [SEGMENT_KEYS.adult]: ["成人向", "R-18", "r18", "18+"],
  [SEGMENT_KEYS.male]: ["男性向"],
  [SEGMENT_KEYS.female]: ["女性向"],
};

const RESERVED_SEGMENT_TAGS = new Set(
  Object.values(SEGMENT_TAGS).flat().map((tag) => String(tag).toLowerCase())
);

export default function PublicGalleryPage() {
  const { t } = useI18n();
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
  const [sortKey, setSortKey] = useState("recent");
  const [pendingR18Route, setPendingR18Route] = useState(null);
  const [viewMode, setViewMode] = useState(() => {
      const fromUrl = searchParams.get("mode");
      if (fromUrl) return fromUrl;
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
  const usageFilter = searchParams.get("usage") || "all";
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
  const handleViewModeChange = (mode) => {
      const params = new URLSearchParams(searchParams);
      params.set("mode", mode);
      setSearchParams(params);
      setViewMode(mode);
  };
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingPeople, setIsLoadingPeople] = useState(true);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

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

  const scriptsWithMeta = useMemo(() => {
      return (scripts || []).map((script) => {
          if (!script?.content) {
              return { ...script, _licenseText: "", _licenseTermsText: "" };
          }
          let meta = {};
          try {
              meta = extractMetadataWithRaw(script.content || "").meta || {};
          } catch {
              meta = {};
          }
          const basicLicense = parseBasicLicenseFromMeta(meta);
          const license = meta.license || meta.licenseName || "";
          const seriesName = normalizeSeriesName(script.series?.name || meta.series || meta.seriesname);
          const seriesOrder = parseSeriesOrder(script.seriesOrder ?? meta.seriesorder ?? meta.episode);
          let terms = meta.licensespecialterms || meta.licenseSpecialTerms || "";
          let licenseTagsFromMeta = meta.licensetags || meta.licenseTags || [];
          if (typeof terms === "string") {
              try {
                  const parsed = JSON.parse(terms);
                  if (Array.isArray(parsed)) terms = parsed;
              } catch {}
          }
          if (typeof licenseTagsFromMeta === "string") {
              try {
                  const parsed = JSON.parse(licenseTagsFromMeta);
                  if (Array.isArray(parsed)) licenseTagsFromMeta = parsed;
              } catch {
                  licenseTagsFromMeta = String(licenseTagsFromMeta)
                    .split(/,|，/)
                    .map((t) => t.trim())
                    .filter(Boolean);
              }
          }
          if (!Array.isArray(licenseTagsFromMeta)) licenseTagsFromMeta = [];
          const termsText = Array.isArray(terms) ? terms.join(" ") : String(terms || "");
          const licenseTags = Array.from(new Set([
            ...deriveSimpleLicenseTags(basicLicense),
            ...licenseTagsFromMeta
          ]));
          const mergedTags = Array.from(new Set([...(script.tags || []), ...licenseTags]));
          return {
              ...script,
              tags: mergedTags,
              _licenseText: [license, ...licenseTags].filter(Boolean).join(" "),
              _licenseTermsText: termsText,
              _derivedLicenseTags: licenseTags,
              _allowCommercial: basicLicense.commercialUse === "allow",
              _seriesName: seriesName,
              _seriesOrder: seriesOrder,
              seriesName,
              seriesOrder,
          };
      });
  }, [scripts]);

  // Filter Logic
  const filteredScripts = scriptsWithMeta.filter(script => {
      const needle = searchTerm.toLowerCase();
      const scriptTagSet = new Set((script.tags || []).map((tag) => String(tag).toLowerCase()));
      const matchesSearch =
          script.title?.toLowerCase().includes(needle) ||
          script.author?.displayName?.toLowerCase().includes(needle) ||
          script._licenseText?.toLowerCase().includes(needle) ||
          script._licenseTermsText?.toLowerCase().includes(needle);
      const matchesTag = selectedTags.length > 0 
        ? (script.tags || []).some(t => selectedTags.includes(t)) 
        : true;
      const matchesSegment = segmentFilter === SEGMENT_KEYS.all
        ? true
        : (SEGMENT_TAGS[segmentFilter] || []).some((tag) => scriptTagSet.has(String(tag).toLowerCase()));
      const matchesUsage =
          usageFilter === "all" ? true :
          usageFilter === "commercial" ? script._allowCommercial === true :
          true;
      return matchesSearch && matchesTag && matchesSegment && matchesUsage;
  }).sort((a, b) => {
      // By default, recent is standard if not sorted
      return (b.lastModified || b.updatedAt || 0) - (a.lastModified || a.updatedAt || 0);
  });

  // Calculate default view lanes (when no filters are actively applied)
  const isDefaultView = searchTerm.trim() === "" && selectedTags.length === 0 && usageFilter === "all" && segmentFilter === SEGMENT_KEYS.all;

  const topViewedScripts = useMemo(() => {
    return [...filteredScripts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 15);
  }, [filteredScripts]);

  const latestScripts = useMemo(() => {
    return [...filteredScripts].sort((a, b) => (b.lastModified || b.updatedAt || 0) - (a.lastModified || a.updatedAt || 0)).slice(0, 15);
  }, [filteredScripts]);
  const featuredSeries = useMemo(() => {
    const buckets = new Map();
    for (const script of scriptsWithMeta || []) {
      const name = normalizeSeriesName(script.seriesName || script._seriesName);
      if (!name) continue;
      const key = name.toLowerCase();
      if (!buckets.has(key)) {
        buckets.set(key, { name, scripts: [], totalViews: 0 });
      }
      const bucket = buckets.get(key);
      bucket.scripts.push(script);
      bucket.totalViews += script.views || 0;
    }
    return Array.from(buckets.values())
      .map((bucket) => {
        const sorted = [...bucket.scripts].sort((a, b) => {
          const aOrder = a.seriesOrder ?? a._seriesOrder ?? Number.MAX_SAFE_INTEGER;
          const bOrder = b.seriesOrder ?? b._seriesOrder ?? Number.MAX_SAFE_INTEGER;
          if (aOrder !== bOrder) return aOrder - bOrder;
          return (b.lastModified || b.updatedAt || 0) - (a.lastModified || a.updatedAt || 0);
        });
        return {
          name: bucket.name,
          totalViews: bucket.totalViews,
          count: bucket.scripts.length,
          lead: sorted[0] || null,
          coverUrl:
            sorted.find((item) => String(item?.series?.coverUrl || "").trim())?.series?.coverUrl ||
            sorted.find((item) => String(item?.coverUrl || "").trim())?.coverUrl ||
            "",
        };
      })
      .filter((series) => series.lead)
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, 10);
  }, [scriptsWithMeta]);

  const allTags = Array.from(
    new Set(
      scriptsWithMeta
        .flatMap((s) => s.tags || [])
        .filter((tag) => !RESERVED_SEGMENT_TAGS.has(String(tag).toLowerCase()))
    )
  );
  const licenseTagShortcuts = Array.from(
    new Set(scriptsWithMeta.flatMap((s) => s._derivedLicenseTags || []))
  );
  const filteredAuthors = authors.filter(a => {
    const matchesSearch = a.displayName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedAuthorTags.length > 0 
      ? (a.tags || []).some(t => selectedAuthorTags.includes(t)) 
      : true;
    return matchesSearch && matchesTag;
  });
  const filteredOrgs = orgs.filter(o => {
    const matchesSearch = o.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTag = selectedOrgTags.length > 0 
      ? (o.tags || []).some(t => selectedOrgTags.includes(t)) 
      : true;
    return matchesSearch && matchesTag;
  });
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
  const allAuthorTags = Array.from(new Set(authors.flatMap(a => a.tags || [])));
  const allOrgTags = Array.from(new Set(orgs.flatMap(o => o.tags || [])));
  const authorTags = allAuthorTags;
  const orgTags = allOrgTags;

  const handleScriptClick = (script) => {
    // Check if the script has an R-18 tag
    const isAdult = script.tags?.some(tag => String(tag).toLowerCase() === "r-18" || String(tag).toLowerCase() === "r18" || String(tag).toLowerCase() === "成人向");
    
    if (isAdult) {
      const hasConsented = localStorage.getItem("r18_consented") === "true";
      if (!hasConsented) {
        setPendingR18Route(script.id);
        return; // Intercept navigation
      }
    }
    
    // Proceed if no tag or already consented
    navigate(`/read/${script.id}`);
  };

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
        tabs={tabs}
        activeTab={view}
        onTabChange={setView}
        actions={
          <div className="flex items-center gap-2">
            <Button className="hidden sm:inline-flex" variant="ghost" size="sm" onClick={() => navigate("/about")}>
              {t("publicGallery.about")}
            </Button>
            {currentUser ? (
              <Button variant="default" size="sm" onClick={() => navigate("/dashboard")}>
                {t("publicGallery.goStudio")}
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={async () => {
                try { await login(); } catch(e) { console.error(e); }
              }}>
                {t("publicGallery.login")}
              </Button>
            )}
          </div>
        }
      />
      <PublicHeroMarquee />

      {/* Main Content */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 pb-20">
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
        <div className="mb-3 flex items-center justify-between lg:hidden">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-full px-3 text-xs"
            onClick={() => setIsMobileFilterOpen(true)}
          >
            <SlidersHorizontal className="mr-1.5 h-3.5 w-3.5" />
            {t("publicGallery.mobileFilter", "篩選與搜尋")}
          </Button>
          <span className="text-xs text-muted-foreground">
            {mobileResultCount} {view === "scripts" ? t("publicReader.worksUnit", "部") : t("publicGallery.results", "筆")}
          </span>
        </div>
        <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar Filters */}
            <aside className="hidden lg:block w-full lg:w-[280px] shrink-0">
                <div className="lg:sticky lg:top-24 space-y-6">
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
              <div className="mb-4 hidden lg:flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5">
                <span className="text-xs font-medium text-foreground">
                  {t("galleryFilterBar.usageRights", "使用權限")}
                </span>
                {usageOptions.map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    size="sm"
                    variant={usageFilter === opt.value ? "default" : "outline"}
                    className="h-7 min-w-[92px] rounded-full px-3 text-xs"
                    onClick={() => setUsageFilter(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {t("publicGallery.viewMode", "顯示模式")}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant={viewMode === "standard" ? "default" : "outline"}
                    className="h-7 rounded-full px-3 text-xs"
                    onClick={() => handleViewModeChange("standard")}
                  >
                    {t("publicGallery.viewStandard", "圖文排版")}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={viewMode === "compact" ? "default" : "outline"}
                    className="h-7 rounded-full px-3 text-xs"
                    onClick={() => handleViewModeChange("compact")}
                  >
                    {t("publicGallery.viewCompact", "緊湊排版")}
                  </Button>
                  {usageFilter !== "all" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => setUsageFilter("all")}
                    >
                      {t("publicGallery.clearFilters")}
                    </Button>
                  )}
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
          ) : isDefaultView ? (
              <div className="space-y-12 animate-in fade-in duration-500">
                  {/* Category Lane: Top Viewed */}
                  {topViewedScripts.length > 0 && (
                      <HorizontalScrollLane title={t("publicGallery.categoryTopViewed", "點閱排行")}>
                          {topViewedScripts.map(script => (
                              <div key={script.id} className="w-[145px] sm:w-[178px] shrink-0 snap-start">
                                  <ScriptGalleryCard 
                                      script={script}
                                      variant="standard"
                                      onClick={() => navigate(`/read/${script.id}`)}
                                  />
                              </div>
                          ))}
                      </HorizontalScrollLane>
                  )}

                  {/* Category Lane: Latest Uploads */}
                  {latestScripts.length > 0 && (
                      <HorizontalScrollLane title={t("publicGallery.categoryLatest", "最新發布")}>
                          {latestScripts.map(script => (
                              <div key={script.id} className="w-[145px] sm:w-[178px] shrink-0 snap-start">
                                  <ScriptGalleryCard 
                                      script={script}
                                      variant="standard"
                                      onClick={() => navigate(`/read/${script.id}`)}
                                  />
                              </div>
                          ))}
                      </HorizontalScrollLane>
                  )}

                  {featuredSeries.length > 0 && (
                      <HorizontalScrollLane title={t("publicGallery.categorySeries", "熱門系列")}>
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
          ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-foreground">
                        {t("publicGallery.searchResults", "篩選結果")} <span className="text-muted-foreground text-sm font-normal">({filteredScripts.length})</span>
                    </h2>
                </div>
                <div
                  className="grid gap-4 sm:gap-5 animate-in fade-in duration-500"
                  style={{
                    gridTemplateColumns:
                      viewMode === "compact"
                        ? "repeat(auto-fill, minmax(280px, 1fr))"
                        : "repeat(auto-fill, minmax(165px, 1fr))",
                  }}
                >
                    {filteredScripts.map(script => (
                        <ScriptGalleryCard 
                            key={script.id}
                            script={script}
                            variant={viewMode === "compact" ? "compact" : "standard"}
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
      </main>

      <Sheet open={isMobileFilterOpen} onOpenChange={setIsMobileFilterOpen}>
        <SheetContent side="left" className="w-[92vw] max-w-none p-0 sm:max-w-sm">
          <SheetHeader className="px-4 pt-4 pb-2 border-b border-border/50">
            <SheetTitle>{t("publicGallery.mobileFilterTitle", "篩選與搜尋")}</SheetTitle>
            <SheetDescription>{t("publicGallery.mobileFilterDesc", "調整搜尋關鍵字與標籤條件。")}</SheetDescription>
          </SheetHeader>
          <div className="h-[calc(100vh-96px)] overflow-y-auto px-4 pb-6">
            {view === "scripts" && (
              <div className="mt-4 space-y-4 rounded-lg border border-border/60 bg-muted/20 p-3">
                <div>
                  <p className="mb-2 text-xs font-medium text-foreground">{t("galleryFilterBar.usageRights", "使用權限")}</p>
                  <div className="flex flex-wrap gap-2">
                    {usageOptions.map((opt) => (
                      <Button
                        key={`mobile-usage-${opt.value}`}
                        type="button"
                        size="sm"
                        variant={usageFilter === opt.value ? "default" : "outline"}
                        className="h-7 rounded-full px-3 text-xs"
                        onClick={() => setUsageFilter(opt.value)}
                      >
                        {opt.label}
                      </Button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-foreground">{t("publicGallery.viewMode", "顯示模式")}</p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={viewMode === "standard" ? "default" : "outline"}
                      className="h-7 rounded-full px-3 text-xs"
                      onClick={() => handleViewModeChange("standard")}
                    >
                      {t("publicGallery.viewStandard", "圖文排版")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={viewMode === "compact" ? "default" : "outline"}
                      className="h-7 rounded-full px-3 text-xs"
                      onClick={() => handleViewModeChange("compact")}
                    >
                      {t("publicGallery.viewCompact", "緊湊排版")}
                    </Button>
                  </div>
                </div>
                {(usageFilter !== "all" || selectedTags.length > 0 || searchTerm.trim()) && (
                  <div className="pt-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setUsageFilter("all");
                        setSelectedTags([]);
                        setSearchTerm("");
                      }}
                    >
                      {t("publicGallery.clearFilters")}
                    </Button>
                  </div>
                )}
              </div>
            )}
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
        </SheetContent>
      </Sheet>

      {/* R-18 Consent Dialog */}
      <AlertDialog open={!!pendingR18Route} onOpenChange={(open) => !open && setPendingR18Route(null)}>
        <AlertDialogContent className="w-[92vw] max-w-[92vw] sm:max-w-md rounded-xl p-4 sm:p-6 gap-3">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-500 font-bold flex items-center gap-2 text-base sm:text-lg leading-snug">
              <span className="text-xl sm:text-2xl">🔞</span>
              <span>內容分級警告 (Adult Content Warning)</span>
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-left">
              <p className="text-[13px] sm:text-sm text-foreground/80 leading-relaxed">
                您即將進入受限制的內容頁面。此作品含有 <strong>成人向(R-18)</strong> 的標籤，可能包含不適合未成年人觀看的成人題材、暴力或過度裸露內容。
              </p>
              <p className="text-sm sm:text-[15px] font-medium text-destructive">
                請問您是否已滿 18 歲，並願意觀看此內容？
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2 sm:mt-4 gap-2 sm:gap-0">
            <AlertDialogCancel className="w-full sm:w-auto h-10" onClick={() => setPendingR18Route(null)}>
              返回 (Go Back)
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmR18Consent}
              className="w-full sm:w-auto h-10 bg-red-600 hover:bg-red-700 text-white"
            >
              已滿 18 歲，進入觀看 (I am 18+, Enter)
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
