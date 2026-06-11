"use client";

import { useCallback } from "react";
import {
  ScriptGalleryCard,
  HorizontalScrollLane,
  type EnrichedGalleryScript,
  type PublicHomepageModel,
} from "@write/public-ui";

const CARD_WIDTH = "min-w-[160px] w-[160px] sm:min-w-[180px] sm:w-[180px]";

interface GalleryScriptResultsProps {
  model: PublicHomepageModel;
  onResetFilters: () => void;
}

export function GalleryScriptResults({ model, onResetFilters }: GalleryScriptResultsProps) {
  const { filteredScripts, lanes, showLanes, hasFilters, viewMode, emptyState } = model;

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

  if (!showLanes) {
    return (
      <div
        className="grid gap-4 sm:gap-5"
        style={{
          gridTemplateColumns: `repeat(auto-fill, minmax(${viewMode === "compact" ? "140px" : "165px"}, 1fr))`,
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
        {emptyState !== "none" && (
          <div className="col-span-full py-16 text-center">
            <p className="text-muted-foreground text-sm">
              {emptyState === "no-match" ? "找不到符合條件的台本" : "目前沒有公開台本"}
            </p>
            {emptyState === "no-match" && (
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
    );
  }

  // Default lanes view
  return (
    <div className="space-y-12">
      {lanes.latestPreview.length > 0 && (
        <HorizontalScrollLane title="最新發布">
          {lanes.latestPreview.map((s) => (
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
      {lanes.topViewedPreview.length > 0 && (
        <HorizontalScrollLane title="點閱排行">
          {lanes.topViewedPreview.map((s) => (
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
      {lanes.featuredSeries.map((series) => (
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
      {(emptyState === "no-public-scripts" || emptyState === "no-data") && (
        <p className="py-16 text-center text-muted-foreground text-sm">目前沒有公開台本</p>
      )}
    </div>
  );
}
