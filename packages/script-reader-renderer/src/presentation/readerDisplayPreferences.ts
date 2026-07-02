/**
 * Shared reader display preference model.
 *
 * This is the canonical type for all display preferences consumed by renderer
 * branches. SettingsContext owns persistence and hydration; this file owns
 * semantic defaults and normalization.
 *
 * Preference groups mirror the capability matrix:
 *   typography   — font, size, line height
 *   guides       — reading-aid visual overlays
 *   markers      — marker visibility and suppression
 *   presentation — multi-column layout structure
 */

export interface ReaderDisplayPreferences {
  typography: {
    readingFontFamily: string;
    bodyFontSize: number;
    dialogueFontSize: number;
    lineHeight: number;
  };
  guides: {
    showLineUnderline: boolean;
  };
  markers: {
    showMarkers: boolean;
  };
  presentation: {
    enabled: boolean;
  };
}

export const DEFAULT_READER_DISPLAY_PREFERENCES: ReaderDisplayPreferences = {
  typography: {
    readingFontFamily: "serif",
    bodyFontSize: 14,
    dialogueFontSize: 14,
    lineHeight: 1.4,
  },
  guides: {
    showLineUnderline: false,
  },
  markers: {
    showMarkers: true,
  },
  presentation: {
    enabled: true,
  },
};

/** Clamp a numeric preference to a valid range; fall back to default on invalid input. */
function clampOrDefault(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n >= min && n <= max ? n : fallback;
}

/** Deep-partial form accepted by the normalizer and hook overrides. */
export type ReaderDisplayPreferencesInput = {
  typography?: Partial<ReaderDisplayPreferences["typography"]>;
  guides?: Partial<ReaderDisplayPreferences["guides"]>;
  markers?: Partial<ReaderDisplayPreferences["markers"]>;
  presentation?: Partial<ReaderDisplayPreferences["presentation"]>;
};

/** Normalizes a persisted or partially-supplied object to a full ReaderDisplayPreferences. */
export function normalizeReaderDisplayPreferences(
  partial: ReaderDisplayPreferencesInput | null | undefined
): ReaderDisplayPreferences {
  const d = DEFAULT_READER_DISPLAY_PREFERENCES;
  if (!partial) return d;
  return {
    typography: {
      readingFontFamily:
        typeof partial.typography?.readingFontFamily === "string" && partial.typography.readingFontFamily.trim()
          ? partial.typography.readingFontFamily.trim()
          : d.typography.readingFontFamily,
      bodyFontSize: clampOrDefault(partial.typography?.bodyFontSize, 8, 72, d.typography.bodyFontSize),
      dialogueFontSize: clampOrDefault(partial.typography?.dialogueFontSize, 8, 72, d.typography.dialogueFontSize),
      lineHeight: clampOrDefault(partial.typography?.lineHeight, 0.9, 2.4, d.typography.lineHeight),
    },
    guides: {
      showLineUnderline:
        typeof partial.guides?.showLineUnderline === "boolean"
          ? partial.guides.showLineUnderline
          : d.guides.showLineUnderline,
    },
    markers: {
      showMarkers:
        typeof partial.markers?.showMarkers === "boolean"
          ? partial.markers.showMarkers
          : d.markers.showMarkers,
    },
    presentation: {
      enabled:
        typeof partial.presentation?.enabled === "boolean"
          ? partial.presentation.enabled
          : d.presentation.enabled,
    },
  };
}
