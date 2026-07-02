import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { DEFAULT_READER_DISPLAY_PREFERENCES } from "@write/script-reader-renderer";

// Mock useSettings — simulates SettingsContext storage values
const mockSettings = {
  bodyFontSize: 14,
  dialogueFontSize: 14,
  readingFontFamily: "serif",
  lineHeight: 1.4,
  showMarkers: true,
  showLineUnderline: false,
  useV2Renderer: true,
};

vi.mock("../contexts/SettingsContext", () => ({
  useSettings: () => mockSettings,
}));

import { useReaderPreferences } from "./useReaderPreferences";

describe("useReaderPreferences", () => {
  beforeEach(() => {
    // Reset to defaults before each test
    Object.assign(mockSettings, {
      bodyFontSize: 14,
      dialogueFontSize: 14,
      readingFontFamily: "serif",
      lineHeight: 1.4,
      showMarkers: true,
      showLineUnderline: false,
      useV2Renderer: true,
    });
  });

  it("returns nested ReaderDisplayPreferences matching defaults from settings", () => {
    const { result } = renderHook(() => useReaderPreferences());
    expect(result.current).toEqual({
      ...DEFAULT_READER_DISPLAY_PREFERENCES,
      presentation: { enabled: true }, // useV2Renderer=true
    });
  });

  it("maps storage fields to nested groups", () => {
    mockSettings.bodyFontSize = 18;
    mockSettings.dialogueFontSize = 16;
    mockSettings.lineHeight = 1.8;
    mockSettings.readingFontFamily = "sans-serif";
    mockSettings.showLineUnderline = true;
    mockSettings.showMarkers = false;

    const { result } = renderHook(() => useReaderPreferences());
    expect(result.current.typography.bodyFontSize).toBe(18);
    expect(result.current.typography.dialogueFontSize).toBe(16);
    expect(result.current.typography.lineHeight).toBe(1.8);
    expect(result.current.typography.readingFontFamily).toBe("sans-serif");
    expect(result.current.guides.showLineUnderline).toBe(true);
    expect(result.current.markers.showMarkers).toBe(false);
  });

  it("override typography fields take precedence over stored values", () => {
    mockSettings.bodyFontSize = 14;
    const { result } = renderHook(() =>
      useReaderPreferences({ typography: { bodyFontSize: 24, lineHeight: 2.0 } })
    );
    expect(result.current.typography.bodyFontSize).toBe(24);
    expect(result.current.typography.lineHeight).toBe(2.0);
    // unoverridden fields still come from storage
    expect(result.current.typography.readingFontFamily).toBe("serif");
  });

  it("normalizes invalid override values — same rules as storage", () => {
    const { result } = renderHook(() =>
      useReaderPreferences({ typography: { bodyFontSize: 999, lineHeight: 0 } })
    );
    expect(result.current.typography.bodyFontSize).toBe(14);  // clamped to default
    expect(result.current.typography.lineHeight).toBe(1.4);    // clamped to default
  });

  it("override guides.showLineUnderline takes precedence", () => {
    mockSettings.showLineUnderline = false;
    const { result } = renderHook(() =>
      useReaderPreferences({ guides: { showLineUnderline: true } })
    );
    expect(result.current.guides.showLineUnderline).toBe(true);
  });

  it("override markers.showMarkers takes precedence", () => {
    mockSettings.showMarkers = true;
    const { result } = renderHook(() =>
      useReaderPreferences({ markers: { showMarkers: false } })
    );
    expect(result.current.markers.showMarkers).toBe(false);
  });

  it("normalizes invalid storage values before passing to renderers", () => {
    // Simulates corrupted localStorage or bad remote hydration
    mockSettings.bodyFontSize = 999;      // out of range → clamp to default
    mockSettings.lineHeight = 0;          // out of range → clamp to default
    mockSettings.readingFontFamily = "";  // empty → fall back to default

    const { result } = renderHook(() => useReaderPreferences());
    expect(result.current.typography.bodyFontSize).toBe(14);    // normalized to default
    expect(result.current.typography.lineHeight).toBe(1.4);     // normalized to default
    expect(result.current.typography.readingFontFamily).toBe("serif"); // normalized to default
  });

  it("remote settings hydration: updated storage values are reflected", () => {
    // Simulate remote hydration updating stored values
    mockSettings.bodyFontSize = 20;
    mockSettings.showLineUnderline = true;
    mockSettings.readingFontFamily = "monospace";

    const { result } = renderHook(() => useReaderPreferences());
    expect(result.current.typography.bodyFontSize).toBe(20);
    expect(result.current.guides.showLineUnderline).toBe(true);
    expect(result.current.typography.readingFontFamily).toBe("monospace");
  });
});
