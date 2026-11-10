"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
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
  enrichScript,
  groupScriptsIntoGalleryEntries,
} from "@write/public-ui";
import { GalleryEmptyState } from "./GalleryEmptyState";
import { CardCoverPriority, CardMediaImage, CardMediaRegion } from "@/components/CardMediaVisibility";
import { publicCardAvatarRenderer } from "@/components/PublicCardAvatar";
import { ExternalPublicScriptCard } from "@/components/ExternalPublicScriptSection";
import { externalEntityHref } from "@/lib/externalEntity";
import type { ExternalPublicScript } from "@/lib/types";
import { externalCoverSrc } from "@/lib/externalCover";

// Grid and compact views initially render enough cards for the first screens;
// the horizontal lanes expand as readers scroll each lane.
export const INITIAL_RENDERED_CARDS = 24;

export function useProgressiveLimit(initial: number): number {
  const [limit, setLimit] = useState(initial);
  useEffect(() => {
    const expand = () => setLimit(Number.POSITIVE_INFINITY);
    if (typeof window.requestIdleCallback === "function") {
      const handle = window.requestIdleCallback(expand, { timeout: 1500 });
      return () => window.cancelIdleCallback(handle);
    }
    const timer = window.setTimeout(expand, 300);
    return () => window.clearTimeout(timer);
  }, []);
  return limit;
}

// Whole-card lanes: widths are fractions of the lane so N full cards always fit
// (2 on phones with a peek of the third, 3-6 as the viewport grows) and every
// card snaps to the lane edge instead of being sliced in half.
const CARD_WIDTH =
  "shrink-0 snap-start w-[calc((100%-1rem)/2.3)] sm:w-[calc((100%-2rem)/3)] md:w-[calc((100%-3rem)/4)] lg:w-[calc((100%-4rem)/5)] 2xl:w-[calc((100%-5rem)/6)]";
const FEATURED_HOMEPAGE_TAG = "清淡校園練習";

type MixedGalleryEntry =
  | { kind: "external"; item: ExternalPublicScript }
  | { kind: "external-series"; entry: Extract<PublicGalleryEntry, { type: "series" }> }
  | { kind: "gallery"; entry: PublicGalleryEntry };

type ExternalGalleryEntry = Exclude<MixedGalleryEntry, { kind: "gallery" }>;

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

function externalGalleryInput(item: ExternalPublicScript) {
  const authorName = item.authorName || item.organizationName || "";
  const authorAvatar = item.authorName
    ? item.authorAvatarUrl
    : item.organizationAvatarUrl;
  // Profile edits and refresh bookkeeping update `updatedAt`; a series card
  // should instead reflect the newest work's content/publication date.
  const contentTimestamp = item.mountedAt || item.sourceCreatedAt || item.createdAt;
  return enrichScript({
    id: `external:${item.id}`,
    title: item.title || item.remoteTitle || item.sourceDomain || "未命名台本",
    synopsis: item.summary || item.remoteSummary || "",
    coverUrl: externalCoverSrc(item),
    tags: item.categories || [],
    series: item.seriesName ? { name: item.seriesName } : undefined,
    seriesName: item.seriesName,
    seriesOrder: item.seriesOrder,
    author: authorName
      ? { displayName: authorName, avatarUrl: authorAvatar, profileUrl: item.authorUrl }
      : null,
    organization: item.organizationName
      ? { name: item.organizationName, logoUrl: item.organizationAvatarUrl, profileUrl: item.organizationUrl }
      : null,
    views: item.views,
    createdAt: contentTimestamp,
    updatedAt: contentTimestamp,
  });
}

function externalSeriesEntries(items: ExternalPublicScript[]): ExternalGalleryEntry[] {
  const seriesItems = items.filter((item) => item.seriesName?.trim());
  const grouped = groupScriptsIntoGalleryEntries(seriesItems.map(externalGalleryInput));
  const seriesByKey = new Map(
    grouped
      .filter((entry): entry is Extract<PublicGalleryEntry, { type: "series" }> => entry.type === "series")
      .map((entry) => [entry.key, entry])
  );
  const emittedSeries = new Set<string>();
  const result: ExternalGalleryEntry[] = [];

  for (const item of items) {
    const seriesName = item.seriesName?.trim();
    if (seriesName) {
      const key = seriesName.toLocaleLowerCase();
      if (emittedSeries.has(key)) continue;
      const entry = seriesByKey.get(key);
      if (entry) {
        emittedSeries.add(key);
        result.push({ kind: "external-series", entry });
      }
      continue;
    }
    result.push({ kind: "external", item });
  }

  return result;
}

