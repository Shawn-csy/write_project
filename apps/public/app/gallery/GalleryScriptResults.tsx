"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  getSeriesTimestamp,
  getGalleryPublishedTimestamp,
} from "@write/public-ui";
import { GalleryEmptyState } from "./GalleryEmptyState";
import { PublicImage } from "@/components/PublicImage";
import { ExternalPublicScriptCard } from "@/components/ExternalPublicScriptSection";
import type { ExternalPublicScript } from "@/lib/types";

const CARD_WIDTH = "min-w-[160px] w-[160px] sm:min-w-[180px] sm:w-[180px]";

type MixedGalleryEntry =
  | { kind: "external"; item: ExternalPublicScript }
  | { kind: "gallery"; entry: PublicGalleryEntry };

function toTimestamp(value: number | string | null | undefined): number {
  if (value == null || value === "") return 0;
  if (typeof value === "number") return value;
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function galleryEntryTimestamp(entry: PublicGalleryEntry): number {
  if (entry.type === "series") return getSeriesTimestamp(entry.latestScript);
  return getGalleryPublishedTimestamp(entry.script);
}

function sortMixedEntries(
  entries: PublicGalleryEntry[],
  externalItems: ExternalPublicScript[],
): MixedGalleryEntry[] {
  return [
    ...entries.map((entry): MixedGalleryEntry => ({ kind: "gallery", entry })),
    ...externalItems.map((item): MixedGalleryEntry => ({ kind: "external", item })),
  ].sort((a, b) => {
    const aDate = a.kind === "external"
      ? toTimestamp(a.item.mountedAt || a.item.createdAt)
      : galleryEntryTimestamp(a.entry);
    const bDate = b.kind === "external"
      ? toTimestamp(b.item.mountedAt || b.item.createdAt)
      : galleryEntryTimestamp(b.entry);
    return bDate - aDate;
  });
}

function laneSortMode(id: string): "latest" | "top" | undefined {
  return id === "latest" || id === "top" ? id : undefined;
}

type AllScriptsSort = "latest" | "top";
type AllScriptsItem =
  | { kind: "local"; item: EnrichedGalleryScript }
  | { kind: "external"; item: ExternalPublicScript };

function externalTimestamp(item: ExternalPublicScript): number {
  return toTimestamp(item.mountedAt || item.createdAt || item.updatedAt);
}

function sortAllScripts(
  scripts: EnrichedGalleryScript[],
  externalItems: ExternalPublicScript[],
  sort: AllScriptsSort,
): AllScriptsItem[] {
  const items: AllScriptsItem[] = [
    ...scripts.map((item) => ({ kind: "local" as const, item })),
    ...externalItems.map((item) => ({ kind: "external" as const, item })),
  ];

  return items.sort((a, b) => {
    const aViews = a.kind === "local" ? a.item.views || 0 : a.item.views || 0;
    const bViews = b.kind === "local" ? b.item.views || 0 : b.item.views || 0;
    const aDate = a.kind === "local" ? getGalleryPublishedTimestamp(a.item) : externalTimestamp(a.item);
    const bDate = b.kind === "local" ? getGalleryPublishedTimestamp(b.item) : externalTimestamp(b.item);
    const primary = sort === "top" ? bViews - aViews : bDate - aDate;
    return primary || (sort === "top" ? bDate - aDate : bViews - aViews);
  });
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let value = Math.max(1, Math.floor(seed * 2147483647));
  for (let index = result.length - 1; index > 0; index -= 1) {
    value = (value * 48271) % 2147483647;
    const swapIndex = value % (index + 1);
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

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
  onTagClick: (tag: string) => void;
  externalItems?: ExternalPublicScript[];
  onOpenAll: (sort?: "latest" | "top") => void;
  allScriptsSort?: AllScriptsSort | null;
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
  variant: "standard" | "compact" | "list";
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

export function GalleryScriptResults({
  model,
  onResetFilters,
  onTagClick,
  externalItems = [],
  onOpenAll,
  allScriptsSort = null,
}: GalleryScriptResultsProps) {
  const { galleryEntries, lanes, showLanes, viewMode, emptyState, navigationPolicyMap } = model;
  const allScriptCount = model.filteredScripts.length + externalItems.length;

  const mergedEntries = React.useMemo(
    () => sortMixedEntries(galleryEntries, externalItems),
    [galleryEntries, externalItems]
  );
  const [randomSeed, setRandomSeed] = useState(0.314159);
  useEffect(() => {
    setRandomSeed(Math.random());
  }, [mergedEntries]);
  const randomEntries = useMemo(
    () => seededShuffle(mergedEntries, randomSeed).slice(0, Math.min(8, mergedEntries.length)),
    [mergedEntries, randomSeed]
  );
  const allScripts = useMemo(
    () => sortAllScripts(model.filteredScripts, externalItems, allScriptsSort || "latest"),
    [model.filteredScripts, externalItems, allScriptsSort]
  );
  const revealDeps = [viewMode, mergedEntries.length, showLanes];
  const compactRef = useScrollReveal(revealDeps) as React.RefObject<HTMLDivElement>;
  const gridRef = useScrollReveal(revealDeps) as React.RefObject<HTMLDivElement>;

  const handleSeriesClick = useCallback(
    (name: string) => { window.location.href = `/series/${encodeURIComponent(name)}`; },
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
  const cardRenderOptions: LaneRenderOptions = {
    viewMode,
    navigationPolicyMap,
    authorHref,
    seriesHref,
    onSeriesClick: handleSeriesClick,
    onTagClick,
    onAuthorClick: handleAuthorClick,
  };

  if (allScriptsSort) {
    return (
      <div
        className="grid gap-5 sm:gap-6"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(165px, 1fr))" }}
        aria-live="polite"
      >
        {allScripts.map((entry) => {
          if (entry.kind === "external") {
            return <ExternalPublicScriptCard key={`external:${entry.item.id}`} item={entry.item} onTagClick={onTagClick} />;
          }

          const script = entry.item;
          return (
            <CardWithPolicy
              key={script.id}
              script={script}
              policy={navigationPolicyMap.get(script.id)}
              variant="standard"
              authorHref={authorHref(script)}
              seriesHref={seriesHref(script)}
              onSeriesClick={handleSeriesClick}
              onTagClick={onTagClick}
              onAuthorClick={handleAuthorClick}
            />
          );
        })}

        {allScripts.length === 0 && (
          <GalleryEmptyState
            reason={emptyState === "no-match" ? "no-match" : "no-public-scripts"}
            onResetFilters={onResetFilters}
            className="col-span-full"
          />
        )}

      </div>
    );
  }

  // Compact viewMode always shows flat list (filtered or default state)
  if (viewMode === "compact") {
    return (
      <div ref={compactRef} className="flex flex-col">
        {mergedEntries.map((entry) => (
          <div key={entry.kind === "external" ? `external:${entry.item.id}` : entry.entry.type === "series" ? `series:${entry.entry.key}` : entry.entry.script.id} data-reveal>
            {entry.kind === "external"
              ? <ExternalPublicScriptCard item={entry.item} variant="compact" onTagClick={onTagClick} />
              : renderGalleryEntry(entry.entry, { ...cardRenderOptions, viewMode: "compact" })}
          </div>
        ))}
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
        {mergedEntries.map((entry) => (
          <div key={entry.kind === "external" ? `external:${entry.item.id}` : entry.entry.type === "series" ? `series:${entry.entry.key}` : entry.entry.script.id} data-reveal>
            {entry.kind === "external"
              ? <ExternalPublicScriptCard item={entry.item} onTagClick={onTagClick} />
              : renderGalleryEntry(entry.entry, { ...cardRenderOptions, viewMode: "standard" })}
          </div>
        ))}
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
      {lanes.ordered.map((lane, laneIndex) =>
        lane.entries.length > 0 || (laneIndex === 0 && externalItems.length > 0) ? (
          <HorizontalScrollLane
            key={lane.id}
            title={
              lane.isActive ? (
                <span className="font-semibold">{lane.title}</span>
              ) : (
                lane.title
              )
            }
            actionLabel={
              laneSortMode(lane.id) && allScriptCount > lane.entries.length
                ? "查看更多"
                : undefined
            }
            onAction={laneSortMode(lane.id) && allScriptCount > lane.entries.length
              ? () => onOpenAll(laneSortMode(lane.id))
              : undefined}
          >
            {laneIndex === 0
              ? sortMixedEntries(lane.entries, externalItems).map((entry) => (
                  <div key={entry.kind === "external" ? `external:${entry.item.id}` : entry.entry.type === "series" ? `series:${entry.entry.key}` : entry.entry.script.id} className={CARD_WIDTH}>
                    {entry.kind === "external"
                      ? <ExternalPublicScriptCard item={entry.item} onTagClick={onTagClick} />
                      : renderGalleryEntry(entry.entry, cardRenderOptions)}
                  </div>
                ))
              : renderLaneEntries(lane.entries, cardRenderOptions)}
          </HorizontalScrollLane>
        ) : null
      )}
      {randomEntries.length > 0 && (
        <HorizontalScrollLane key="random" title="隨機推薦">
          {randomEntries.map((entry) => (
            <div key={entry.kind === "external" ? `external:${entry.item.id}` : entry.entry.type === "series" ? `series:${entry.entry.key}` : entry.entry.script.id} className={CARD_WIDTH}>
              {entry.kind === "external"
                ? <ExternalPublicScriptCard item={entry.item} onTagClick={onTagClick} />
                : renderGalleryEntry(entry.entry, cardRenderOptions)}
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
  return entries.map((entry) => (
    <div key={entry.type === "series" ? `series:${entry.key}` : entry.script.id} className={CARD_WIDTH}>
      {renderGalleryEntry(entry, opts)}
    </div>
  ));
}

function renderGalleryEntry(entry: PublicGalleryEntry, opts: LaneRenderOptions) {
  if (entry.type === "series") {
    return (
      <SeriesGalleryCard
        series={entry}
        variant={opts.viewMode === "compact" ? "compact" : "standard"}
        href={`/series/${encodeURIComponent(entry.name)}`}
        authorHref={opts.authorHref(entry.leadScript)}
        showAgeGate={entry.hasAgeGate}
        coverImageRenderer={galleryCoverImageRenderer}
      />
    );
  }

  return (
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
  );
}
