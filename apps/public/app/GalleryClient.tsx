"use client";

import { useState } from "react";
import type { PublicScript } from "@/lib/types";
import {
  PublicHeroMarquee,
  GalleryHoverPreviewProvider,
  type HeroSlide,
  type HeroImageRenderer,
} from "@write/public-ui";
import { PublicImage } from "@/components/PublicImage";
import { SlidersHorizontal, PanelLeftClose, PanelLeftOpen, List } from "lucide-react";
import { GalleryFilterPanel } from "./gallery/GalleryFilterPanel";
import { GallerySegmentBar } from "./gallery/GallerySegmentBar";
import { GalleryViewModeToggle } from "./gallery/GalleryViewModeToggle";
import { GalleryListOverlay } from "./gallery/GalleryListOverlay";
import { GalleryMobileSheet } from "./gallery/GalleryMobileSheet";
import { GalleryAuthorGrid, GalleryOrgGrid } from "./gallery/GalleryPeopleGrid";
import { GalleryScriptResults } from "./gallery/GalleryScriptResults";
import { GalleryTopBar } from "./gallery/GalleryTopBar";
import { GalleryStaticHero } from "./gallery/GalleryStaticHero";
import { useGalleryController } from "./gallery/useGalleryController";
import { useGalleryLayoutState } from "./gallery/useGalleryLayoutState";

interface Props {
  initialScripts: PublicScript[];
  initialBannerSlides?: HeroSlide[];
}

