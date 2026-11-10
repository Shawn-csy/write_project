"use client";

import { useMemo, useState, lazy, Suspense } from "react";
import type { ExternalPublicScript, PublicOrg, PublicPersona, PublicScript } from "@/lib/types";
import {
  PublicHeroMarquee,
  GalleryHoverPreviewProvider,
  type HeroSlide,
  type HeroImageRenderer,
  type HeroSlideContentRenderer,
} from "@write/public-ui";
import { HeroImage } from "@/components/HeroImage";
import { PanelLeftClose } from "lucide-react";
import { GalleryFilterPanel } from "./gallery/GalleryFilterPanel";
const GalleryListOverlay = lazy(() => import("./gallery/GalleryListOverlay").then(m => ({ default: m.GalleryListOverlay })));
import { GalleryMobileSheet } from "./gallery/GalleryMobileSheet";
import { GalleryAuthorGrid, GalleryOrgGrid } from "./gallery/GalleryPeopleGrid";
import { GalleryScriptResults } from "./gallery/GalleryScriptResults";
import { GalleryTopBar } from "./gallery/GalleryTopBar";
import { GalleryBrandHeroSlide } from "./gallery/GalleryBrandHeroSlide";
import type { GallerySortValue } from "./gallery/GallerySortControl";
import type { ActiveGalleryFilterChip } from "./gallery/GalleryFilterSummary";
import { GalleryToolbar } from "./gallery/GalleryToolbar";
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
  const openAllScripts = (sort?: GallerySortValue) => {
    setAllScriptsSort(sort ?? "latest");
  };

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
              />
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Toolbar — scripts view only */}
          {view === "scripts" && (
            <GalleryToolbar
              segment={segment}
              onSegmentChange={setSegment}
              demoOnly={demoOnly}
              onDemoOnlyChange={setDemoOnly}
              sort={allScriptsSort}
              onSortChange={setAllScriptsSort}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              searchTerm={filterPanelProps.searchTerm}
              onSearchChange={filterPanelProps.onSearchChange}
              resultCount={homepageModel.resultCount}
              chips={homepageModel.filterChips}
              onRemoveChip={removeFilter}
              onClearFilters={filterPanelProps.onResetFilters}
              onOpenFilterSheet={openMobileFilter}
              sidebarCollapsed={sidebarCollapsed}
              onExpandSidebar={() => setSidebarCollapsed(false)}
              onOpenList={() => setShowList(true)}
            />
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
