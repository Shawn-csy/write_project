/**
 * seriesProgress.ts — pure model for local reading progress.
 * No React, no localStorage access. Use this from a hook that handles I/O.
 *
 * Phase 5 of docs/archive/public-series-aggregation-plan.md
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LocalSeriesProgress {
  /** Normalized lowercase series key (matches PublicSeriesGroup.key). */
  seriesKey: string;
  /** id of the last script the visitor opened in this series. */
  lastReadScriptId: string;
  /** ISO timestamp of when the visitor last read in this series. */
  lastReadAt: string;
  /**
   * id of the latest script the visitor has been shown (seen as the series
   * latestScript). Used to detect new chapters added after the visitor's last visit.
   */
  latestSeenScriptId?: string;
  /**
   * updatedAt of the latestScript at the time the visitor last visited.
   * Used as a secondary staleness check when the same script gets updated.
   */
  latestSeenUpdatedAt?: string;
}

// ─── deriveNewChapterHint ─────────────────────────────────────────────────────

export interface NewChapterHintInput {
  /** id of the current latestScript in the series (from PublicSeriesGroup). */
  latestScriptId: string;
  /** updatedAt of the current latestScript (ISO string or ms epoch or null). */
  latestScriptUpdatedAt: number | string | null;
  /** Stored progress for this series, or null when no prior visit recorded. */
  progress: LocalSeriesProgress | null;
}

/**
 * Returns true when there is a new chapter (or updated chapter) the visitor
 * has not yet been shown.
 *
 * Rules:
 * 1. No stored progress → no hint (visitor hasn't been here before).
 * 2. latestScriptId differs from latestSeenScriptId → new chapter added.
 * 3. Same latestScriptId, but latestScriptUpdatedAt is newer than
 *    latestSeenUpdatedAt → chapter was updated.
 */
export function deriveNewChapterHint(input: NewChapterHintInput): boolean {
  const { latestScriptId, latestScriptUpdatedAt, progress } = input;
  if (!progress) return false;
  if (!progress.latestSeenScriptId) return false;

  if (latestScriptId !== progress.latestSeenScriptId) return true;

  // Same script — check if it has been updated since the visitor last saw it
  if (progress.latestSeenUpdatedAt && latestScriptUpdatedAt != null) {
    const seenTs = Date.parse(progress.latestSeenUpdatedAt);
    const currentTs =
      typeof latestScriptUpdatedAt === "number"
        ? latestScriptUpdatedAt
        : Date.parse(String(latestScriptUpdatedAt));
    if (Number.isFinite(seenTs) && Number.isFinite(currentTs) && currentTs > seenTs) {
      return true;
    }
  }

  return false;
}

// ─── buildProgressUpdate ──────────────────────────────────────────────────────

export interface BuildProgressUpdateInput {
  seriesKey: string;
  currentScriptId: string;
  latestScriptId: string;
  latestScriptUpdatedAt: number | string | null;
}

/**
 * Builds the LocalSeriesProgress to write to storage when a visitor opens a
 * chapter. Records current read position and marks the current latestScript
 * as seen (clearing any new-chapter hint).
 */
export function buildProgressUpdate(
  input: BuildProgressUpdateInput
): LocalSeriesProgress {
  const { seriesKey, currentScriptId, latestScriptId, latestScriptUpdatedAt } = input;
  const latestSeenUpdatedAt =
    latestScriptUpdatedAt != null ? String(latestScriptUpdatedAt) : undefined;
  return {
    seriesKey,
    lastReadScriptId: currentScriptId,
    lastReadAt: new Date().toISOString(),
    latestSeenScriptId: latestScriptId,
    latestSeenUpdatedAt,
  };
}
