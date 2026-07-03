import { useMemo } from "react";
import { useSettings } from "../contexts/SettingsContext";
import {
  normalizeReaderDisplayPreferences,
  type ReaderDisplayPreferences,
  type ReaderDisplayPreferencesInput,
} from "@write/script-reader-renderer";

/**
 * Returns validated reader display preferences assembled from SettingsContext.
 *
 * Flow:
 *   1. Normalize raw storage values (clamp/validate via normalizeReaderDisplayPreferences).
 *   2. Merge caller overrides on top (deep merge at group level).
 *   3. Normalize the merged result — ensures invalid overrides (e.g. bodyFontSize: 999
 *      from a parent prop) are caught by the same rules as storage values.
 *
 * SettingsContext remains the storage/orchestration layer.
 */
const EMPTY_OVERRIDES: ReaderDisplayPreferencesInput = {};

export const useReaderPreferences = (
  overrides: ReaderDisplayPreferencesInput = EMPTY_OVERRIDES
): ReaderDisplayPreferences => {
  const {
    bodyFontSize,
    dialogueFontSize,
    readingFontFamily,
    lineHeight,
    showMarkers,
    showLineUnderline,
    usePresentationRenderer,
  } = useSettings();

  // Memoized so consumers get a stable object identity when nothing changed
  // (keeps React.memo / useMemo chains downstream intact). Callers passing
  // overrides must provide a stable (memoized) object.
  return useMemo(() => {
    // Step 1: normalize raw storage values.
    const fromStorage = normalizeReaderDisplayPreferences({
      typography: { readingFontFamily, bodyFontSize, dialogueFontSize, lineHeight },
      guides:     { showLineUnderline },
      markers:    { showMarkers },
      presentation: { enabled: usePresentationRenderer },
    });

    // Step 2+3: deep-merge overrides then normalize the result.
    return normalizeReaderDisplayPreferences({
      typography: { ...fromStorage.typography, ...overrides.typography },
      guides:     { ...fromStorage.guides,     ...overrides.guides },
      markers:    { ...fromStorage.markers,    ...overrides.markers },
      presentation: { ...fromStorage.presentation, ...overrides.presentation },
    });
  }, [
    bodyFontSize, dialogueFontSize, readingFontFamily, lineHeight,
    showMarkers, showLineUnderline, usePresentationRenderer, overrides,
  ]);
};
