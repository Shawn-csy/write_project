"use client";

import { useCallback } from "react";
import {
  ScriptGalleryCard,
  HorizontalScrollLane,
  type EnrichedGalleryScript,
  type FeaturedSeries,
} from "@write/public-ui";

const CARD_WIDTH = "min-w-[160px] w-[160px] sm:min-w-[180px] sm:w-[180px]";

interface GalleryScriptResultsProps {
  isDefaultView: boolean;
  viewMode: "standard" | "compact";
  filteredScripts: EnrichedGalleryScript[];
  topViewedScriptsPreview: EnrichedGalleryScript[];
  latestScriptsPreview: EnrichedGalleryScript[];
  featuredSeries: FeaturedSeries[];
  hasFilters: boolean;
  onResetFilters: () => void;
  searchTerm: string;
}

export function GalleryScriptResults({
  isDefaultView,
  viewMode,
  filteredScripts,
  topViewedScriptsPreview,
  latestScriptsPreview,
  featuredSeries,
  hasFilters,
  onResetFilters,
  searchTerm,
}: GalleryScriptResultsProps) {
  const handleSeriesClick = useCallback(
    (name: string) => { window.location.href = `/series/${encodeURIComponent(name)}`; },
    []
  );
  const handleTagClick = useCallback(
    (tag: string) => { window.location.href = `/tag/${encodeURIComponent(tag)}`; },
    []
  );
  const handleAuthorClick = useCallback(
    (authorId: string) => { window.location.href = `/author/${authorId}`; },
    []
  );

  const authorHref = (s: EnrichedGalleryScript) =>
    typeof s.author === "object" && s.author?.id ? `/author/${s.author.id}` : undefined;
  const seriesHref = (s: EnrichedGalleryScript) =>
    s.seriesName ? `/series/${encodeURIComponent(s.seriesName)}` : undefined;

  if (hasFilters || !isDefaultView) {
    return (
      <>
        <p className="text-xs text-muted-foreground mb-4">
          {searchTerm
            ? `搜尋「${searchTerm}」共 ${filteredScripts.length} 筆結果`
            : `${filteredScripts.length} 部公開台本`}
        </p>
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(auto-fill, minmax(${viewMode === "compact" ? "140px" : "160px"}, 1fr))`,
          }}
        >
          {filteredScripts.map((s) => (
            <ScriptGalleryCard
              key={s.id}
              script={s}
              variant={viewMode}
              href={`/read/${s.id}`}
              authorHref={authorHref(s)}
              seriesHref={seriesHref(s)}
              onSeriesClick={handleSeriesClick}
              onTagClick={handleTagClick}
              onAuthorClick={handleAuthorClick}
            />
          ))}
          {filteredScripts.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <p className="text-muted-foreground text-sm">找不到符合的台本</p>
              {hasFilters && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="mt-2 text-sm text-primary underline"
                >
                  清除篩選
                </button>
              )}
            </div>
          )}
        </div>
      </>
    );
  }

  // Default lanes view
  return (
    <div className="space-y-10">
      {latestScriptsPreview.length > 0 && (
        <HorizontalScrollLane title="最新發布">
          {latestScriptsPreview.map((s) => (
            <div key={s.id} className={CARD_WIDTH}>
              <ScriptGalleryCard
                script={s}
                variant={viewMode}
                href={`/read/${s.id}`}
                authorHref={authorHref(s)}
                seriesHref={seriesHref(s)}
                onSeriesClick={handleSeriesClick}
                onTagClick={handleTagClick}
                onAuthorClick={handleAuthorClick}
              />
            </div>
          ))}
        </HorizontalScrollLane>
      )}
      {topViewedScriptsPreview.length > 0 && (
        <HorizontalScrollLane title="點閱排行">
          {topViewedScriptsPreview.map((s) => (
            <div key={s.id} className={CARD_WIDTH}>
              <ScriptGalleryCard
                script={s}
                variant={viewMode}
                href={`/read/${s.id}`}
                authorHref={authorHref(s)}
                seriesHref={seriesHref(s)}
                onSeriesClick={handleSeriesClick}
                onTagClick={handleTagClick}
                onAuthorClick={handleAuthorClick}
              />
            </div>
          ))}
        </HorizontalScrollLane>
      )}
      {featuredSeries.map((series) => (
        <HorizontalScrollLane
          key={series.name}
          title={series.name}
          actionLabel="查看系列"
          onAction={() => handleSeriesClick(series.name)}
        >
          {series.scripts.slice(0, 15).map((s) => (
            <div key={s.id} className={CARD_WIDTH}>
              <ScriptGalleryCard
                script={s}
                variant={viewMode}
                href={`/read/${s.id}`}
                authorHref={authorHref(s)}
                seriesHref={`/series/${encodeURIComponent(series.name)}`}
                onSeriesClick={handleSeriesClick}
                onTagClick={handleTagClick}
                onAuthorClick={handleAuthorClick}
              />
            </div>
          ))}
        </HorizontalScrollLane>
      ))}
      {latestScriptsPreview.length === 0 && topViewedScriptsPreview.length === 0 && (
        <p className="py-16 text-center text-muted-foreground text-sm">目前沒有公開台本</p>
      )}
    </div>
  );
}
