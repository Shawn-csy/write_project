import React, { useCallback } from "react";
import { Button } from "../ui/button";
import { CoverPlaceholder } from "../ui/CoverPlaceholder";
import { HorizontalScrollLane } from "./HorizontalScrollLane";
import { ScriptGalleryCard } from "./ScriptGalleryCard";
import { getMediaCropStyle } from "../../lib/mediaCropRef";
import type { PublicGalleryScript } from "../../hooks/public/usePublicGalleryState";

interface FeaturedSeries {
  name: string;
  coverUrl?: string;
  count: number;
}

interface Props {
  t: (key: string, fallback?: string) => string;
  isLoading: boolean;
  viewMode: "standard" | "compact";
  isDefaultView: boolean;
  featuredLaneMode: string | boolean;
  setFeaturedLaneMode: (v: string | boolean) => void;
  filteredScripts: PublicGalleryScript[];
  topViewedScriptsPreview: PublicGalleryScript[];
  latestScriptsPreview: PublicGalleryScript[];
  featuredLaneScripts: PublicGalleryScript[];
  featuredSeries: FeaturedSeries[];
  hasScriptFilters: boolean;
  resetScriptFilters: () => void;
  handleScriptClick: (script: { id?: string; tags?: unknown[] }) => void;
  onNavigateSeries: (name: string) => void;
}

function GalleryScriptsViewInner({
  t, isLoading, viewMode, isDefaultView, featuredLaneMode, setFeaturedLaneMode,
  filteredScripts, topViewedScriptsPreview, latestScriptsPreview,
  featuredLaneScripts, featuredSeries, hasScriptFilters, resetScriptFilters,
  handleScriptClick, onNavigateSeries,
}: Props) {
  const onActionTop = useCallback(() => setFeaturedLaneMode("top"), [setFeaturedLaneMode]);
  const onActionLatest = useCallback(() => setFeaturedLaneMode("latest"), [setFeaturedLaneMode]);
  const onActionSeries = useCallback(() => setFeaturedLaneMode("series"), [setFeaturedLaneMode]);
  const onActionBack = useCallback(() => setFeaturedLaneMode(false), [setFeaturedLaneMode]);
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))" }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="aspect-[2/3] bg-muted/30 animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (viewMode === "compact") {
    return (
      <div className="space-y-4 animate-in fade-in duration-500">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {isDefaultView ? t("publicGallery.scripts", "作品列表") : t("publicGallery.searchResults", "篩選結果")}
            <span className="text-muted-foreground text-sm font-normal"> ({filteredScripts.length})</span>
          </h2>
        </div>
        <div className="overflow-hidden rounded-xl border border-border/65 bg-background/55 divide-y divide-border/55">
          {filteredScripts.map(script => (
            <ScriptGalleryCard key={script.id} script={script} variant="compact" onScriptClick={handleScriptClick} />
          ))}
        </div>
      </div>
    );
  }

  if (isDefaultView && !featuredLaneMode) {
    return (
      <div className="space-y-12 animate-in fade-in duration-500">
        {topViewedScriptsPreview.length > 0 && (
          <HorizontalScrollLane
            title={t("publicGallery.categoryTopViewed", "點閱排行")}
            actionLabel={t("publicGallery.viewAll", "查看全部")}
            onAction={onActionTop}
          >
            {topViewedScriptsPreview.map(script => (
              <div key={script.id} className="w-[145px] sm:w-[178px] shrink-0 snap-start">
                <ScriptGalleryCard script={script} variant="standard" onScriptClick={handleScriptClick} />
              </div>
            ))}
          </HorizontalScrollLane>
        )}
        {latestScriptsPreview.length > 0 && (
          <HorizontalScrollLane
            title={t("publicGallery.categoryLatest", "最新發布")}
            actionLabel={t("publicGallery.viewAll", "查看全部")}
            onAction={onActionLatest}
          >
            {latestScriptsPreview.map(script => (
              <div key={script.id} className="w-[145px] sm:w-[178px] shrink-0 snap-start">
                <ScriptGalleryCard script={script} variant="standard" onScriptClick={handleScriptClick} />
              </div>
            ))}
          </HorizontalScrollLane>
        )}
        {featuredSeries.length > 0 && (
          <HorizontalScrollLane
            title={t("publicGallery.categorySeries", "熱門系列")}
            actionLabel={t("publicGallery.viewAll", "查看全部")}
            onAction={onActionSeries}
          >
            {featuredSeries.map(series => (
              <SeriesCard key={series.name} series={series} t={t} onNavigate={onNavigateSeries} />
            ))}
          </HorizontalScrollLane>
        )}
      </div>
    );
  }

  if (featuredLaneMode === "series") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {t("publicGallery.categorySeries", "熱門系列")}
            <span className="text-muted-foreground text-sm font-normal"> ({featuredSeries.length})</span>
          </h2>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={onActionBack}>
            {t("publicGallery.backToFeatured", "返回精選")}
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {featuredSeries.map(series => (
            <SeriesCard key={series.name} series={series} t={t} onNavigate={onNavigateSeries} grid />
          ))}
        </div>
      </div>
    );
  }

  // top / latest / filtered list
  return (
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
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground" onClick={onActionBack}>
            {t("publicGallery.backToFeatured", "返回精選")}
          </Button>
        ) : null}
      </div>
      <div className="grid gap-4 sm:gap-5 animate-in fade-in duration-500" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))" }}>
        {featuredLaneScripts.map(script => (
          <ScriptGalleryCard key={script.id} script={script} variant="standard" onScriptClick={handleScriptClick} />
        ))}
      </div>
      {!featuredLaneMode && filteredScripts.length === 0 && (
        <div className="py-20 text-center text-muted-foreground">
          <p>{t("publicGallery.emptyScripts")}</p>
          <Button variant="link" onClick={resetScriptFilters}>{t("publicGallery.clearFilters")}</Button>
        </div>
      )}
    </div>
  );
}

export const GalleryScriptsView = React.memo(GalleryScriptsViewInner);

const SeriesCard = React.memo(function SeriesCard({ series, t, onNavigate, grid }: { series: FeaturedSeries; t: (k: string, f?: string) => string; onNavigate: (name: string) => void; grid?: boolean }) {
  const handleClick = useCallback(() => onNavigate(series.name), [onNavigate, series.name]);
  const cropCover = getMediaCropStyle(String(series.coverUrl || ""));
  return (
    <button
      type="button"
      className={`${grid ? "" : "w-[145px] sm:w-[178px] shrink-0 snap-start "}text-left group`}
      onClick={handleClick}
    >
      <div className="aspect-[2/3] overflow-hidden rounded-lg border border-border/60 bg-muted/25">
        {series.coverUrl ? (
          <img src={cropCover.src} style={cropCover.style} alt={series.name} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" loading="lazy" />
        ) : (
          <CoverPlaceholder title={series.name} compact />
        )}
      </div>
      <div className="pt-2">
        <p className="line-clamp-1 text-sm font-semibold text-foreground group-hover:text-primary">{series.name}</p>
        <p className="line-clamp-1 text-[11px] text-muted-foreground">{series.count} {t("publicReader.worksUnit", "部")}</p>
      </div>
    </button>
  );
});
