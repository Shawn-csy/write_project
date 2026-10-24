"use client";

import { useMemo, useState, lazy, Suspense } from "react";
import type { ExternalPublicScript, PublicScript } from "@/lib/types";
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
import { GalleryBrandHeroSlide } from "./gallery/GalleryBrandHeroSlide";
import { GallerySearchField } from "./gallery/GallerySearchField";
import { GalleryFilterSummary, type ActiveGalleryFilterChip } from "./gallery/GalleryFilterSummary";
import { buildHomepageHeroSlides } from "./gallery/homepageHeroModel";
import { useGalleryController } from "./gallery/useGalleryController";
import { useGalleryLayoutState } from "./gallery/useGalleryLayoutState";
import type { PublicHomepageUrlState } from "./gallery/useGalleryUrlState";
import { PublicFooter } from "@/components/PublicFooter";

interface Props {
  initialScripts: PublicScript[];
  initialExternalPublicScripts: ExternalPublicScript[];
  initialBannerSlides?: HeroSlide[];
  showBrandHero?: boolean;
  initialUrlState: PublicHomepageUrlState;
}

const heroSlideContentRenderer: HeroSlideContentRenderer = (slide, _index, defaultContent) => {
  if ((slide as { type?: string }).type === "brand") {
    return <GalleryBrandHeroSlide />;
  }
  return defaultContent;
};

export function GalleryClient({ initialScripts, initialExternalPublicScripts, initialBannerSlides, showBrandHero = true, initialUrlState }: Props) {
  const {
    tab,
    setTab,
    segment,
    setSegment,
    usage,
    setUsage,
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
  } = useGalleryController({ initialScripts, initialExternalPublicScripts, initialBannerSlides, initialUrlState });

  const { view } = homepageModel;
  const { sidebarCollapsed, setSidebarCollapsed } = useGalleryLayoutState();
  const [showList, setShowList] = useState(false);
  const [allScriptsSort, setAllScriptsSort] = useState<"latest" | "top" | null>(null);
  const openAllScripts = (sort?: "latest" | "top") => {
    setAllScriptsSort(sort ?? "latest");
  };
  const closeAllScripts = () => setAllScriptsSort(null);
  const handleTabChange = (nextTab: typeof tab) => {
    if (nextTab !== "scripts") setAllScriptsSort(null);
    setTab(nextTab);
  };

  const activeFilterCount = homepageModel.filterChips.length;
  const removeFilter = (chip: ActiveGalleryFilterChip) => {
    if (chip.type === "q") {
      filterPanelProps.onSearchChange("");
    } else if (chip.type === "segment") {
      setSegment("all");
    } else if (chip.type === "usage") {
      setUsage("all");
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
        onTabChange={handleTabChange}
      />

      <div className="flex flex-col flex-1">
        {/* Hero — superadmin config controls whether the brand slide is prepended. */}
        {view === "scripts" && heroSlides.length > 0 && (
          <PublicHeroMarquee
            slides={heroSlides}
            fullBleed
            renderImage={heroImageRenderer}
            renderSlideContent={heroSlideContentRenderer}
          />
        )}

        <div className="flex flex-1 w-full px-4 sm:px-5 lg:px-8 py-4 sm:py-6 lg:py-8 pb-24 sm:pb-20 gap-6">
        {/* Desktop sidebar — only when expanded */}
        {view === "scripts" && !sidebarCollapsed && (
          <aside className="hidden lg:flex lg:flex-col w-60 shrink-0">
            <div className="sticky top-20">
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
              <GalleryFilterPanel {...filterPanelProps} variant="sidebar" />
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Segment + controls bar — scripts view only */}
          {view === "scripts" && (
            <div className="sticky top-14 z-30 -mx-4 sm:-mx-5 lg:mx-0 mb-4 bg-background/97 backdrop-blur-md px-4 sm:px-5 lg:px-0">
              {/* Segment tabs row — with expand button inlined when collapsed */}
              <div className="flex flex-row items-center gap-2 md:flex-col md:items-stretch lg:flex-row lg:items-end">
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
                <div className="w-auto min-w-0 shrink-0 md:w-full lg:flex-1">
                  <GallerySegmentBar segment={segment} onSegmentChange={setSegment} />
                </div>
                <GallerySearchField
                  value={filterPanelProps.searchTerm}
                  onChange={filterPanelProps.onSearchChange}
                  onOpenFilters={openMobileFilter}
                  activeFilterCount={activeFilterCount}
                  mobileActions={
                    <button
                      type="button"
                      onClick={() => setShowList(true)}
                      className="inline-flex h-10 w-9 shrink-0 items-center justify-center rounded-lg border border-border/50 bg-transparent text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground transition-all duration-150"
                      aria-label="開啟台本一覽表"
                      title="一覽表"
                    >
                      <List className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  }
                />
              </div>

              <GalleryFilterSummary
                chips={homepageModel.filterChips}
                onRemove={removeFilter}
                onClear={filterPanelProps.onResetFilters}
              />

              {/* ViewMode + list row — desktop only */}
              <div className="relative z-50 hidden md:flex items-center justify-end gap-3 py-2.5 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => allScriptsSort ? closeAllScripts() : openAllScripts()}
                  className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[5px] [font-size:var(--public-font-caption)] font-medium border transition-all duration-150 ${allScriptsSort ? "text-foreground border-primary/60 bg-primary/10" : "text-primary border-primary/35 bg-primary/5 hover:border-primary/60 hover:bg-primary/10"}`}
                  aria-pressed={Boolean(allScriptsSort)}
                  aria-label={allScriptsSort ? "返回分區瀏覽" : "查看更多公開台本"}
                >
                  {allScriptsSort ? "返回分區" : "查看更多"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowList(true)}
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[5px] [font-size:var(--public-font-caption)] font-medium text-muted-foreground border border-border/50 bg-transparent hover:border-primary/40 hover:bg-primary/5 hover:text-foreground transition-all duration-150"
                  aria-label="開啟台本一覽表"
                >
                  <List className="w-3.5 h-3.5" />
                  一覽表
                </button>
                <span className="[font-size:var(--public-font-caption)] text-muted-foreground">顯示模式</span>
                <GalleryViewModeToggle value={viewMode} onChange={setViewMode} compact />
              </div>

            </div>
          )}

          {view === "scripts" && (
            <GalleryHoverPreviewProvider resetKey={[viewMode, segment, usage, filterPanelProps.searchTerm, filterPanelProps.selectedTags?.join(",")].join("|")}>
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
        viewModeValue={viewMode}
        setViewMode={setViewMode}
      />

      <PublicFooter />
    </div>
  );
}
