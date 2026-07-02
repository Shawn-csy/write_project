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
export const useReaderPreferences = (
  overrides: ReaderDisplayPreferencesInput = {}
): ReaderDisplayPreferences => {
  const {
    bodyFontSize,
    dialogueFontSize,
    readingFontFamily,
    lineHeight,
    showMarkers,
    showLineUnderline,
    useV2Renderer,
  } = useSettings();

  // Step 1: normalize raw storage values.
  const fromStorage = normalizeReaderDisplayPreferences({
    typography: { readingFontFamily, bodyFontSize, dialogueFontSize, lineHeight },
    guides:     { showLineUnderline },
    markers:    { showMarkers },
    presentation: { enabled: useV2Renderer },
  });

  // Step 2+3: deep-merge overrides then normalize the result.
  return normalizeReaderDisplayPreferences({
    typography: { ...fromStorage.typography, ...overrides.typography },
    guides:     { ...fromStorage.guides,     ...overrides.guides },
    markers:    { ...fromStorage.markers,    ...overrides.markers },
    presentation: { ...fromStorage.presentation, ...overrides.presentation },
  });
};
