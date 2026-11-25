"use client";

import { useEffect, useRef, useState, lazy, Suspense } from "react";
import type { ExternalPublicScript, PublicOrg, PublicPersona, PublicScript } from "@/lib/types";
import { GalleryHoverPreviewProvider, type HeroSlide } from "@write/public-ui";
import { PanelLeftClose } from "lucide-react";
import { GalleryFilterPanel } from "./gallery/GalleryFilterPanel";
const GalleryListOverlay = lazy(() => import("./gallery/GalleryListOverlay").then(m => ({ default: m.GalleryListOverlay })));
import { GalleryMobileSheet } from "./gallery/GalleryMobileSheet";
import { GalleryAuthorGrid, GalleryOrgGrid } from "./gallery/GalleryPeopleGrid";
import { GalleryScriptResults } from "./gallery/GalleryScriptResults";
import { LiveBannerStrip } from "@/components/LiveBannerStrip";
import type { GallerySortValue } from "./gallery/GallerySortControl";
import type { ActiveGalleryFilterChip } from "./gallery/GalleryFilterSummary";
import { GalleryToolbar } from "./gallery/GalleryToolbar";
import { useGalleryController } from "./gallery/useGalleryController";
import { useGalleryLayoutState } from "./gallery/useGalleryLayoutState";
import type { PublicHomepageUrlState } from "./gallery/useGalleryUrlState";
import { PublicBrowseMain } from "@/components/PublicBrowseMain";
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

export function GalleryClient({ initialScripts, initialExternalPublicScripts, initialPersonas, initialOrganizations, initialActivities = [], initialBannerSlides, showBrandHero = true, initialUrlState }: Props) {
  const {
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
  const sidebarRef = useRef<HTMLElement>(null);
  const shouldRestoreSidebarFocus = useRef(false);

  useEffect(() => {
    if (!shouldRestoreSidebarFocus.current) return;
    shouldRestoreSidebarFocus.current = false;
    const buttonId = sidebarCollapsed ? "homepage-filter-open" : "homepage-filter-close";
    document.getElementById(buttonId)?.focus({ preventScroll: true });
  }, [sidebarCollapsed]);

  useEffect(() => {
    if (view !== "scripts" || sidebarCollapsed) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      const sidebar = sidebarRef.current;
      if (!sidebar || event.composedPath().includes(sidebar) || !sidebar.getClientRects().length) return;
      setSidebarCollapsed(true);
    };

    document.addEventListener("click", closeOnOutsideClick, true);
    return () => document.removeEventListener("click", closeOnOutsideClick, true);
  }, [view, sidebarCollapsed, setSidebarCollapsed]);

  const toggleSidebar = (collapsed: boolean) => {
    shouldRestoreSidebarFocus.current = true;
    setSidebarCollapsed(collapsed);
  };

  const [showList, setShowList] = useState(false);
  const [allScriptsSort, setAllScriptsSort] = useState<GallerySortValue | null>(null);
  const showOverviewAnnouncements = view === "scripts" && !homepageModel.hasFilters && allScriptsSort === null;
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

  return (
    <div className="modern-homepage flex flex-1 flex-col bg-background">
      <div className="flex flex-col flex-1">
        {showOverviewAnnouncements && (
          <div className="homepage-announcements">
            <LiveBannerStrip slides={bannerSlides ?? undefined} placement="homepage" showBrandHero={showBrandHero} />
            <HomepageActivityBanner activities={initialActivities} />
          </div>
        )}

        <PublicBrowseMain width={view === "scripts" ? "wide" : "standard"} className="flex">
        {/* Desktop sidebar — only when expanded */}
        {view === "scripts" && (
          <aside
            ref={sidebarRef}
            id="homepage-filter-sidebar"
            aria-label="篩選"
            aria-hidden={sidebarCollapsed}
            inert={sidebarCollapsed}
            data-open={!sidebarCollapsed}
            className="homepage-filter-sidebar hidden shrink-0 lg:block"
            onKeyDown={(event) => {
              if (event.key !== "Escape" || event.defaultPrevented || event.nativeEvent.isComposing) return;
              event.preventDefault();
              toggleSidebar(true);
            }}
          >
            <div className="homepage-filter-sidebar-inner sticky top-[72px] flex w-56 flex-col">
              <div className="section-bar mb-3 flex shrink-0 items-center justify-between">
                <span className="text-[0.9375rem] font-bold text-foreground">篩選</span>
                <button
                  type="button"
                  id="homepage-filter-close"
                  aria-controls="homepage-filter-sidebar"
                  aria-expanded={true}
                  onClick={() => toggleSidebar(true)}
                  className="-my-1 -mr-1.5 inline-flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground hover:bg-background hover:text-foreground"
                  aria-label="收起篩選欄"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
              <div role="region" aria-label="篩選選項" tabIndex={0} className="min-h-0 overflow-x-hidden overflow-y-auto p-1">
                <GalleryFilterPanel
                  {...filterPanelProps}
                  variant="sidebar"
                  showSearch={false}
                />
              </div>
            </div>
          </aside>
        )}

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {view === "scripts" && (!showOverviewAnnouncements || !showBrandHero) && <h1 className="sr-only">公開台本</h1>}
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
              chips={homepageModel.filterChips}
              onRemoveChip={removeFilter}
              onClearFilters={filterPanelProps.onResetFilters}
              onOpenFilterSheet={openMobileFilter}
              sidebarCollapsed={sidebarCollapsed}
              onExpandSidebar={() => toggleSidebar(false)}
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
              scripts={initialScripts}
              externalScripts={initialExternalPublicScripts}
              filteredAuthors={homepageModel.filteredAuthors}
              peopleStatus={peopleStatus}
              onRetry={retryPeople}
              allTags={allAuthorTags}
              selectedTags={selectedAuthorTags}
              onToggleTag={onToggleAuthorTag}
              onResetFilters={onResetAuthorTags}
              searchTerm={filterPanelProps.searchTerm}
              onSearchChange={filterPanelProps.onSearchChange}
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
        </div>
        </PublicBrowseMain>
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

    </div>
  );
}
