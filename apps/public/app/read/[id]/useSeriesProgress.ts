"use client";

import { useEffect, useState, useCallback } from "react";
import {
  deriveNewChapterHint,
  buildProgressUpdate,
} from "@write/public-ui";
import type { LocalSeriesProgress } from "@write/public-ui";
import type { ChapterNavModel } from "./useSeriesChapterNav";

const STORAGE_KEY_PREFIX = "series-progress:";

function readProgress(seriesKey: string): LocalSeriesProgress | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PREFIX + seriesKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Minimal shape check — discard corrupted entries
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.seriesKey !== "string" ||
      typeof parsed.lastReadScriptId !== "string"
    ) {
      return null;
    }
    return parsed as LocalSeriesProgress;
  } catch {
    return null;
  }
}

function writeProgress(progress: LocalSeriesProgress): void {
  try {
    localStorage.setItem(STORAGE_KEY_PREFIX + progress.seriesKey, JSON.stringify(progress));
  } catch {
    // localStorage unavailable (private mode, storage full) — silent fail
  }
}

export interface SeriesProgressState {
  /**
   * True when the series has a new/updated chapter the visitor hasn't seen.
   * Reflects the state at mount time — stays true for the duration of the visit
   * so the badge is visible. Cleared on the *next* visit after markSeen() runs.
   */
  hasNewChapter: boolean;
  /**
   * Write current progress to localStorage (last-read position + latest seen).
   * Does NOT clear hasNewChapter — the badge stays for this visit.
   * On next visit, stored progress will match and hint will be false.
   */
  markSeen: () => void;
}

/**
 * Tracks per-series reading progress in localStorage.
 *
 * On mount: reads stored progress, derives newChapter hint (initial value only).
 * markSeen(): writes progress so the hint is false on the *next* visit.
 * The badge remains visible for the current visit even after markSeen().
 */
export function useSeriesProgress(
  currentScriptId: string,
  seriesNav: ChapterNavModel | null
): SeriesProgressState {
  const [hasNewChapter, setHasNewChapter] = useState(false);

  const seriesKey = seriesNav ? seriesNav.seriesName.toLowerCase() : null;
  // latestScript id: current script when isLatest, otherwise the latestChapter
  const latestScriptId = seriesNav?.isLatest
    ? currentScriptId
    : (seriesNav?.latestChapter?.id ?? null);
  const latestScriptUpdatedAt = seriesNav?.latestScriptUpdatedAt ?? null;

  useEffect(() => {
    if (!seriesKey || !latestScriptId) {
      setHasNewChapter(false);
      return;
    }
    const progress = readProgress(seriesKey);
    const hint = deriveNewChapterHint({
      latestScriptId,
      latestScriptUpdatedAt,
      progress,
    });
    setHasNewChapter(hint);
  }, [seriesKey, latestScriptId, latestScriptUpdatedAt]);

  const markSeen = useCallback(() => {
    if (!seriesKey || !latestScriptId) return;
    const update = buildProgressUpdate({
      seriesKey,
      currentScriptId,
      latestScriptId,
      latestScriptUpdatedAt,
    });
    writeProgress(update);
    // Do NOT setHasNewChapter(false) here — badge stays visible for this visit.
    // Next visit will read updated progress and derive hint=false.
  }, [seriesKey, currentScriptId, latestScriptId, latestScriptUpdatedAt]);

  return { hasNewChapter, markSeen };
}
