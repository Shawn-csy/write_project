"use client";

import type { PublicScript } from "@/lib/types";
import {
  PublicHeroMarquee,
  GalleryHoverPreviewProvider,
  type HeroSlide,
} from "@write/public-ui";
import { GalleryFilterPanel } from "./gallery/GalleryFilterPanel";
import { GallerySegmentBar } from "./gallery/GallerySegmentBar";
import { GalleryMobileSheet } from "./gallery/GalleryMobileSheet";
import { GalleryAuthorGrid, GalleryOrgGrid } from "./gallery/GalleryPeopleGrid";
import { GalleryScriptResults } from "./gallery/GalleryScriptResults";
import { GalleryTopBar } from "./gallery/GalleryTopBar";
import { useGalleryController } from "./gallery/useGalleryController";

interface Props {
  initialScripts: PublicScript[];
  initialBannerSlides?: HeroSlide[];
}

export function GalleryClient({ initialScripts, initialBannerSlides }: Props) {
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
  } = useGalleryController({ initialScripts, initialBannerSlides });

  const { view, resultCount, hasFilters } = homepageModel;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GalleryTopBar
        activeTab={tab}
        onTabChange={setTab}
        onOpenMobileFilter={openMobileFilter}
      />

      {/* Hero banner — only rendered when backend provides slides; no placeholder fallback in production */}
      {view === "scripts" && bannerSlides && bannerSlides.length > 0 && (
        <PublicHeroMarquee slides={bannerSlides} fullBleed />
      )}

      <div className="flex flex-1 w-full px-3 sm:px-5 lg:px-8 py-5 sm:py-8 pb-20 gap-6">
        {/* Desktop sidebar */}
        {view === "scripts" && (
          <aside className="hidden lg:block w-60 shrink-0">
            <div className="sticky top-20">
              <GalleryFilterPanel {...filterPanelProps} variant="sidebar" />
            </div>
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Segment + controls bar — scripts view only */}
          {view === "scripts" && (
            <div className="sticky top-[6.5rem] sm:top-14 z-30 -mx-3 sm:-mx-5 lg:mx-0 mb-4 bg-background/95 backdrop-blur px-3 sm:px-5 lg:px-0">
              {/* Segment tabs row */}
              <GallerySegmentBar segment={segment} onSegmentChange={setSegment} />

              {/* ViewMode row — hidden on mobile (in mobile sheet). Usage moved to sidebar/sheet. */}
              <div className="hidden md:flex items-center justify-end py-2.5">
                <span className="mr-2 text-xs text-muted-foreground">顯示模式</span>
                <div className="flex gap-1.5">
                  {(["standard", "compact"] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setViewMode(mode)}
                      className={`h-7 rounded-full px-3 text-xs transition-colors font-medium ${
                        viewMode === mode
                          ? "bg-foreground text-background"
                          : "border border-border/60 bg-transparent text-muted-foreground hover:text-foreground hover:border-border"
                      }`}
                    >
                      {mode === "standard" ? "標準" : "密集"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground mb-4">
            {filterPanelProps.searchTerm
              ? `搜尋「${filterPanelProps.searchTerm}」共 ${resultCount} 筆結果`
              : view === "scripts"
              ? `${resultCount} 部公開台本`
              : view === "authors"
              ? `${resultCount} 位作者`
              : `${resultCount} 個組織`}
          </p>

          {view === "scripts" && (
            <GalleryHoverPreviewProvider resetKey={[viewMode, segment, usage, filterPanelProps.searchTerm, filterPanelProps.selectedTags?.join(",")].join("|")}>
              <GalleryScriptResults
                model={homepageModel}
                onResetFilters={filterPanelProps.onResetFilters}
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
    </div>
  );
}
