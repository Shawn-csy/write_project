"use client";

import React, { useCallback } from "react";
import {
  ScriptGalleryCard,
  SeriesGalleryCard,
  HorizontalScrollLane,
  useScrollReveal,
  type EnrichedGalleryScript,
  type PublicHomepageModel,
  type ScriptNavigationPolicy,
  type PublicGalleryEntry,
  type GalleryViewMode,
  type CoverImageRenderer,
} from "@write/public-ui";
import { GalleryEmptyState } from "./GalleryEmptyState";
import { PublicImage } from "@/components/PublicImage";

const CARD_WIDTH = "min-w-[160px] w-[160px] sm:min-w-[180px] sm:w-[180px]";

/**
 * Module-level stable renderer — passes cover images through next/image so
 * the browser receives a proper srcset instead of a single <img src>.
 * Defined outside the component to avoid re-creation on every render.
 */
const galleryCoverImageRenderer: CoverImageRenderer = ({ src, crop, alt, className }) => (
  <PublicImage
    src={src}
    crop={crop}
    alt={alt}
    preset="script-cover"
    className={className}
  />
);

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
      scriptHref={`/read/${script.id}`}
      authorHref={authorHref}
      seriesHref={seriesHref}
      onSeriesClick={onSeriesClick}
      onTagClick={onTagClick}
      onAuthorClick={onAuthorClick}
      showAgeGate={policy?.showGateIndicator ?? false}
      coverImageRenderer={galleryCoverImageRenderer}
    />
  );
}

export function GalleryScriptResults({ model, onResetFilters }: GalleryScriptResultsProps) {
  const { galleryEntries, lanes, showLanes, viewMode, emptyState, navigationPolicyMap } = model;

  const revealDeps = [viewMode, galleryEntries.length, showLanes];
  const compactRef = useScrollReveal(revealDeps) as React.RefObject<HTMLDivElement>;
  const gridRef = useScrollReveal(revealDeps) as React.RefObject<HTMLDivElement>;

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
  const authorHref = useCallback(
    (s: EnrichedGalleryScript) =>
      typeof s.author === "object" && s.author?.id ? `/author/${s.author.id}` : undefined,
    []
  );
  const seriesHref = useCallback(
    (s: EnrichedGalleryScript) =>
      s.seriesName ? `/series/${encodeURIComponent(s.seriesName)}` : undefined,
    []
  );

  // Compact viewMode always shows flat list (filtered or default state)
  if (viewMode === "compact") {
    return (
      <div ref={compactRef} className="flex flex-col">
        {galleryEntries.map((entry) => {
          if (entry.type === "series") {
            return (
              <div key={`series:${entry.key}`} data-reveal>
                <SeriesGalleryCard
                  series={entry}
                  variant="compact"
                  href={`/series/${encodeURIComponent(entry.name)}`}
                  authorHref={authorHref(entry.leadScript)}
                  showAgeGate={entry.hasAgeGate}
                  coverImageRenderer={galleryCoverImageRenderer}
                />
              </div>
            );
          }
          const s = entry.script;
          return (
            <div key={s.id} data-reveal>
              <CardWithPolicy
                script={s}
                policy={navigationPolicyMap.get(s.id)}
                variant="compact"
                authorHref={authorHref(s)}
                seriesHref={seriesHref(s)}
                onSeriesClick={handleSeriesClick}
                onTagClick={handleTagClick}
                onAuthorClick={handleAuthorClick}
              />
            </div>
          );
        })}
        {emptyState !== "none" && (
          <GalleryEmptyState reason={emptyState === "no-match" ? "no-match" : "no-public-scripts"} onResetFilters={onResetFilters} />
        )}
      </div>
    );
  }

  // Standard grid when filters active (no lanes)
  if (!showLanes) {
    return (
      <div
        ref={gridRef}
        className="grid gap-5 sm:gap-6"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))" }}
      >
        {galleryEntries.map((entry) => {
          if (entry.type === "series") {
            return (
              <div key={`series:${entry.key}`} data-reveal>
                <SeriesGalleryCard
                  series={entry}
                  variant="standard"
                  href={`/series/${encodeURIComponent(entry.name)}`}
                  authorHref={authorHref(entry.leadScript)}
                  showAgeGate={entry.hasAgeGate}
                  coverImageRenderer={galleryCoverImageRenderer}
                />
              </div>
            );
          }
          const s = entry.script;
          return (
            <div key={s.id} data-reveal>
              <CardWithPolicy
                script={s}
                policy={navigationPolicyMap.get(s.id)}
                variant="standard"
                authorHref={authorHref(s)}
                seriesHref={seriesHref(s)}
                onSeriesClick={handleSeriesClick}
                onTagClick={handleTagClick}
                onAuthorClick={handleAuthorClick}
              />
            </div>
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

  // Default lanes view — ordered by activeLaneMode (active lane first)
  return (
    <div className="space-y-12">
      {lanes.ordered.map((lane) =>
        lane.entries.length > 0 ? (
          <HorizontalScrollLane
            key={lane.id}
            title={
              lane.isActive ? (
                <span className="font-semibold">{lane.title}</span>
              ) : (
                lane.title
              )
            }
          >
            {renderLaneEntries(lane.entries, {
              viewMode,
              navigationPolicyMap,
              authorHref,
              seriesHref,
              onSeriesClick: handleSeriesClick,
              onTagClick: handleTagClick,
              onAuthorClick: handleAuthorClick,
            })}
          </HorizontalScrollLane>
        ) : null
      )}
      {(emptyState === "no-public-scripts" || emptyState === "no-data") && (
        <GalleryEmptyState reason={emptyState} />
      )}
    </div>
  );
}

// ─── Lane entry renderer ──────────────────────────────────────────────────────

interface LaneRenderOptions {
  viewMode: GalleryViewMode;
  navigationPolicyMap: Map<string, ScriptNavigationPolicy>;
  authorHref: (s: EnrichedGalleryScript) => string | undefined;
  seriesHref: (s: EnrichedGalleryScript) => string | undefined;
  onSeriesClick: (name: string) => void;
  onTagClick: (tag: string) => void;
  onAuthorClick: (id: string) => void;
}

function renderLaneEntries(entries: PublicGalleryEntry[], opts: LaneRenderOptions) {
  return entries.map((entry) =>
    entry.type === "series" ? (
      <div key={`series:${entry.key}`} className={CARD_WIDTH}>
        <SeriesGalleryCard
          series={entry}
          variant="standard"
          href={`/series/${encodeURIComponent(entry.name)}`}
          authorHref={opts.authorHref(entry.leadScript)}
          showAgeGate={entry.hasAgeGate}
          coverImageRenderer={galleryCoverImageRenderer}
        />
      </div>
    ) : (
      <div key={entry.script.id} className={CARD_WIDTH}>
        <CardWithPolicy
          script={entry.script}
          policy={opts.navigationPolicyMap.get(entry.script.id)}
          variant={opts.viewMode}
          authorHref={opts.authorHref(entry.script)}
          seriesHref={opts.seriesHref(entry.script)}
          onSeriesClick={opts.onSeriesClick}
          onTagClick={opts.onTagClick}
          onAuthorClick={opts.onAuthorClick}
        />
      </div>
    )
  );
}