function mixedEntryTimestamp(entry: MixedGalleryEntry): number {
  if (entry.kind === "external") return toTimestamp(entry.item.mountedAt || entry.item.createdAt);
  if (entry.kind === "external-series") return toTimestamp(entry.entry.updatedAt);
  return galleryEntryTimestamp(entry.entry);
}

function hasGalleryTag(tags: readonly string[] | undefined, tagName: string): boolean {
  const normalized = tagName.trim().toLocaleLowerCase();
  return (tags ?? []).some((tag) => String(tag).trim().toLocaleLowerCase() === normalized);
}

function entryHasGalleryTag(entry: MixedGalleryEntry, tagName: string): boolean {
  if (entry.kind === "external") {
    return hasGalleryTag(entry.item.categories, tagName);
  }

  if (entry.kind === "external-series") {
    return entry.entry.scripts.some((script) => hasGalleryTag(script.tags, tagName));
  }

  if (entry.entry.type === "series") {
    return entry.entry.scripts.some((script) => hasGalleryTag(script.tags, tagName));
  }

  return hasGalleryTag(entry.entry.script.tags, tagName);
}

function sortMixedEntries(
  entries: PublicGalleryEntry[],
  externalItems: ExternalPublicScript[],
): MixedGalleryEntry[] {
  return [
    ...entries.map((entry): MixedGalleryEntry => ({ kind: "gallery", entry })),
    ...externalSeriesEntries(externalItems),
  ].sort((a, b) => {
    const aDate = mixedEntryTimestamp(a);
    const bDate = mixedEntryTimestamp(b);
    return bDate - aDate;
  });
}

function laneSortMode(id: string): "latest" | "top" | undefined {
  return id === "latest" || id === "top" ? id : undefined;
}

type AllScriptsSort = "latest" | "top" | "random";
type AllScriptsItem =
  | { kind: "local"; item: EnrichedGalleryScript }
  | { kind: "external"; item: ExternalPublicScript }
  | { kind: "external-series"; entry: Extract<PublicGalleryEntry, { type: "series" }> };

function externalTimestamp(item: ExternalPublicScript): number {
  return toTimestamp(item.mountedAt || item.createdAt || item.updatedAt);
}

