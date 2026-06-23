import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  migrateAppearancePreferences,
  readAppearancePreferences,
  writeAppearancePreferences,
  DEFAULT_APPEARANCE,
  APPEARANCE_STORAGE_KEY,
  APPEARANCE_CHANGE_EVENT,
} from "./publicAppearancePreferences";

const OLD_THEME_KEY = "screenplay-reader-theme";
const OLD_READER_PREFS_KEY = "public-reader:reader:preferences";

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

describe("migrateAppearancePreferences", () => {
  it("no old keys → returns empty, writes nothing", () => {
    const result = migrateAppearancePreferences();
    expect(result).toEqual({});
    expect(localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBeNull();
  });

  it("migrates old theme key", () => {
    store(OLD_THEME_KEY, "dark");
    const result = migrateAppearancePreferences();
    expect(result.theme).toBe("dark");
    expect(JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY)!).theme).toBe("dark");
  });

  it("migrates reader preferences (fontFamily, fontSize, lineHeight)", () => {
    store(OLD_READER_PREFS_KEY, { fontFamily: "serif", fontSize: 18, lineHeight: 2.0 });
    const result = migrateAppearancePreferences();
    expect(result.readerFontFamily).toBe("serif");
    expect(result.readerFontSize).toBe(18);
    expect(result.readerLineHeight).toBe(2.0);
  });

  it("old reader prefs theme wins over old theme key", () => {
    store(OLD_THEME_KEY, "light");
    store(OLD_READER_PREFS_KEY, { theme: "dark" });
    const result = migrateAppearancePreferences();
    expect(result.theme).toBe("dark");
  });

  it("does not overwrite existing new key", () => {
    store(APPEARANCE_STORAGE_KEY, { ...DEFAULT_APPEARANCE, theme: "light" });
    store(OLD_THEME_KEY, "dark");
    const result = migrateAppearancePreferences();
    // new key already present → skip migration, trust existing
    expect(result.theme).toBe("light");
    expect(JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY)!).theme).toBe("light");
  });

  it("ignores invalid values in old reader prefs", () => {
    store(OLD_READER_PREFS_KEY, { theme: "neon", fontFamily: "wingdings" });
    const result = migrateAppearancePreferences();
    expect(result.theme).toBeUndefined();
    expect(result.readerFontFamily).toBeUndefined();
  });

  it("does not write new key when old prefs are all invalid", () => {
    store(OLD_READER_PREFS_KEY, { theme: "neon" });
    migrateAppearancePreferences();
    expect(localStorage.getItem(APPEARANCE_STORAGE_KEY)).toBeNull();
  });
});
