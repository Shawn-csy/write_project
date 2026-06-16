/**
 * seriesModel.ts — pure series aggregation model.
 * No React, no router. Derives PublicGalleryEntry[] from EnrichedGalleryScript[].
 *
 * Phase 1 of public-series-aggregation-plan.md
 */

import { normalizeSeriesName } from "./filterModel";
import type { EnrichedGalleryScript } from "./filterModel";
import { scriptRequiresAgeGate } from "./navigationPolicy";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PublicSeriesGroup {
  type: "series";
  /** Stable lowercase key for dedup (normalized series name lowercased). */
  key: string;
  /** Display name — from the first script that provided it. */
  name: string;
  /** All scripts in this series, sorted by chapter order rules. */
  scripts: EnrichedGalleryScript[];
  /** First chapter (lowest seriesOrder; tie-break: newest updatedAt first). */
  leadScript: EnrichedGalleryScript;
  /** Most recently updated script. */
  latestScript: EnrichedGalleryScript;
  /** Timestamp of latest update (ms epoch or ISO string or null). */
  updatedAt: number | string | null;
  /** Resolved cover URL from series metadata or lead script cover. */
  coverUrl?: string;
  /** Series summary from script.series.summary. */
  summary?: string;
  /** True when any script in the series requires an age gate. */
  hasAgeGate: boolean;
}

export type PublicGalleryEntry =
  | { type: "script"; script: EnrichedGalleryScript }
  | PublicSeriesGroup;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTimestamp(script: EnrichedGalleryScript): number {
  const v = script.lastModified ?? script.updatedAt;
  if (v == null) return 0;
  if (typeof v === "number") return v;
  const n = Date.parse(String(v));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Sort scripts within a series:
 * 1. Valid seriesOrder ascending (null/undefined → MAX)
 * 2. Same order → updatedAt descending
 */
function sortChapters(scripts: EnrichedGalleryScript[]): EnrichedGalleryScript[] {
  return [...scripts].sort((a, b) => {
    const aOrder = a._seriesOrder ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b._seriesOrder ?? Number.MAX_SAFE_INTEGER;
    if (aOrder !== bOrder) return aOrder - bOrder;
    return getTimestamp(b) - getTimestamp(a);
  });
}

/**
 * Pick the best series cover using priority rules from the plan:
 * 1. script.series.coverUrl
 * 2. script.coverUrl from lowest seriesOrder
 * 3. latest updated script coverUrl
 */
function resolveCoverUrl(sorted: EnrichedGalleryScript[]): string | undefined {
  const fromSeriesMeta = sorted.find((s) =>
    String((s.series as { coverUrl?: string } | null)?.coverUrl || "").trim()
  )?.series?.coverUrl as string | undefined;
  if (fromSeriesMeta) return fromSeriesMeta;

  const fromScript = sorted.find((s) => String(s.coverUrl || "").trim())?.coverUrl;
  if (fromScript) return fromScript as string;

  return undefined;
}

function resolveSummary(sorted: EnrichedGalleryScript[]): string | undefined {
  for (const s of sorted) {
    const summary = (s.series as { summary?: string } | null)?.summary;
    if (summary && String(summary).trim()) return String(summary).trim();
  }
  return undefined;
}

// ─── groupScriptsIntoGalleryEntries ───────────────────────────────────────────

/**
 * Groups enriched scripts into PublicGalleryEntry[].
 *
 * - Scripts with a valid series.name / _seriesName are grouped into series entries.
 * - Scripts without a series remain as individual script entries.
 * - Each series appears exactly once.
 * - Within a series, chapters are sorted by seriesOrder then updatedAt.
 * - The overall entry list preserves the original ordering of the *first script*
 *   encountered for each entry (series or solo).
 */
export function groupScriptsIntoGalleryEntries(
  scripts: EnrichedGalleryScript[]
): PublicGalleryEntry[] {
  // Track insertion order via a linked list of keys
  const order: string[] = [];
  const seriesBuckets = new Map<
    string,
    { name: string; scripts: EnrichedGalleryScript[] }
  >();
  const soloEntries = new Map<string, EnrichedGalleryScript>();

  for (const script of scripts) {
    const rawName = normalizeSeriesName(script._seriesName || script.seriesName);
    if (rawName) {
      const key = rawName.toLowerCase();
      if (!seriesBuckets.has(key)) {
        seriesBuckets.set(key, { name: rawName, scripts: [] });
        order.push(`series:${key}`);
      }
      seriesBuckets.get(key)!.scripts.push(script);
    } else {
      if (!soloEntries.has(script.id)) {
        soloEntries.set(script.id, script);
        order.push(`script:${script.id}`);
      }
    }
  }

  const entries: PublicGalleryEntry[] = [];

  for (const key of order) {
    if (key.startsWith("series:")) {
      const seriesKey = key.slice(7);
      const bucket = seriesBuckets.get(seriesKey)!;
      const sorted = sortChapters(bucket.scripts);
      const leadScript = sorted[0];

      // Latest script = highest timestamp
      const latestScript = [...sorted].sort(
        (a, b) => getTimestamp(b) - getTimestamp(a)
      )[0];

      const coverUrl = resolveCoverUrl(sorted);
      const summary = resolveSummary(sorted);
      const hasAgeGate = sorted.some(scriptRequiresAgeGate);
      const updatedAt = getTimestamp(latestScript) || null;

      entries.push({
        type: "series",
        key: seriesKey,
        name: bucket.name,
        scripts: sorted,
        leadScript,
        latestScript,
        updatedAt,
        coverUrl,
        summary,
        hasAgeGate,
      });
    } else {
      const scriptId = key.slice(7);
      entries.push({ type: "script", script: soloEntries.get(scriptId)! });
    }
  }

  return entries;
}

// ─── deriveSeriesChapterOrder ─────────────────────────────────────────────────

/**
 * Sort chapters for display on the series page.
 * Same rules as sortChapters (exported for series page use).
 */
export function deriveSeriesChapterOrder(
  scripts: EnrichedGalleryScript[]
): EnrichedGalleryScript[] {
  return sortChapters(scripts);
}

// ─── deriveAggregatePolicy ────────────────────────────────────────────────────

/**
 * Returns true when any script in the group requires an age gate.
 * Used for the series card indicator.
 */
export function deriveAggregateAgeGate(scripts: EnrichedGalleryScript[]): boolean {
  return scripts.some(scriptRequiresAgeGate);
}