function sortAllScripts(
  scripts: EnrichedGalleryScript[],
  externalItems: ExternalPublicScript[],
  sort: AllScriptsSort,
  randomSeed = 0.314159,
): AllScriptsItem[] {
  const items: AllScriptsItem[] = [
    ...scripts.map((item) => ({ kind: "local" as const, item })),
    ...externalSeriesEntries(externalItems).map((entry) => entry.kind === "external"
      ? { kind: "external" as const, item: entry.item }
      : { kind: "external-series" as const, entry: entry.entry }),
  ];

  if (sort === "random") return seededShuffle(items, randomSeed);

  return items.sort((a, b) => {
    const aViews = a.kind === "local"
      ? a.item.views || 0
      : a.kind === "external"
        ? a.item.views || 0
        : Math.max(0, ...a.entry.scripts.map((script) => script.views || 0));
    const bViews = b.kind === "local"
      ? b.item.views || 0
      : b.kind === "external"
        ? b.item.views || 0
        : Math.max(0, ...b.entry.scripts.map((script) => script.views || 0));
    const aDate = a.kind === "local"
      ? getGalleryPublishedTimestamp(a.item)
      : a.kind === "external"
        ? externalTimestamp(a.item)
        : toTimestamp(a.entry.updatedAt);
    const bDate = b.kind === "local"
      ? getGalleryPublishedTimestamp(b.item)
      : b.kind === "external"
        ? externalTimestamp(b.item)
        : toTimestamp(b.entry.updatedAt);
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
  <CardMediaImage
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
  onOpenAll: (sort?: "latest" | "top" | "random") => void;
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
      avatarImageRenderer={publicCardAvatarRenderer}
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
  const renderLimit = useProgressiveLimit(INITIAL_RENDERED_CARDS);
  const [randomSeed, setRandomSeed] = useState(0.314159);
  const randomEntries = useMemo(
    () => seededShuffle(mergedEntries, randomSeed).slice(0, Math.min(8, mergedEntries.length)),
    [mergedEntries, randomSeed]
  );
  const featuredPracticeEntries = useMemo(
    () => mergedEntries.filter((entry) => entryHasGalleryTag(entry, FEATURED_HOMEPAGE_TAG)),
    [mergedEntries]
  );
  const allScripts = useMemo(
    () => sortAllScripts(model.filteredScripts, externalItems, allScriptsSort || "latest", randomSeed),
    [model.filteredScripts, externalItems, allScriptsSort, randomSeed]
  );
  const revealDeps = [viewMode, mergedEntries.length, showLanes, renderLimit];
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
  const externalSeriesAuthorHref = useCallback((entry: Extract<PublicGalleryEntry, { type: "series" }>) => {
    const author = entry.leadScript.author;
    const name = typeof author === "object" ? author?.displayName : author;
    const profileUrl = typeof author === "object" ? String(author?.profileUrl || "") : "";
    return name ? externalEntityHref("author", name, profileUrl) : undefined;
  }, []);
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
        {allScriptsSort === "random" && allScripts.length > 0 && (
          <div className="col-span-full flex justify-end">
            <button
              type="button"
              onClick={() => setRandomSeed(Math.random())}
              className="inline-flex h-8 items-center rounded-md border border-border/60 bg-background/40 px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
            >
              重新隨機
            </button>
          </div>
        )}
        {allScripts.map((entry) => {
          if (entry.kind === "external") {
            return <ExternalPublicScriptCard key={`external:${entry.item.id}`} item={entry.item} onTagClick={onTagClick} />;
          }
          if (entry.kind === "external-series") {
            return (
              <SeriesGalleryCard
                key={`external-series:${entry.entry.key}`}
                series={entry.entry}
                variant="standard"
                href={`/series/${encodeURIComponent(entry.entry.name)}`}
                authorHref={externalSeriesAuthorHref(entry.entry)}
                showAgeGate={entry.entry.hasAgeGate}
                coverImageRenderer={galleryCoverImageRenderer}
              />
            );
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
        {mergedEntries.slice(0, renderLimit).map((entry) => (
          <div key={entry.kind === "external" ? `external:${entry.item.id}` : entry.kind === "external-series" ? `external-series:${entry.entry.key}` : entry.entry.type === "series" ? `series:${entry.entry.key}` : entry.entry.script.id} data-reveal>
            {entry.kind === "external"
              ? <ExternalPublicScriptCard item={entry.item} variant="compact" onTagClick={onTagClick} />
              : entry.kind === "external-series"
                ? <SeriesGalleryCard series={entry.entry} variant="compact" href={`/series/${encodeURIComponent(entry.entry.name)}`} authorHref={externalSeriesAuthorHref(entry.entry)} showAgeGate={entry.entry.hasAgeGate} coverImageRenderer={galleryCoverImageRenderer} />
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
        {mergedEntries.slice(0, renderLimit).map((entry) => (
          <div key={entry.kind === "external" ? `external:${entry.item.id}` : entry.kind === "external-series" ? `external-series:${entry.entry.key}` : entry.entry.type === "series" ? `series:${entry.entry.key}` : entry.entry.script.id} data-reveal>
            {entry.kind === "external"
              ? <ExternalPublicScriptCard item={entry.item} onTagClick={onTagClick} />
              : entry.kind === "external-series"
                ? <SeriesGalleryCard series={entry.entry} variant="standard" href={`/series/${encodeURIComponent(entry.entry.name)}`} authorHref={externalSeriesAuthorHref(entry.entry)} showAgeGate={entry.entry.hasAgeGate} coverImageRenderer={galleryCoverImageRenderer} />
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
    <div className="space-y-8 sm:space-y-9">
      {randomEntries.length > 0 && (
        <HorizontalScrollLane
          key="random"
          title="隨機推薦"
          actionLabel={<><span className="sr-only sm:hidden">換一批</span><span className="hidden sm:inline">換一批</span><RefreshCw className="h-3.5 w-3.5 sm:hidden" aria-hidden /></>}
          onAction={() => setRandomSeed(Math.random())}
        >
          {randomEntries.map((entry, index) => (
            <CardCoverPriority key={entry.kind === "external" ? `external:${entry.item.id}` : entry.kind === "external-series" ? `external-series:${entry.entry.key}` : entry.entry.type === "series" ? `series:${entry.entry.key}` : entry.entry.script.id} eager={index < 3}>
            <div className={CARD_WIDTH}>
              {entry.kind === "external"
                ? <ExternalPublicScriptCard item={entry.item} onTagClick={onTagClick} />
                : entry.kind === "external-series"
                  ? <SeriesGalleryCard series={entry.entry} variant="standard" href={`/series/${encodeURIComponent(entry.entry.name)}`} authorHref={externalSeriesAuthorHref(entry.entry)} showAgeGate={entry.entry.hasAgeGate} coverImageRenderer={galleryCoverImageRenderer} />
                  : renderGalleryEntry(entry.entry, cardRenderOptions)}
            </div>
            </CardCoverPriority>
          ))}
        </HorizontalScrollLane>
      )}
      {lanes.ordered.map((lane, laneIndex) =>
        lane.entries.length > 0 || (laneIndex === 0 && externalItems.length > 0) ? (
          <CardMediaRegion key={lane.id} defer={randomEntries.length > 0 || laneIndex > 0}>
          <HorizontalScrollLane
            initialItemCount={8}
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
                  <div key={entry.kind === "external" ? `external:${entry.item.id}` : entry.kind === "external-series" ? `external-series:${entry.entry.key}` : entry.entry.type === "series" ? `series:${entry.entry.key}` : entry.entry.script.id} className={CARD_WIDTH}>
                    {entry.kind === "external"
                      ? <ExternalPublicScriptCard item={entry.item} onTagClick={onTagClick} />
                      : entry.kind === "external-series"
                        ? <SeriesGalleryCard series={entry.entry} variant="standard" href={`/series/${encodeURIComponent(entry.entry.name)}`} authorHref={externalSeriesAuthorHref(entry.entry)} showAgeGate={entry.entry.hasAgeGate} coverImageRenderer={galleryCoverImageRenderer} />
                        : renderGalleryEntry(entry.entry, cardRenderOptions)}
                  </div>
                ))
              : renderLaneEntries(lane.entries, cardRenderOptions)}
          </HorizontalScrollLane>
          </CardMediaRegion>
        ) : null
      )}
      {featuredPracticeEntries.length > 0 && (
        <CardMediaRegion defer={randomEntries.length > 0 || lanes.ordered.some((lane) => lane.entries.length > 0)}>
        <HorizontalScrollLane
          key="featured-student-practice"
          initialItemCount={8}
          title={(
            <button
              type="button"
              onClick={() => onTagClick(FEATURED_HOMEPAGE_TAG)}
              className="transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
              aria-label={`查看${FEATURED_HOMEPAGE_TAG}標籤`}
            >
              {FEATURED_HOMEPAGE_TAG}
            </button>
          )}
        >
          {featuredPracticeEntries.map((entry) => (
            <div key={entry.kind === "external" ? `external:${entry.item.id}` : entry.kind === "external-series" ? `external-series:${entry.entry.key}` : entry.entry.type === "series" ? `series:${entry.entry.key}` : entry.entry.script.id} className={CARD_WIDTH}>
              {entry.kind === "external"
                ? <ExternalPublicScriptCard item={entry.item} onTagClick={onTagClick} />
                : entry.kind === "external-series"
                  ? <SeriesGalleryCard series={entry.entry} variant="standard" href={`/series/${encodeURIComponent(entry.entry.name)}`} authorHref={externalSeriesAuthorHref(entry.entry)} showAgeGate={entry.entry.hasAgeGate} coverImageRenderer={galleryCoverImageRenderer} />
                  : renderGalleryEntry(entry.entry, cardRenderOptions)}
            </div>
          ))}
        </HorizontalScrollLane>
        </CardMediaRegion>
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
