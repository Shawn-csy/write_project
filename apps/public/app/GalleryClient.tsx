"use client";

import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import type { ExternalPublicScript, PublicOrg, PublicPersona, PublicScript } from "@/lib/types";
import {
  PublicHeroMarquee,
  GalleryHoverPreviewProvider,
  type HeroSlide,
  type HeroImageRenderer,
  type HeroSlideContentRenderer,
} from "@write/public-ui";
import { HeroImage } from "@/components/HeroImage";
import { SlidersHorizontal, PanelLeftClose, PanelLeftOpen, List } from "lucide-react";
import { GalleryFilterPanel } from "./gallery/GalleryFilterPanel";
import { GallerySegmentBar } from "./gallery/GallerySegmentBar";
import { GalleryViewModeToggle } from "./gallery/GalleryViewModeToggle";
const GalleryListOverlay = lazy(() => import("./gallery/GalleryListOverlay").then(m => ({ default: m.GalleryListOverlay })));
import { GalleryMobileSheet } from "./gallery/GalleryMobileSheet";
import { GalleryAuthorGrid, GalleryOrgGrid } from "./gallery/GalleryPeopleGrid";
import { GalleryScriptResults } from "./gallery/GalleryScriptResults";
import { GalleryTopBar } from "./gallery/GalleryTopBar";
import { LazyPublicFeedbackDialog } from "@/components/LazyPublicFeedbackDialog";
import { GalleryBrandHeroSlide } from "./gallery/GalleryBrandHeroSlide";
import { GallerySearchField } from "./gallery/GallerySearchField";
import { GallerySortControl, type GallerySortValue } from "./gallery/GallerySortControl";
import { GalleryFilterSummary, type ActiveGalleryFilterChip } from "./gallery/GalleryFilterSummary";
import { buildHomepageHeroSlides, type BrandHeroSlide } from "./gallery/homepageHeroModel";
import { useGalleryController } from "./gallery/useGalleryController";
import { useGalleryLayoutState } from "./gallery/useGalleryLayoutState";
import type { PublicHomepageUrlState } from "./gallery/useGalleryUrlState";
import { PublicFooter } from "@/components/PublicFooter";
import { HomepageActivityBanner } from "./gallery/HomepageActivityBanner";
import type { HomepageActivity } from "@/lib/homepageBundle";

interface Props {
  initialScripts: PublicScript[];
  initialExternalPublicScripts: ExternalPublicScript[];
  initialPersonas?: PublicPersona[];
  initialOrganizations?: PublicOrg[];
  initialActivities?: HomepageActivity[];
  initialBannerSlides?: HeroSlide[];
  showBrandHero?: boolean;
  initialUrlState: PublicHomepageUrlState;
}

const heroSlideContentRenderer: HeroSlideContentRenderer = (slide, _index, defaultContent) => {
  if ((slide as { type?: string }).type === "brand") {
    return <GalleryBrandHeroSlide slide={slide as BrandHeroSlide} />;
  }
  return defaultContent;
};

