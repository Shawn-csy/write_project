import { describe, it, expect } from "vitest";
import {
  DEFAULT_READER_DISPLAY_PREFERENCES,
  normalizeReaderDisplayPreferences,
} from "./readerDisplayPreferences";

describe("DEFAULT_READER_DISPLAY_PREFERENCES", () => {
  it("has expected default values", () => {
    expect(DEFAULT_READER_DISPLAY_PREFERENCES.typography.readingFontFamily).toBe("serif");
    expect(DEFAULT_READER_DISPLAY_PREFERENCES.typography.bodyFontSize).toBe(14);
    expect(DEFAULT_READER_DISPLAY_PREFERENCES.typography.dialogueFontSize).toBe(14);
    expect(DEFAULT_READER_DISPLAY_PREFERENCES.typography.lineHeight).toBe(1.4);
    expect(DEFAULT_READER_DISPLAY_PREFERENCES.guides.showLineUnderline).toBe(false);
    expect(DEFAULT_READER_DISPLAY_PREFERENCES.markers.showMarkers).toBe(true);
    expect(DEFAULT_READER_DISPLAY_PREFERENCES.presentation.enabled).toBe(true);
  });
});

describe("normalizeReaderDisplayPreferences", () => {
  it("returns defaults for null/undefined", () => {
    expect(normalizeReaderDisplayPreferences(null)).toEqual(DEFAULT_READER_DISPLAY_PREFERENCES);
    expect(normalizeReaderDisplayPreferences(undefined)).toEqual(DEFAULT_READER_DISPLAY_PREFERENCES);
  });

  it("returns defaults for empty object", () => {
    expect(normalizeReaderDisplayPreferences({})).toEqual(DEFAULT_READER_DISPLAY_PREFERENCES);
  });

  it("passes through valid persisted values", () => {
    const result = normalizeReaderDisplayPreferences({
      typography: { readingFontFamily: "sans-serif", bodyFontSize: 18, dialogueFontSize: 16, lineHeight: 1.8 },
      guides: { showLineUnderline: true },
      markers: { showMarkers: false },
      presentation: { enabled: false },
    });
    expect(result.typography.readingFontFamily).toBe("sans-serif");
    expect(result.typography.bodyFontSize).toBe(18);
    expect(result.typography.dialogueFontSize).toBe(16);
    expect(result.typography.lineHeight).toBe(1.8);
    expect(result.guides.showLineUnderline).toBe(true);
    expect(result.markers.showMarkers).toBe(false);
    expect(result.presentation.enabled).toBe(false);
  });

  it("clamps bodyFontSize to [8, 72]", () => {
    expect(normalizeReaderDisplayPreferences({ typography: { bodyFontSize: 0 } }).typography.bodyFontSize).toBe(14);
    expect(normalizeReaderDisplayPreferences({ typography: { bodyFontSize: 100 } }).typography.bodyFontSize).toBe(14);
    expect(normalizeReaderDisplayPreferences({ typography: { bodyFontSize: 8 } }).typography.bodyFontSize).toBe(8);
    expect(normalizeReaderDisplayPreferences({ typography: { bodyFontSize: 72 } }).typography.bodyFontSize).toBe(72);
  });

  it("clamps lineHeight to [0.9, 2.4]", () => {
    expect(normalizeReaderDisplayPreferences({ typography: { lineHeight: 0 } }).typography.lineHeight).toBe(1.4);
    expect(normalizeReaderDisplayPreferences({ typography: { lineHeight: 5 } }).typography.lineHeight).toBe(1.4);
    expect(normalizeReaderDisplayPreferences({ typography: { lineHeight: 0.9 } }).typography.lineHeight).toBe(0.9);
    expect(normalizeReaderDisplayPreferences({ typography: { lineHeight: 2.4 } }).typography.lineHeight).toBe(2.4);
  });

  it("falls back to default readingFontFamily for empty/whitespace string", () => {
    expect(normalizeReaderDisplayPreferences({ typography: { readingFontFamily: "" } }).typography.readingFontFamily).toBe("serif");
    expect(normalizeReaderDisplayPreferences({ typography: { readingFontFamily: "  " } }).typography.readingFontFamily).toBe("serif");
  });

  it("falls back on NaN font sizes", () => {
    expect(normalizeReaderDisplayPreferences({ typography: { bodyFontSize: NaN } }).typography.bodyFontSize).toBe(14);
    expect(normalizeReaderDisplayPreferences({ typography: { dialogueFontSize: NaN } }).typography.dialogueFontSize).toBe(14);
  });

  it("preserves partial group override while filling missing fields from defaults", () => {
    // Only bodyFontSize overridden; others fall back to defaults
    const result = normalizeReaderDisplayPreferences({ typography: { bodyFontSize: 20 } });
    expect(result.typography.bodyFontSize).toBe(20);
    expect(result.typography.readingFontFamily).toBe("serif");
    expect(result.typography.dialogueFontSize).toBe(14);
    expect(result.typography.lineHeight).toBe(1.4);
    // Other groups untouched
    expect(result.guides).toEqual(DEFAULT_READER_DISPLAY_PREFERENCES.guides);
    expect(result.markers).toEqual(DEFAULT_READER_DISPLAY_PREFERENCES.markers);
  });
});