// Module-level: stable reference, no re-creation on render.
//
// Art direction: viewport-specific crops are applied via CSS visibility so no
// JS resize listener or hydration mismatch is introduced.
//   mobile  (<md)     → mobileCrop ?? crop
//   desktop (md–2xl)  → desktopCrop ?? crop
//   ultra-wide (≥2xl) → ultraWideCrop ?? desktopCrop ?? crop
//
// blur-fill mode: a blurred, scale-enlarged background copy fills edge areas
// that the primary image cannot cover at ultra-wide viewport ratios.
const heroImageRenderer: HeroImageRenderer = (image, _slide, index) => {
  const priority = index === 0;
  const blurFill = image.backgroundMode === "blur-fill";

  // Viewport-specific crops (fall through to generic crop when absent)
  const mobileCrop = image.mobileCrop ?? image.crop ?? null;
  const desktopCrop = image.desktopCrop ?? image.crop ?? null;
  const ultraWideCrop = image.ultraWideCrop ?? image.desktopCrop ?? image.crop ?? null;

  const hasViewportCrops = image.mobileCrop || image.desktopCrop || image.ultraWideCrop;

  return (
    <>
      {/* blur-fill background layer — only when backgroundMode="blur-fill" */}
      {blurFill && (
        <PublicImage
          src={image.url}
          alt=""
          preset="hero-banner"
          crop={image.crop}
          priority={priority}
          className="object-cover scale-110 blur-md opacity-60"
        />
      )}

      {/* Primary image — viewport-aware crops via CSS breakpoints */}
      {hasViewportCrops ? (
        <>
          {/* mobile: <md */}
          <span className="absolute inset-0 md:hidden">
            <PublicImage src={image.url} alt={image.alt ?? ""} preset="hero-banner" crop={mobileCrop} priority={priority} />
          </span>
          {/* desktop: md–2xl */}
          <span className="absolute inset-0 hidden md:block 2xl:hidden">
            <PublicImage src={image.url} alt={image.alt ?? ""} preset="hero-banner" crop={desktopCrop} priority={priority} />
          </span>
          {/* ultra-wide: ≥2xl */}
          <span className="absolute inset-0 hidden 2xl:block">
            <PublicImage src={image.url} alt={image.alt ?? ""} preset="hero-banner" crop={ultraWideCrop} priority={priority} />
          </span>
        </>
      ) : (
        <PublicImage
          src={image.url}
          alt={image.alt ?? ""}
          preset="hero-banner"
          crop={image.crop ?? null}
          priority={priority}
        />
      )}
    </>
  );
};

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
    isPending,
  } = useGalleryController({ initialScripts, initialBannerSlides });

  const { view, resultCount, hasFilters } = homepageModel;
  const { sidebarCollapsed, setSidebarCollapsed } = useGalleryLayoutState();
  const [showList, setShowList] = useState(false);

  const activeFilterCount = homepageModel.filterChips.length;

  return (
    <div className={`min-h-screen bg-background flex flex-col transition-opacity duration-150 ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
      <GalleryTopBar
        activeTab={tab}
        onTabChange={setTab}
        onOpenMobileFilter={openMobileFilter}
      />

      {/* Hero — banner when backend provides slides, static brand hero otherwise */}
      {view === "scripts" && bannerSlides && bannerSlides.length > 0 ? (
        <PublicHeroMarquee slides={bannerSlides} fullBleed renderImage={heroImageRenderer} />
      ) : view === "scripts" ? (
        <GalleryStaticHero />
      ) : null}

      <div className="flex flex-1 w-full px-4 sm:px-5 lg:px-8 py-4 sm:py-6 lg:py-8 pb-24 sm:pb-20 gap-6">
        {/* Desktop sidebar — only when expanded */}
        {view === "scripts" && !sidebarCollapsed && (
          <aside className="hidden lg:flex lg:flex-col w-60 shrink-0">
            <div className="sticky top-20">
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">篩選</span>
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
            <div className="sticky top-24 sm:top-14 z-30 -mx-4 sm:-mx-5 lg:mx-0 mb-4 bg-background/97 backdrop-blur-md px-4 sm:px-5 lg:px-0">
              {/* Segment tabs row — with expand button inlined when collapsed */}
              <div className="flex items-end gap-2">
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
                        <span className="text-[9px] font-semibold leading-none">{activeFilterCount}</span>
                      </button>
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <GallerySegmentBar segment={segment} onSegmentChange={setSegment} />
                </div>
              </div>

              {/* ViewMode + list row — desktop only */}
              <div className="relative z-50 hidden md:flex items-center justify-end gap-3 py-2.5 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setShowList(true)}
                  className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-[5px] text-xs font-medium text-muted-foreground border border-border/50 bg-transparent hover:border-primary/40 hover:bg-primary/5 hover:text-foreground transition-all duration-150"
                  aria-label="開啟台本一覽表"
                >
                  <List className="w-3.5 h-3.5" />
                  一覽表
                </button>
                <span className="text-xs text-muted-foreground">顯示模式</span>
                <GalleryViewModeToggle value={viewMode} onChange={setViewMode} compact />
              </div>

              {/* Mobile list button row */}
              <div className="flex md:hidden items-center justify-end py-1.5 pointer-events-auto">
                <button
                  type="button"
                  onClick={() => setShowList(true)}
                  className="inline-flex items-center gap-1.5 h-8 px-3 rounded-[5px] text-xs font-medium text-muted-foreground border border-border/50 bg-transparent hover:border-primary/40 hover:bg-primary/5 hover:text-foreground transition-all duration-150"
                  aria-label="開啟台本一覽表"
                >
                  <List className="w-3.5 h-3.5" />
                  一覽表
                </button>
              </div>
            </div>
          )}

          <p
            className="mb-4"
            style={{ fontSize: "0.75rem", color: "hsl(var(--muted-foreground) / 0.7)", letterSpacing: "0.01em" }}
          >
            {filterPanelProps.searchTerm
              ? `搜尋「${filterPanelProps.searchTerm}」— ${resultCount} 筆結果`
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

      {/* List overlay */}
      {showList && (
        <GalleryListOverlay
          scripts={homepageModel.filteredScripts}
          onClose={() => setShowList(false)}
        />
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
    </div>
  );
}