export function GalleryClient({ initialScripts, initialExternalPublicScripts, initialPersonas, initialOrganizations, initialActivities = [], initialBannerSlides, showBrandHero = true, initialUrlState }: Props) {
  const {
    tab,
    segment,
    setSegment,
    usage,
    setUsage,
    demoOnly,
    setDemoOnly,
    viewMode,
    setViewMode,
    bannerSlides,
    filteredExternalPublicScripts,
    authors,
    orgs,
    peopleStatus,
    retryPeople,
    mobileFilterOpen,
    openMobileFilter,
    closeMobileFilter,
    filterPanelProps,
    homepageModel,
    allAuthorTags,
    allOrgTags,
    selectedAuthorTags,
    selectedOrgTags,
    onToggleAuthorTag,
    onToggleOrgTag,
    onResetAuthorTags,
    onResetOrgTags,
  } = useGalleryController({ initialScripts, initialExternalPublicScripts, initialPersonas, initialOrganizations, initialBannerSlides, initialUrlState });

  const { view } = homepageModel;
  const { sidebarCollapsed, setSidebarCollapsed } = useGalleryLayoutState();
  const [showList, setShowList] = useState(false);
  const [allScriptsSort, setAllScriptsSort] = useState<GallerySortValue | null>(null);
  const [compactControls, setCompactControls] = useState(false);
  useEffect(() => {
    const update = () => setCompactControls(window.scrollY > 180);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  const openAllScripts = (sort?: GallerySortValue) => {
    setAllScriptsSort(sort ?? "latest");
  };

  const activeFilterCount = homepageModel.filterChips.length;
  const removeFilter = (chip: ActiveGalleryFilterChip) => {
    if (chip.type === "q") {
      filterPanelProps.onSearchChange("");
    } else if (chip.type === "segment") {
      setSegment("all");
    } else if (chip.type === "usage") {
      setUsage("all");
    } else if (chip.type === "demo") {
      setDemoOnly(false);
    } else if (view === "authors") {
      onToggleAuthorTag(chip.value);
    } else if (view === "orgs") {
      onToggleOrgTag(chip.value);
    } else {
      filterPanelProps.onToggleTag(chip.value);
    }
  };
  const heroSlides = useMemo(
    () => buildHomepageHeroSlides(bannerSlides ?? undefined, showBrandHero),
    [bannerSlides, showBrandHero]
  );
  const firstImageIndex = heroSlides.findIndex((slide) => {
    if (slide.type === "brand") return false;
    return Boolean(slide.image?.url || slide.imageUrl);
  });
  const heroImageRenderer = useMemo<HeroImageRenderer>(
    () => (image, slide, index) => (
      <HeroImage
        image={image}
        priority={index === firstImageIndex}
        slideTitle={slide.title}
      />
    ),
    [firstImageIndex]
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GalleryTopBar
        activeTab={tab}
      />

      <div className="flex flex-col flex-1">
        {/* Hero — superadmin config controls whether the brand slide is prepended. */}
        {view === "scripts" && heroSlides.length > 0 && (
          <PublicHeroMarquee
            slides={heroSlides}
            fullBleed
            compactOnMobile
            renderImage={heroImageRenderer}
            renderSlideContent={heroSlideContentRenderer}
          />
        )}

        {view === "scripts" && <HomepageActivityBanner activities={initialActivities} />}

        <div className={`flex flex-1 w-full py-4 sm:py-6 lg:py-8 pb-24 sm:pb-20 gap-6 ${view === "scripts" ? "px-4 sm:px-5 lg:px-8" : "mx-auto max-w-6xl px-4 sm:px-6 lg:px-8"}`}>
        {/* Desktop sidebar — only when expanded */}
        {view === "scripts" && !sidebarCollapsed && (
          <aside className="hidden lg:flex lg:flex-col w-60 shrink-0">
            <div className="sticky top-[72px] max-h-[calc(100vh-88px)] overflow-y-auto overscroll-contain">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="[font-size:var(--public-font-caption)] font-semibold text-muted-foreground uppercase tracking-widest">篩選</span>
                <button
                  type="button"
                  onClick={() => setSidebarCollapsed(true)}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  aria-label="收起篩選欄"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
              <GalleryFilterPanel
                {...filterPanelProps}
                variant="sidebar"
                showSearch={false}
                segment={segment}
                onSegmentChange={setSegment}
                sort={allScriptsSort}
                onSortChange={setAllScriptsSort}
              />
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Segment + controls bar — scripts view only */}
          {view === "scripts" && (
            <div className="relative sticky top-[82px] z-30 -mx-4 mb-4 bg-background/97 px-4 backdrop-blur-md sm:-mx-5 sm:top-14 sm:px-5 lg:mx-0 lg:px-0">
              {/* Segment tabs row — with expand button inlined when collapsed */}
              <div className={`flex items-center gap-1 ${compactControls ? "md:flex-row md:flex-nowrap md:items-center" : "md:flex-col md:items-stretch md:gap-2"}`}>
                {sidebarCollapsed && (
                  <div className="hidden lg:flex items-center gap-1 shrink-0 pb-0.5">
                    <button
                      type="button"
                      onClick={() => setSidebarCollapsed(false)}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                      aria-label="展開篩選欄"
                    >
                      <PanelLeftOpen className="w-4 h-4" />
                    </button>
                    {activeFilterCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setSidebarCollapsed(false)}
                        className="inline-flex h-11 w-11 flex-col items-center justify-center gap-0.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
                        aria-label={`已選 ${activeFilterCount} 個篩選`}
                      >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span className="[font-size:var(--public-font-caption)] font-semibold leading-none">{activeFilterCount}</span>
                      </button>
                    )}
                  </div>
                )}
                <div className={`min-w-0 shrink-0 ${compactControls ? "md:w-auto" : "md:w-full"}`}>
                  <GallerySegmentBar segment={segment} onSegmentChange={setSegment} demoOnly={demoOnly} onDemoOnlyChange={setDemoOnly} compactDesktop={compactControls} />
                </div>
                <div className={`min-w-0 flex-1 md:flex md:w-full md:items-center md:justify-between md:gap-3 ${compactControls ? "md:flex-nowrap" : "md:flex-wrap"}`}>
                <GallerySearchField
                  value={filterPanelProps.searchTerm}
                  onChange={filterPanelProps.onSearchChange}
                  onOpenFilters={openMobileFilter}
                  activeFilterCount={activeFilterCount}
                  compactDesktop={compactControls}
                  trailingAction={<LazyPublicFeedbackDialog mode="listing" compactAtMobile />}
                  mobileActions={
                    <button
                      type="button"
                      onClick={() => setShowList(true)}
                      className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-transparent text-muted-foreground transition-all duration-150 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                      aria-label="開啟台本一覽表"
                      title="一覽表"
                    >
                      <List className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  }
                />
                <div className={`relative z-50 ml-auto hidden shrink-0 items-center gap-2 ${compactControls ? "" : "md:flex"}`}>
                  <GallerySortControl value={allScriptsSort} onChange={setAllScriptsSort} />
                  <button
                    type="button"
                    onClick={() => setShowList(true)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border/50 bg-transparent px-3 [font-size:var(--public-font-meta)] font-medium text-muted-foreground transition-all duration-150 hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                    aria-label="開啟台本一覽表"
                  >
                    <List className="h-3.5 w-3.5" />
                    一覽表
                  </button>
                  <GalleryViewModeToggle value={viewMode} onChange={setViewMode} compact />
                </div>
                </div>
              </div>

              {!compactControls && <GalleryFilterSummary
                chips={homepageModel.filterChips}
                onRemove={removeFilter}
                onClear={filterPanelProps.onResetFilters}
              />}

            </div>
          )}

          {view === "scripts" && (
            <GalleryHoverPreviewProvider resetKey={[viewMode, segment, usage, demoOnly, filterPanelProps.searchTerm, filterPanelProps.selectedTags?.join(",")].join("|")}>
              <GalleryScriptResults
                model={homepageModel}
                onResetFilters={filterPanelProps.onResetFilters}
                onTagClick={filterPanelProps.onToggleTag}
                externalItems={filteredExternalPublicScripts}
                onOpenAll={(sort) => openAllScripts(sort)}
                allScriptsSort={allScriptsSort}
              />
            </GalleryHoverPreviewProvider>
          )}

          {view === "authors" && (
            <GalleryAuthorGrid
              authors={authors}
              filteredAuthors={homepageModel.filteredAuthors}
              peopleStatus={peopleStatus}
              onRetry={retryPeople}
              allTags={allAuthorTags}
              selectedTags={selectedAuthorTags}
              onToggleTag={onToggleAuthorTag}
              onResetFilters={onResetAuthorTags}
            />
          )}

          {view === "orgs" && (
            <GalleryOrgGrid
              orgs={orgs}
              filteredOrgs={homepageModel.filteredOrgs}
              peopleStatus={peopleStatus}
              onRetry={retryPeople}
              allTags={allOrgTags}
              selectedTags={selectedOrgTags}
              onToggleTag={onToggleOrgTag}
              onResetFilters={onResetOrgTags}
            />
          )}
        </main>
        </div>
      </div>

      {/* List overlay — lazy-loaded, only mounted on user request */}
      {showList && (
        <Suspense fallback={null}>
          <GalleryListOverlay
            scripts={homepageModel.filteredScripts}
            externalItems={filteredExternalPublicScripts}
            onClose={() => setShowList(false)}
          />
        </Suspense>
      )}

      {/* Mobile filter sheet */}
      <GalleryMobileSheet
        open={mobileFilterOpen}
        onClose={closeMobileFilter}
        {...filterPanelProps}
        usage={usage}
        setUsage={setUsage}
        demoOnly={demoOnly}
        setDemoOnly={setDemoOnly}
        viewModeValue={viewMode}
        setViewMode={setViewMode}
        segment={segment}
        onSegmentChange={setSegment}
        sort={allScriptsSort}
        onSortChange={setAllScriptsSort}
        chips={homepageModel.filterChips}
        onRemoveChip={removeFilter}
        resultCount={homepageModel.resultCount}
      />

      <PublicFooter />
    </div>
  );
}
