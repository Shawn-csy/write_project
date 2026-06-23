import { describe, it, expect, beforeEach } from "vitest";
import { createAppearanceReaderStorage } from "./createAppearanceReaderStorage";
import { APPEARANCE_STORAGE_KEY, DEFAULT_APPEARANCE } from "./publicAppearancePreferences";

// Minimal in-memory fallback adapter
function makeFallback() {
  const store: Record<string, string> = {};
  return {
    store,
    get: (k: string) => store[k] ?? null,
    set: (k: string, v: string) => { store[k] = v; },
    remove: (k: string) => { delete store[k]; },
  };
}

beforeEach(() => localStorage.clear());

describe("createAppearanceReaderStorage", () => {
  it("non-preference keys fall through to fallback", () => {
    const fallback = makeFallback();
    fallback.store["reader:hiddenMarkerIds"] = "[\"x\"]";
    const adapter = createAppearanceReaderStorage(fallback);
    expect(adapter.get("reader:hiddenMarkerIds")).toBe("[\"x\"]");
  });

  it("get reader:preferences returns null when appearance prefs not set", () => {
    const adapter = createAppearanceReaderStorage(makeFallback());
    expect(adapter.get("reader:preferences")).toBeNull();
  });

  it("get reader:preferences maps readerFontFamily → fontFamily", () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify({ ...DEFAULT_APPEARANCE, readerFontFamily: "serif" }));
    const adapter = createAppearanceReaderStorage(makeFallback());
    const delta = JSON.parse(adapter.get("reader:preferences")!);
    expect(delta.fontFamily).toBe("serif");
  });

  it("get reader:preferences maps readerFontSize → fontSize", () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify({ ...DEFAULT_APPEARANCE, readerFontSize: 20 }));
    const adapter = createAppearanceReaderStorage(makeFallback());
    const delta = JSON.parse(adapter.get("reader:preferences")!);
    expect(delta.fontSize).toBe(20);
  });

  it("get reader:preferences maps readerLineHeight → lineHeight", () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify({ ...DEFAULT_APPEARANCE, readerLineHeight: 2.0 }));
    const adapter = createAppearanceReaderStorage(makeFallback());
    const delta = JSON.parse(adapter.get("reader:preferences")!);
    expect(delta.lineHeight).toBe(2.0);
  });

  it("set reader:preferences maps fontFamily → readerFontFamily in appearance store", () => {
    const adapter = createAppearanceReaderStorage(makeFallback());
    adapter.set("reader:preferences", JSON.stringify({ fontFamily: "mono" }));
    const stored = JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY)!);
    expect(stored.readerFontFamily).toBe("mono");
  });

  it("set reader:preferences maps fontSize → readerFontSize", () => {
    const adapter = createAppearanceReaderStorage(makeFallback());
    adapter.set("reader:preferences", JSON.stringify({ fontSize: 18 }));
    const stored = JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY)!);
    expect(stored.readerFontSize).toBe(18);
  });

  it("set reader:preferences preserves existing appearance fields (theme)", () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify({ ...DEFAULT_APPEARANCE, theme: "dark" }));
    const adapter = createAppearanceReaderStorage(makeFallback());
    adapter.set("reader:preferences", JSON.stringify({ fontFamily: "serif" }));
    const stored = JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY)!);
    expect(stored.theme).toBe("dark");
    expect(stored.readerFontFamily).toBe("serif");
  });

  it("remove reader:preferences resets reader display fields to defaults", () => {
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify({ ...DEFAULT_APPEARANCE, readerFontFamily: "mono", readerFontSize: 20, theme: "dark" }));
    const adapter = createAppearanceReaderStorage(makeFallback());
    adapter.remove("reader:preferences");
    const stored = JSON.parse(localStorage.getItem(APPEARANCE_STORAGE_KEY)!);
    expect(stored.readerFontFamily).toBe(DEFAULT_APPEARANCE.readerFontFamily);
    expect(stored.readerFontSize).toBe(DEFAULT_APPEARANCE.readerFontSize);
    // theme unaffected by reader prefs reset
    expect(stored.theme).toBe("dark");
  });

  it("set with malformed JSON does not throw", () => {
    const adapter = createAppearanceReaderStorage(makeFallback());
    expect(() => adapter.set("reader:preferences", "not-json")).not.toThrow();
  });

  it("set ignores invalid fontFamily value", () => {
    const adapter = createAppearanceReaderStorage(makeFallback());
    adapter.set("reader:preferences", JSON.stringify({ fontFamily: "wingdings" }));
    const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    // stored should have default fontFamily, not "wingdings"
    expect(JSON.parse(stored!).readerFontFamily).toBe(DEFAULT_APPEARANCE.readerFontFamily);
  });

  it("set ignores invalid fontSize value", () => {
    const adapter = createAppearanceReaderStorage(makeFallback());
    adapter.set("reader:preferences", JSON.stringify({ fontSize: 999 }));
    const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    expect(JSON.parse(stored!).readerFontSize).toBe(DEFAULT_APPEARANCE.readerFontSize);
  });

  it("set ignores invalid lineHeight value", () => {
    const adapter = createAppearanceReaderStorage(makeFallback());
    adapter.set("reader:preferences", JSON.stringify({ lineHeight: 99 }));
    const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    expect(JSON.parse(stored!).readerLineHeight).toBe(DEFAULT_APPEARANCE.readerLineHeight);
  });
});
