"use client";

import type { PublicScript } from "@/lib/types";
import {
  PublicHeroMarquee,
  type HeroSlide,
} from "@write/public-ui";
import { GalleryFilterPanel } from "./gallery/GalleryFilterPanel";
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
    bannerSlides,
    authors,
    orgs,
    loadingPeople,
    mobileFilterOpen,
    openMobileFilter,
    closeMobileFilter,
    filterPanelProps,
    galleryModel,
    hasFilters,
    isDefaultView,
    resultCount,
    searchTerm,
    viewMode,
  } = useGalleryController({ initialScripts, initialBannerSlides });

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <GalleryTopBar
        activeTab={tab}
        onTabChange={setTab}
        onOpenMobileFilter={openMobileFilter}
      />

      {/* Hero banner — always shown on scripts tab; component uses DEFAULT_SLIDES when no slides provided */}
      {tab === "scripts" && (
        <PublicHeroMarquee slides={bannerSlides} fullBleed fallbackToDefault />
      )}

      <div className="flex flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 pb-20 gap-6">
        {/* Desktop sidebar */}
        {tab === "scripts" && (
          <aside className="hidden lg:block w-56 shrink-0">
            <GalleryFilterPanel {...filterPanelProps} />
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground mb-4">
            {searchTerm
              ? `搜尋「${searchTerm}」共 ${resultCount} 筆結果`
              : tab === "scripts"
              ? `${resultCount} 部公開台本`
              : tab === "authors"
              ? `${resultCount} 位作者`
              : `${resultCount} 個組織`}
          </p>

          {tab === "scripts" && (
            <GalleryScriptResults
              isDefaultView={isDefaultView}
              viewMode={viewMode}
              filteredScripts={galleryModel.filteredScripts}
              topViewedScriptsPreview={galleryModel.topViewedScriptsPreview}
              latestScriptsPreview={galleryModel.latestScriptsPreview}
              featuredSeries={galleryModel.featuredSeries}
              hasFilters={hasFilters}
              onResetFilters={filterPanelProps.onResetFilters}
              searchTerm={searchTerm}
            />
          )}

          {tab === "authors" && (
            <GalleryAuthorGrid
              authors={authors}
              filteredAuthors={galleryModel.filteredAuthors}
              loading={loadingPeople}
            />
          )}

          {tab === "orgs" && (
            <GalleryOrgGrid
              orgs={orgs}
              filteredOrgs={galleryModel.filteredOrgs}
              loading={loadingPeople}
            />
          )}
        </main>
      </div>

      {/* Mobile filter sheet */}
      <GalleryMobileSheet
        open={mobileFilterOpen}
        onClose={closeMobileFilter}
        {...filterPanelProps}
      />
    </div>
  );
}
