/**
 * seriesEditorModel.ts — pure functions for publisher series authoring.
 *
 * Uses @write/public-ui deriveSeriesChapterOrder() for chapter sorting so that
 * the publisher UI and public reader always see the same chapter order.
 *
 * No React, no API calls, no side effects.
 */

import { deriveSeriesChapterOrder, getSeriesTimestamp } from "@write/public-ui";
import type { EnrichedGalleryScript } from "@write/public-ui";
import type { BaseScriptApi } from "../../types/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SeriesChapterRow {
  id: string;
  title: string;
  /** Normalized order: null when absent or non-finite. */
  seriesOrder: number | null;
  status: string;
  /** ms epoch. 0 when unknown. */
  updatedAt: number;
  /** True when seriesOrder === 0 (prologue / setting chapter). */
  isPrologue: boolean;
  /** True when seriesOrder is null or non-finite. */
  isMissingOrder: boolean;
}

export interface SeriesOrderConflict {
  order: number;
  scriptIds: string[];
}

export interface SeriesReadiness {
  hasName: boolean;
  hasSummary: boolean;
  hasCover: boolean;
  hasChapters: boolean;
  hasMissingOrders: boolean;
  hasConflicts: boolean;
  /** True when the series is ready for public presentation. */
  isReady: boolean;
}

