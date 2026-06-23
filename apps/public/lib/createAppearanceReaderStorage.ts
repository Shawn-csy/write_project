/**
 * createAppearanceReaderStorage — ReaderStorageAdapter that reads and writes
 * reader display preferences (fontFamily, fontSize, lineHeight) via the shared
 * publicAppearancePreferences model instead of a separate per-site storage key.
 *
 * Only handles the "reader:preferences" key (the key useReaderState uses for
 * preferences). Other keys fall through to the fallback adapter.
 */

import type { ReaderStorageAdapter } from "@write/script-reader-ui";
import {
  readAppearancePreferences,
  writeAppearancePreferences,
  migrateAppearancePreferences,
  DEFAULT_APPEARANCE,
  VALID_FONT_FAMILIES,
  VALID_FONT_SIZES,
  VALID_LINE_HEIGHTS,
} from "./publicAppearancePreferences";

const PREFS_KEY = "reader:preferences";

/**
 * Returns a ReaderStorageAdapter that bridges useReaderState's preferences
 * storage protocol to the publicAppearancePreferences model.
 *
 * Pass as `preferencesStorage` to useReaderState. Pass the original
 * globalStorage as `fallback` for all other keys (marker visibility etc.).
 */
export function createAppearanceReaderStorage(
  fallback: ReaderStorageAdapter,
): ReaderStorageAdapter {
  return {
    get(key: string): string | null {
      if (key !== PREFS_KEY) return fallback.get(key);
      // Run migration once on first read (safe — no-op if already migrated).
      migrateAppearancePreferences();
      const prefs = readAppearancePreferences();
      // Map appearance prefs fields → reader prefs shape
      // Only include fields that are set (partial delta, matching useReaderState write format)
      const delta: Record<string, unknown> = {};
      if (prefs.readerFontFamily !== undefined) delta.fontFamily = prefs.readerFontFamily;
      if (prefs.readerFontSize !== undefined) delta.fontSize = prefs.readerFontSize;
      if (prefs.readerLineHeight !== undefined) delta.lineHeight = prefs.readerLineHeight;
      return Object.keys(delta).length > 0 ? JSON.stringify(delta) : null;
    },

    set(key: string, value: string): void {
      if (key !== PREFS_KEY) { fallback.set(key, value); return; }
      // Parse reader delta and merge into appearance prefs
      try {
        const delta = JSON.parse(value) as Record<string, unknown>;
        const current = { ...DEFAULT_APPEARANCE, ...readAppearancePreferences() };
        if (typeof delta.fontFamily === "string" && VALID_FONT_FAMILIES.has(delta.fontFamily)) {
          current.readerFontFamily = delta.fontFamily as typeof current.readerFontFamily;
        }
        if (typeof delta.fontSize === "number" && VALID_FONT_SIZES.has(delta.fontSize)) {
          current.readerFontSize = delta.fontSize;
        }
        if (typeof delta.lineHeight === "number" && VALID_LINE_HEIGHTS.has(delta.lineHeight)) {
          current.readerLineHeight = delta.lineHeight;
        }
        writeAppearancePreferences(current);
      } catch {
        // malformed — ignore
      }
    },

    remove(key: string): void {
      if (key !== PREFS_KEY) { fallback.remove(key); return; }
      // Reset reader display fields to defaults in appearance prefs
      const current = { ...DEFAULT_APPEARANCE, ...readAppearancePreferences() };
      writeAppearancePreferences({
        ...current,
        readerFontFamily: DEFAULT_APPEARANCE.readerFontFamily,
        readerFontSize: DEFAULT_APPEARANCE.readerFontSize,
        readerLineHeight: DEFAULT_APPEARANCE.readerLineHeight,
      });
    },
  };
}
