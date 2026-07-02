/**
 * Reader display preferences parity — Phase 5 contract tests.
 *
 * Asserts that the public reader's default appearance preferences are
 * semantically aligned with the shared ReaderDisplayPreferences model
 * used by the Vite editor preview.
 *
 * Field mapping (PublicAppearancePreferences → reader prefs delta → renderer):
 *   readerFontSize   → delta.fontSize → ScriptPresentationRenderer fontSize prop (body + dialogue)
 *   readerLineHeight → delta.lineHeight → typography.lineHeight equivalent
 *   readerFontFamily → delta.fontFamily → typography.readingFontFamily equivalent (enum, not CSS stack)
 *
 * The public reader does not produce a ReaderDisplayPreferences object. It passes
 * flat props to ScriptContentRenderer which calls ScriptPresentationRenderer directly.
 *
 * Known gaps (public reader does not expose these yet):
 *   guides.showLineUnderline  — no UI or storage in public reader
 *   markers.showMarkers       — no UI or storage in public reader
 *   presentation.enabled      — not applicable (public reader always uses ScriptPresentationRenderer)
 *
 * These gaps are intentional for Phase 5. Adding UI for them is Phase 6+.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { DEFAULT_APPEARANCE, APPEARANCE_STORAGE_KEY, VALID_FONT_SIZES, VALID_LINE_HEIGHTS, VALID_FONT_FAMILIES } from "./publicAppearancePreferences";
import { DEFAULT_READER_DISPLAY_PREFERENCES } from "@write/script-reader-renderer";
import { createAppearanceReaderStorage } from "./createAppearanceReaderStorage";

function makeFallback() {
  const store: Record<string, string> = {};
  return { get: (k: string) => store[k] ?? null, set: (k: string, v: string) => { store[k] = v; }, remove: (k: string) => { delete store[k]; } };
}

beforeEach(() => localStorage.clear());

describe("reader display preferences parity (Phase 5)", () => {
  it("default bodyFontSize diverges between models — documented gap", () => {
    // Public reader default (16) is larger than Vite editor default (14).
    // This is a known divergence: public reader targets comfortable reading on
    // a dedicated read page; editor preview targets compact layout.
    // To align, change one default deliberately and update this snapshot.
    expect(DEFAULT_APPEARANCE.readerFontSize).toMatchInlineSnapshot(`16`);
    expect(DEFAULT_READER_DISPLAY_PREFERENCES.typography.bodyFontSize).toMatchInlineSnapshot(`14`);
  });

  it("default lineHeight diverges between models — documented gap", () => {
    // Public reader default lineHeight differs from Vite default — this is
    // a known divergence documented here so it can be addressed deliberately.
    // When they are brought into alignment, update both defaults and remove this comment.
    expect(typeof DEFAULT_APPEARANCE.readerLineHeight).toBe("number");
    expect(typeof DEFAULT_READER_DISPLAY_PREFERENCES.typography.lineHeight).toBe("number");
    // Assert the parity test captures the actual current values so any future
    // change to either default is caught by CI.
    expect(DEFAULT_APPEARANCE.readerLineHeight).toMatchInlineSnapshot(`1.8`);
    expect(DEFAULT_READER_DISPLAY_PREFERENCES.typography.lineHeight).toMatchInlineSnapshot(`1.4`);
  });

  it("public reader font size set is a subset of valid range in shared model (8–72)", () => {
    for (const size of VALID_FONT_SIZES) {
      expect(size).toBeGreaterThanOrEqual(8);
      expect(size).toBeLessThanOrEqual(72);
    }
  });

  it("public reader line height set is within shared model valid range (0.9–2.4)", () => {
    for (const lh of VALID_LINE_HEIGHTS) {
      expect(lh).toBeGreaterThanOrEqual(0.9);
      expect(lh).toBeLessThanOrEqual(2.4);
    }
  });

  it("public reader font families are a subset of shared model reading font families", () => {
    // Shared model accepts any non-empty string (readingFontFamily is string, not enum).
    // Public reader restricts to ["sans", "serif", "mono"] — valid subset.
    const sharedDefault = DEFAULT_READER_DISPLAY_PREFERENCES.typography.readingFontFamily;
    expect(typeof sharedDefault).toBe("string");
    expect(VALID_FONT_FAMILIES.has("sans")).toBe(true);
    expect(VALID_FONT_FAMILIES.has("serif")).toBe(true);
    expect(VALID_FONT_FAMILIES.has("mono")).toBe(true);
  });

  it("adapter maps readerFontSize → delta.fontSize in reader prefs protocol", () => {
    // createAppearanceReaderStorage bridges PublicAppearancePreferences to the
    // reader prefs storage protocol used by useReaderState. The public reader has
    // one font size (readerFontSize) that the adapter emits as delta.fontSize.
    // ScriptPresentationRenderer receives this as a single `fontSize` prop and
    // applies it to both body and dialogue — there is no separate dialogueFontSize
    // in the public reader path.
    // If a separate dialogueFontSize is ever added to the public reader,
    // update createAppearanceReaderStorage and this test together.
    localStorage.setItem(
      APPEARANCE_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_APPEARANCE, readerFontSize: 20 }),
    );
    const adapter = createAppearanceReaderStorage(makeFallback());
    const delta = JSON.parse(adapter.get("reader:preferences")!) as Record<string, unknown>;
    expect(delta.fontSize).toBe(20);
    expect("dialogueFontSize" in delta).toBe(false);
  });

  it("showLineUnderline is absent from PublicAppearancePreferences (documented gap)", () => {
    expect("showLineUnderline" in DEFAULT_APPEARANCE).toBe(false);
  });

  it("showMarkers is absent from PublicAppearancePreferences (documented gap)", () => {
    expect("showMarkers" in DEFAULT_APPEARANCE).toBe(false);
  });
});