export interface SeriesEditorModel {
  seriesId: string;
  name: string;
  summary: string;
  coverUrl: string;
  chapterRows: SeriesChapterRow[];
  conflicts: SeriesOrderConflict[];
  readiness: SeriesReadiness;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeOrder(raw: number | string | null | undefined): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function toMs(raw: number | string | null | undefined): number {
  if (raw == null) return 0;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  const n = Date.parse(String(raw));
  return Number.isFinite(n) ? n : 0;
}

/**
 * Adapt a BaseScriptApi to the minimal shape EnrichedGalleryScript needs for
 * deriveSeriesChapterOrder(). Only the fields used by the sort are mapped.
 */
function toEnrichedLike(script: BaseScriptApi): EnrichedGalleryScript {
  // lastModified must be undefined when absent so getSeriesTimestamp() can
  // fall through to updatedAt. Setting it to 0 would mask a valid ISO updatedAt.
  const lastModified =
    script.lastModified != null && Number.isFinite(script.lastModified)
      ? script.lastModified
      : undefined;

  return {
    ...script,
    id: script.id,
    title: script.title ?? "",
    _seriesOrder: normalizeOrder(script.seriesOrder),
    _seriesName: (script.series as { name?: string } | null | undefined)?.name ?? "",
    lastModified,
    updatedAt: script.updatedAt ?? null,
    // EnrichedGalleryScript fields not needed for sorting — provide defaults
    author: null,
    tags: [],
    _disableAuthorLink: false,
    _searchTitle: "",
    _searchAuthor: "",
    seriesName: (script.series as { name?: string } | null | undefined)?.name ?? "",
    seriesOrder: normalizeOrder(script.seriesOrder),
  } as unknown as EnrichedGalleryScript;
}

// ─── deriveChapterRows ────────────────────────────────────────────────────────

/**
 * Derives sorted SeriesChapterRow[] from raw BaseScriptApi[].
 * Uses deriveSeriesChapterOrder() so order matches the public reader.
 */
export function deriveChapterRows(scripts: BaseScriptApi[]): SeriesChapterRow[] {
  const byId = new Map<string, BaseScriptApi>(scripts.map((s) => [s.id, s]));
  const enriched = scripts.map(toEnrichedLike);
  const sorted = deriveSeriesChapterOrder(enriched);

  return sorted.map((e) => {
    const order = normalizeOrder(e._seriesOrder);
    const original = byId.get(e.id);
    return {
      id: e.id,
      title: String(e.title ?? ""),
      seriesOrder: order,
      status: String(original?.status ?? "private"),
      updatedAt: getSeriesTimestamp(e),
      isPrologue: order === 0,
      isMissingOrder: order === null,
    };
  });
}

// ─── detectOrderConflicts ─────────────────────────────────────────────────────

/**
 * Returns conflicts where two or more chapters share the same seriesOrder.
 * Prologue (order === 0) conflicts are included — authors must resolve them.
 * Missing-order rows (null) are excluded since null is an expected unset state.
 */
export function detectOrderConflicts(rows: SeriesChapterRow[]): SeriesOrderConflict[] {
  const buckets = new Map<number, string[]>();
  for (const row of rows) {
    if (row.seriesOrder === null) continue;
    const existing = buckets.get(row.seriesOrder);
    if (existing) {
      existing.push(row.id);
    } else {
      buckets.set(row.seriesOrder, [row.id]);
    }
  }
  const conflicts: SeriesOrderConflict[] = [];
  for (const [order, ids] of buckets) {
    if (ids.length > 1) conflicts.push({ order, scriptIds: ids });
  }
  return conflicts;
}

// ─── getSeriesReadiness ───────────────────────────────────────────────────────

export function getSeriesReadiness(
  model: Pick<SeriesEditorModel, "name" | "summary" | "coverUrl" | "chapterRows" | "conflicts">
): SeriesReadiness {
  const hasName = Boolean(model.name.trim());
  const hasSummary = Boolean(model.summary.trim());
  const hasCover = Boolean(model.coverUrl.trim());
  const hasChapters = model.chapterRows.length > 0;
  const hasMissingOrders = model.chapterRows.some((r) => r.isMissingOrder);
  const hasConflicts = model.conflicts.length > 0;

  return {
    hasName,
    hasSummary,
    hasCover,
    hasChapters,
    hasMissingOrders,
    hasConflicts,
    isReady: hasName && hasSummary && hasCover && hasChapters && !hasMissingOrders && !hasConflicts,
  };
}

// ─── buildSeriesEditorModel ───────────────────────────────────────────────────

export interface BuildSeriesEditorModelInput {
  seriesId: string;
  name: string;
  summary?: string | null;
  coverUrl?: string | null;
  scripts: BaseScriptApi[];
}

export function buildSeriesEditorModel(input: BuildSeriesEditorModelInput): SeriesEditorModel {
  const chapterRows = deriveChapterRows(input.scripts);
  const conflicts = detectOrderConflicts(chapterRows);
  const partial = {
    name: input.name,
    summary: input.summary ?? "",
    coverUrl: input.coverUrl ?? "",
    chapterRows,
    conflicts,
  };
  return {
    seriesId: input.seriesId,
    ...partial,
    readiness: getSeriesReadiness(partial),
  };
}

// ─── Mutation builders ────────────────────────────────────────────────────────

export interface AttachScriptUpdate {
  seriesId: string;
  seriesOrder: number | null;
}

export interface DetachScriptUpdate {
  seriesId: null;
  seriesOrder: null;
}

export interface ReorderScriptUpdate {
  seriesOrder: number | null;
}

export function buildAttachScriptUpdate(
  seriesId: string,
  order: number | null
): AttachScriptUpdate {
  return { seriesId, seriesOrder: order };
}

export function buildDetachScriptUpdate(): DetachScriptUpdate {
  return { seriesId: null, seriesOrder: null };
}

export function buildReorderScriptUpdate(order: number | null): ReorderScriptUpdate {
  return { seriesOrder: order };
}

// ─── Order input validation ───────────────────────────────────────────────────

export type EditableOrderResult =
  | { valid: true; order: number | null }
  | { valid: false; error: string };

/**
 * Validates a raw string from a series order input field.
 * - Empty string → valid, order: null (unset).
 * - Non-integer or non-finite → invalid with error message.
 * - Negative integer → invalid.
 * - Valid non-negative integer → valid, order: that number.
 */
export function normalizeEditableSeriesOrder(raw: string): EditableOrderResult {
  const trimmed = raw.trim();
  if (trimmed === "") return { valid: true, order: null };
  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { valid: false, error: "請輸入整數" };
  }
  if (n < 0) {
    return { valid: false, error: "順序不可為負數" };
  }
  return { valid: true, order: n };
}
