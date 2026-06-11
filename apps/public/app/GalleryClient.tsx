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
    homepageModel,
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

      <div className="flex flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-8 pb-20 gap-6">
        {/* Desktop sidebar */}
        {view === "scripts" && (
          <aside className="hidden lg:block w-56 shrink-0">
            <GalleryFilterPanel {...filterPanelProps} />
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">
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
            <GalleryScriptResults
              model={homepageModel}
              onResetFilters={filterPanelProps.onResetFilters}
            />
          )}

          {view === "authors" && (
            <GalleryAuthorGrid
              authors={authors}
              filteredAuthors={homepageModel.filteredAuthors}
              loading={loadingPeople}
            />
          )}

          {view === "orgs" && (
            <GalleryOrgGrid
              orgs={orgs}
              filteredOrgs={homepageModel.filteredOrgs}
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
