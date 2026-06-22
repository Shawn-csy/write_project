"use client";

import { useCallback } from "react";
import {
  ScriptGalleryCard,
  SeriesGalleryCard,
  HorizontalScrollLane,
  type EnrichedGalleryScript,
  type PublicHomepageModel,
  type ScriptNavigationPolicy,
} from "@write/public-ui";
import { GalleryEmptyState } from "./GalleryEmptyState";

const CARD_WIDTH = "min-w-[160px] w-[160px] sm:min-w-[180px] sm:w-[180px]";

interface GalleryScriptResultsProps {
  model: PublicHomepageModel;
  onResetFilters: () => void;
}

function CardWithPolicy({
  script,
  policy,
  variant,
  authorHref,
  seriesHref,
  onSeriesClick,
  onTagClick,
  onAuthorClick,
}: {
  script: EnrichedGalleryScript;
  policy: ScriptNavigationPolicy | undefined;
  variant: "standard" | "compact";
  authorHref?: string;
  seriesHref?: string;
  onSeriesClick: (name: string) => void;
  onTagClick: (tag: string) => void;
  onAuthorClick: (id: string) => void;
}) {
  return (
    <ScriptGalleryCard
      script={script}
      variant={variant}
      href={`/read/${script.id}`}
      authorHref={authorHref}
      seriesHref={seriesHref}
      onSeriesClick={onSeriesClick}
      onTagClick={onTagClick}
      onAuthorClick={onAuthorClick}
      showAgeGate={policy?.showGateIndicator ?? false}
    />
  );
}

export function GalleryScriptResults({ model, onResetFilters }: GalleryScriptResultsProps) {
  const { filteredScripts, galleryEntries, lanes, showLanes, viewMode, emptyState, navigationPolicyMap } = model;

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

  // Compact viewMode always shows flat list (filtered or default state)
  if (viewMode === "compact") {
    return (
      <div className="flex flex-col">
        {galleryEntries.map((entry) => {
          if (entry.type === "series") {
            return (
              <SeriesGalleryCard
                key={`series:${entry.key}`}
                series={entry}
                variant="compact"
                href={`/series/${encodeURIComponent(entry.name)}`}
                authorHref={authorHref(entry.leadScript)}
                showAgeGate={entry.hasAgeGate}
              />
            );
          }
          const s = entry.script;
          return (
            <CardWithPolicy
              key={s.id}
              script={s}
              policy={navigationPolicyMap.get(s.id)}
              variant="compact"
              authorHref={authorHref(s)}
              seriesHref={seriesHref(s)}
              onSeriesClick={handleSeriesClick}
              onTagClick={handleTagClick}
              onAuthorClick={handleAuthorClick}
            />
          );
        })}
        {filteredScripts.length === 0 && emptyState !== "none" && (
          <GalleryEmptyState reason={emptyState === "no-match" ? "no-match" : "no-public-scripts"} onResetFilters={onResetFilters} />
        )}
      </div>
    );
  }

  // Standard grid when filters active (no lanes)
  if (!showLanes) {
    return (
      <div
        className="grid gap-5 sm:gap-6"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))" }}
      >
        {galleryEntries.map((entry) => {
          if (entry.type === "series") {
            return (
              <SeriesGalleryCard
                key={`series:${entry.key}`}
                series={entry}
                variant="standard"
                href={`/series/${encodeURIComponent(entry.name)}`}
                authorHref={authorHref(entry.leadScript)}
                showAgeGate={entry.hasAgeGate}
              />
            );
          }
          const s = entry.script;
          return (
            <CardWithPolicy
              key={s.id}
              script={s}
              policy={navigationPolicyMap.get(s.id)}
              variant="standard"
              authorHref={authorHref(s)}
              seriesHref={seriesHref(s)}
              onSeriesClick={handleSeriesClick}
              onTagClick={handleTagClick}
              onAuthorClick={handleAuthorClick}
            />
          );
        })}
        {emptyState !== "none" && (
          <GalleryEmptyState
            reason={emptyState === "no-match" ? "no-match" : "no-public-scripts"}
            onResetFilters={onResetFilters}
            className="col-span-full"
          />
        )}
      </div>
    );
  }

  // Default lanes view
  return (
    <div className="space-y-12">
      {lanes.latestEntriesPreview.length > 0 && (
        <HorizontalScrollLane title="最新發布">
          {lanes.latestEntriesPreview.map((entry) =>
            entry.type === "series" ? (
              <div key={`series:${entry.key}`} className={CARD_WIDTH}>
                <SeriesGalleryCard
                  series={entry}
                  variant="standard"
                  href={`/series/${encodeURIComponent(entry.name)}`}
                  authorHref={authorHref(entry.leadScript)}
                  showAgeGate={entry.hasAgeGate}
                />
              </div>
            ) : (
              <div key={entry.script.id} className={CARD_WIDTH}>
                <CardWithPolicy
                  script={entry.script}
                  policy={navigationPolicyMap.get(entry.script.id)}
                  variant={viewMode}
                  authorHref={authorHref(entry.script)}
                  seriesHref={seriesHref(entry.script)}
                  onSeriesClick={handleSeriesClick}
                  onTagClick={handleTagClick}
                  onAuthorClick={handleAuthorClick}
                />
              </div>
            )
          )}
        </HorizontalScrollLane>
      )}
      {lanes.topViewedEntriesPreview.length > 0 && (
        <HorizontalScrollLane title="點閱排行">
          {lanes.topViewedEntriesPreview.map((entry) =>
            entry.type === "series" ? (
              <div key={`series:${entry.key}`} className={CARD_WIDTH}>
                <SeriesGalleryCard
                  series={entry}
                  variant="standard"
                  href={`/series/${encodeURIComponent(entry.name)}`}
                  authorHref={authorHref(entry.leadScript)}
                  showAgeGate={entry.hasAgeGate}
                />
              </div>
            ) : (
              <div key={entry.script.id} className={CARD_WIDTH}>
                <CardWithPolicy
                  script={entry.script}
                  policy={navigationPolicyMap.get(entry.script.id)}
                  variant={viewMode}
                  authorHref={authorHref(entry.script)}
                  seriesHref={seriesHref(entry.script)}
                  onSeriesClick={handleSeriesClick}
                  onTagClick={handleTagClick}
                  onAuthorClick={handleAuthorClick}
                />
              </div>
            )
          )}
        </HorizontalScrollLane>
      )}
      {lanes.featuredSeries.length > 0 && (
        <HorizontalScrollLane title="系列作品">
          {lanes.featuredSeries.map((series) => (
            <div key={`series:${series.key}`} className={CARD_WIDTH}>
              <SeriesGalleryCard
                series={series}
                variant="standard"
                href={`/series/${encodeURIComponent(series.name)}`}
                authorHref={authorHref(series.leadScript)}
                showAgeGate={series.hasAgeGate}
              />
            </div>
          ))}
        </HorizontalScrollLane>
      )}
      {(emptyState === "no-public-scripts" || emptyState === "no-data") && (
        <GalleryEmptyState reason={emptyState} />
      )}
    </div>
  );
}
