import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  readAppearancePreferences,
  writeAppearancePreferences,
  DEFAULT_APPEARANCE,
  APPEARANCE_STORAGE_KEY,
  APPEARANCE_CHANGE_EVENT,
  VALID_SITE_TEXT_SCALES,
} from "./publicAppearancePreferences";

function store(key: string, value: unknown) {
  localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
}

beforeEach(() => localStorage.clear());

describe("readAppearancePreferences", () => {
  it("returns empty object when nothing stored", () => {
    expect(readAppearancePreferences()).toEqual({});
  });

  it("returns valid stored fields", () => {
    store(APPEARANCE_STORAGE_KEY, { theme: "dark", readerFontFamily: "serif" });
    const prefs = readAppearancePreferences();
    expect(prefs.theme).toBe("dark");
    expect(prefs.readerFontFamily).toBe("serif");
  });

  it("reads valid siteTextScale", () => {
    store(APPEARANCE_STORAGE_KEY, { siteTextScale: "comfortable" });
    expect(readAppearancePreferences().siteTextScale).toBe("comfortable");
  });

  it("ignores invalid siteTextScale", () => {
    store(APPEARANCE_STORAGE_KEY, { siteTextScale: "huge" });
    expect(readAppearancePreferences().siteTextScale).toBeUndefined();
  });

  it("ignores invalid theme value", () => {
    store(APPEARANCE_STORAGE_KEY, { theme: "neon" });
    expect(readAppearancePreferences().theme).toBeUndefined();
  });

  it("ignores invalid fontFamily", () => {
    store(APPEARANCE_STORAGE_KEY, { readerFontFamily: "comic-sans" });
    expect(readAppearancePreferences().readerFontFamily).toBeUndefined();
  });

  it("ignores negative fontSize", () => {
    store(APPEARANCE_STORAGE_KEY, { readerFontSize: -1 });
    expect(readAppearancePreferences().readerFontSize).toBeUndefined();
  });
});

describe("VALID_SITE_TEXT_SCALES", () => {
  it("contains all four scale values", () => {
    expect(VALID_SITE_TEXT_SCALES.has("compact")).toBe(true);
    expect(VALID_SITE_TEXT_SCALES.has("default")).toBe(true);
    expect(VALID_SITE_TEXT_SCALES.has("comfortable")).toBe(true);
    expect(VALID_SITE_TEXT_SCALES.has("large")).toBe(true);
  });

  it("DEFAULT_APPEARANCE.siteTextScale is 'default'", () => {
    expect(DEFAULT_APPEARANCE.siteTextScale).toBe("default");
  });
});

describe("writeAppearancePreferences", () => {
  it("persists to new key", () => {
    writeAppearancePreferences({ ...DEFAULT_APPEARANCE, theme: "light" });
    const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    expect(JSON.parse(raw!).theme).toBe("light");
  });

  it("dispatches APPEARANCE_CHANGE_EVENT with prefs as detail", () => {
    const listener = vi.fn();
    window.addEventListener(APPEARANCE_CHANGE_EVENT, listener);
    const prefs = { ...DEFAULT_APPEARANCE, theme: "dark" as const };
    writeAppearancePreferences(prefs);
    window.removeEventListener(APPEARANCE_CHANGE_EVENT, listener);
    expect(listener).toHaveBeenCalledOnce();
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toMatchObject({ theme: "dark" });
  });
});
