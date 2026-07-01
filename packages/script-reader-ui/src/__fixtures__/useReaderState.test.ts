/**
 * useReaderState tests.
 *
 * Covers:
 *   - markerVisibility delegates: toggle, showAll, hideAll, isHidden, counts
 *   - toc: entries, open, close, toggle, setActiveId
 *   - stale hiddenMarkerIds pruned when markerConfigs shrinks
 *   - storage: persists hiddenMarkerIds on change
 *   - storage: restores hiddenMarkerIds on mount (only valid ids kept)
 *   - storage: removes key when hiddenMarkerIds becomes empty
 *   - storage: unavailable (throws) — silently ignored, no crash
 *   - storage: null — no persistence, no crash
 *   - storage: undefined — no persistence, no crash
 */

import { describe, it, expect } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useReaderState } from "../useReaderState";
import type { ReaderStorageAdapter } from "../useReaderState";
import { DEFAULT_READER_PREFERENCES } from "../readerPreferences";

const CONFIGS = [
  { id: "alpha", label: "Alpha" },
  { id: "beta", label: "Beta" },
];

const TOC = [{ id: "s1", label: "Scene 1" }];

function makeStorage(initial: Record<string, string> = {}): ReaderStorageAdapter & { store: Record<string, string> } {
  const store = { ...initial };
  return {
    store,
    get: (key) => store[key] ?? null,
    set: (key, value) => { store[key] = value; },
    remove: (key) => { delete store[key]; },
  };
}

function throwingStorage(): ReaderStorageAdapter {
  return {
    get: () => { throw new Error("storage unavailable"); },
    set: () => { throw new Error("storage unavailable"); },
    remove: () => { throw new Error("storage unavailable"); },
  };
}

// ---------------------------------------------------------------------------
// markerVisibility
// ---------------------------------------------------------------------------

describe("useReaderState — markerVisibility", () => {
  it("starts all visible", () => {
    const { result } = renderHook(() => useReaderState({ markerConfigs: CONFIGS, toc: TOC }));
    expect(result.current.markerVisibility.visibleCount).toBe(2);
    expect(result.current.markerVisibility.totalCount).toBe(2);
    expect(result.current.markerVisibility.hiddenMarkerIds).toEqual([]);
  });

  it("toggleMarker hides a marker", () => {
    const { result } = renderHook(() => useReaderState({ markerConfigs: CONFIGS, toc: TOC }));
    act(() => { result.current.markerVisibility.toggleMarker("alpha"); });
    expect(result.current.markerVisibility.isHidden("alpha")).toBe(true);
    expect(result.current.markerVisibility.visibleCount).toBe(1);
  });

  it("toggleMarker restores a hidden marker", () => {
    const { result } = renderHook(() => useReaderState({ markerConfigs: CONFIGS, toc: TOC }));
    act(() => { result.current.markerVisibility.toggleMarker("alpha"); });
    act(() => { result.current.markerVisibility.toggleMarker("alpha"); });
    expect(result.current.markerVisibility.isHidden("alpha")).toBe(false);
    expect(result.current.markerVisibility.visibleCount).toBe(2);
  });

  it("hideAll hides everything", () => {
    const { result } = renderHook(() => useReaderState({ markerConfigs: CONFIGS, toc: TOC }));
    act(() => { result.current.markerVisibility.hideAll(); });
    expect(result.current.markerVisibility.visibleCount).toBe(0);
  });

  it("showAll restores everything", () => {
    const { result } = renderHook(() => useReaderState({ markerConfigs: CONFIGS, toc: TOC }));
    act(() => { result.current.markerVisibility.hideAll(); });
    act(() => { result.current.markerVisibility.showAll(); });
    expect(result.current.markerVisibility.visibleCount).toBe(2);
  });

  it("exposes markerConfigs", () => {
    const { result } = renderHook(() => useReaderState({ markerConfigs: CONFIGS, toc: TOC }));
    expect(result.current.markerConfigs).toBe(CONFIGS);
  });
});

// ---------------------------------------------------------------------------
// toc
// ---------------------------------------------------------------------------

describe("useReaderState — toc", () => {
  it("exposes toc entries", () => {
    const { result } = renderHook(() => useReaderState({ markerConfigs: CONFIGS, toc: TOC }));
    expect(result.current.toc.entries).toBe(TOC);
  });

  it("starts closed with no activeId", () => {
    const { result } = renderHook(() => useReaderState({ markerConfigs: CONFIGS, toc: TOC }));
    expect(result.current.toc.isOpen).toBe(false);
    expect(result.current.toc.activeId).toBeNull();
  });

  it("open/close/toggle work", () => {
    const { result } = renderHook(() => useReaderState({ markerConfigs: CONFIGS, toc: TOC }));
    act(() => { result.current.toc.open(); });
    expect(result.current.toc.isOpen).toBe(true);
    act(() => { result.current.toc.toggle(); });
    expect(result.current.toc.isOpen).toBe(false);
    act(() => { result.current.toc.close(); });
    expect(result.current.toc.isOpen).toBe(false);
  });

  it("setActiveId updates activeId", () => {
    const { result } = renderHook(() => useReaderState({ markerConfigs: CONFIGS, toc: TOC }));
    act(() => { result.current.toc.setActiveId("s1"); });
    expect(result.current.toc.activeId).toBe("s1");
    act(() => { result.current.toc.setActiveId(null); });
    expect(result.current.toc.activeId).toBeNull();
  });

  it("activeId pruned when entry removed from toc entries", () => {
    const extendedToc = [
      { id: "s1", label: "Scene 1" },
      { id: "s2", label: "Scene 2" },
    ];
    const { result, rerender } = renderHook(
      ({ toc }) => useReaderState({ markerConfigs: CONFIGS, toc }),
      { initialProps: { toc: extendedToc } }
    );
    act(() => { result.current.toc.setActiveId("s2"); });
    expect(result.current.toc.activeId).toBe("s2");

    rerender({ toc: [{ id: "s1", label: "Scene 1" }] });
    expect(result.current.toc.activeId).toBeNull();
  });

  it("activeId retained when it still exists in updated toc entries", () => {
    const extendedToc = [
      { id: "s1", label: "Scene 1" },
      { id: "s2", label: "Scene 2" },
    ];
    const { result, rerender } = renderHook(
      ({ toc }) => useReaderState({ markerConfigs: CONFIGS, toc }),
      { initialProps: { toc: extendedToc } }
    );
    act(() => { result.current.toc.setActiveId("s1"); });
    rerender({ toc: [{ id: "s1", label: "Scene 1 (updated)" }] });
    expect(result.current.toc.activeId).toBe("s1");
  });
});

// ---------------------------------------------------------------------------
// preferences
// ---------------------------------------------------------------------------

describe("useReaderState — preferences", () => {
  it("starts with defaults", () => {
    const { result } = renderHook(() => useReaderState({ markerConfigs: CONFIGS, toc: TOC }));
    expect(result.current.preferences.preferences).toEqual(DEFAULT_READER_PREFERENCES);
  });

  it("setTheme updates theme", () => {
    const { result } = renderHook(() => useReaderState({ markerConfigs: CONFIGS, toc: TOC }));
    act(() => { result.current.preferences.setTheme("dark"); });
    expect(result.current.preferences.preferences.theme).toBe("dark");
  });

  it("setFontSize updates fontSize", () => {
    const { result } = renderHook(() => useReaderState({ markerConfigs: CONFIGS, toc: TOC }));
    act(() => { result.current.preferences.setFontSize(20); });
    expect(result.current.preferences.preferences.fontSize).toBe(20);
  });

  it("setLineHeight updates lineHeight", () => {
    const { result } = renderHook(() => useReaderState({ markerConfigs: CONFIGS, toc: TOC }));
    act(() => { result.current.preferences.setLineHeight(2.0); });
    expect(result.current.preferences.preferences.lineHeight).toBe(2.0);
  });

  it("setFontFamily updates fontFamily", () => {
    const { result } = renderHook(() => useReaderState({ markerConfigs: CONFIGS, toc: TOC }));
    act(() => { result.current.preferences.setFontFamily("serif"); });
    expect(result.current.preferences.preferences.fontFamily).toBe("serif");
  });

  it("reset restores defaults", () => {
    const { result } = renderHook(() => useReaderState({ markerConfigs: CONFIGS, toc: TOC }));
    act(() => {
      result.current.preferences.setTheme("dark");
      result.current.preferences.setFontSize(24);
    });
    act(() => { result.current.preferences.reset(); });
    expect(result.current.preferences.preferences).toEqual(DEFAULT_READER_PREFERENCES);
  });

  it("persists preferences to storage", async () => {
    const storage = makeStorage();
    const { result } = renderHook(() =>
      useReaderState({ markerConfigs: CONFIGS, toc: TOC, storage, storageKey: "test" })
    );
    act(() => { result.current.preferences.setTheme("dark"); });
    await waitFor(() => {
      const stored = JSON.parse(storage.store["test:preferences"] ?? "{}");
      expect(stored.theme).toBe("dark");
    });
  });

  it("only writes delta — default fields not stored", async () => {
    const storage = makeStorage();
    const { result } = renderHook(() =>
      useReaderState({ markerConfigs: CONFIGS, toc: TOC, storage, storageKey: "test" })
    );
    act(() => { result.current.preferences.setTheme("dark"); });
    await waitFor(() => {
      expect(storage.store["test:preferences"]).toBeDefined();
    });
    const stored = JSON.parse(storage.store["test:preferences"]);
    expect(stored).toEqual({ theme: "dark" });
    expect(stored.fontSize).toBeUndefined();
    expect(stored.lineHeight).toBeUndefined();
    expect(stored.fontFamily).toBeUndefined();
  });

  it("restores preferences from storage after mount", async () => {
    const stored = JSON.stringify({ theme: "dark", fontSize: 20, lineHeight: 1.8, fontFamily: "serif" });
    const storage = makeStorage({ "test:preferences": stored });
    const { result } = renderHook(() =>
      useReaderState({ markerConfigs: CONFIGS, toc: TOC, storage, storageKey: "test" })
    );
    await waitFor(() => {
      expect(result.current.preferences.preferences.theme).toBe("dark");
      expect(result.current.preferences.preferences.fontSize).toBe(20);
      expect(result.current.preferences.preferences.fontFamily).toBe("serif");
    });
  });

  it("ignores invalid stored preference values", async () => {
    const stored = JSON.stringify({ theme: "invalid-theme", fontSize: 999 });
    const storage = makeStorage({ "test:preferences": stored });
    const { result } = renderHook(() =>
      useReaderState({ markerConfigs: CONFIGS, toc: TOC, storage, storageKey: "test" })
    );
    await waitFor(() => {
      // Invalid values ignored; defaults used
      expect(result.current.preferences.preferences.theme).toBe(DEFAULT_READER_PREFERENCES.theme);
      expect(result.current.preferences.preferences.fontSize).toBe(DEFAULT_READER_PREFERENCES.fontSize);
    });
  });

  it("does not write defaults to storage on first open", async () => {
    const storage = makeStorage();
    renderHook(() =>
      useReaderState({ markerConfigs: CONFIGS, toc: TOC, storage, storageKey: "test" })
    );
    // Wait for effects to settle
    await new Promise((r) => setTimeout(r, 0));
    expect(storage.store["test:preferences"]).toBeUndefined();
  });

  it("reset removes preferences key from storage", async () => {
    const storage = makeStorage();
    const { result } = renderHook(() =>
      useReaderState({ markerConfigs: CONFIGS, toc: TOC, storage, storageKey: "test" })
    );
    act(() => { result.current.preferences.setTheme("dark"); });
    await waitFor(() => {
      expect(storage.store["test:preferences"]).toBeDefined();
    });
    act(() => { result.current.preferences.reset(); });
    await waitFor(() => {
      expect(storage.store["test:preferences"]).toBeUndefined();
    });
  });

  it("preferencesStorage separate from storage — preferences go to global adapter", async () => {
    const markerStorage = makeStorage();
    const globalStorage = makeStorage();
    const { result } = renderHook(() =>
      useReaderState({
        markerConfigs: CONFIGS,
        toc: TOC,
        storage: markerStorage,
        preferencesStorage: globalStorage,
        storageKey: "test",
      })
    );
    act(() => { result.current.preferences.setTheme("dark"); });
    await waitFor(() => {
      expect(globalStorage.store["test:preferences"]).toBeDefined();
      expect(JSON.parse(globalStorage.store["test:preferences"]).theme).toBe("dark");
    });
    // Marker storage must not contain preferences key
    expect(markerStorage.store["test:preferences"]).toBeUndefined();
  });

  it("preferencesStorage restores from global adapter independently of marker storage", async () => {
    const stored = JSON.stringify({ theme: "dark", fontSize: 20, lineHeight: 1.8, fontFamily: "serif" });
    const markerStorage = makeStorage();
    const globalStorage = makeStorage({ "test:preferences": stored });
    const { result } = renderHook(() =>
      useReaderState({
        markerConfigs: CONFIGS,
        toc: TOC,
        storage: markerStorage,
        preferencesStorage: globalStorage,
        storageKey: "test",
      })
    );
    await waitFor(() => {
      expect(result.current.preferences.preferences.theme).toBe("dark");
      expect(result.current.preferences.preferences.fontSize).toBe(20);
    });
  });
});

// ---------------------------------------------------------------------------
// stale id pruning
// ---------------------------------------------------------------------------

describe("useReaderState — stale id pruning", () => {
  it("prunes hidden ids removed from markerConfigs", () => {
    const { result, rerender } = renderHook(
      ({ configs }) => useReaderState({ markerConfigs: configs, toc: TOC }),
      { initialProps: { configs: CONFIGS } }
    );
    act(() => { result.current.markerVisibility.toggleMarker("alpha"); });
    expect(result.current.markerVisibility.hiddenMarkerIds).toContain("alpha");

    rerender({ configs: [{ id: "beta", label: "Beta" }] });
    expect(result.current.markerVisibility.hiddenMarkerIds).not.toContain("alpha");
  });
});

// ---------------------------------------------------------------------------
// storage
// ---------------------------------------------------------------------------

describe("useReaderState — storage", () => {
  it("persists hiddenMarkerIds when toggled", () => {
    const storage = makeStorage();
    const { result } = renderHook(() =>
      useReaderState({ markerConfigs: CONFIGS, toc: TOC, storage, storageKey: "test" })
    );
    act(() => { result.current.markerVisibility.toggleMarker("alpha"); });
    expect(storage.store["test:hiddenMarkerIds"]).toBe(JSON.stringify(["alpha"]));
  });

  it("removes storage key when hiddenMarkerIds becomes empty", () => {
    const storage = makeStorage();
    const { result } = renderHook(() =>
      useReaderState({ markerConfigs: CONFIGS, toc: TOC, storage, storageKey: "test" })
    );
    act(() => { result.current.markerVisibility.toggleMarker("alpha"); });
    act(() => { result.current.markerVisibility.toggleMarker("alpha"); });
    expect(storage.store["test:hiddenMarkerIds"]).toBeUndefined();
  });

  it("restores hiddenMarkerIds from storage after mount", async () => {
    const storage = makeStorage({ "test:hiddenMarkerIds": JSON.stringify(["alpha"]) });
    const { result } = renderHook(() =>
      useReaderState({ markerConfigs: CONFIGS, toc: TOC, storage, storageKey: "test" })
    );
    await waitFor(() => {
      expect(result.current.markerVisibility.hiddenMarkerIds).toEqual(["alpha"]);
    });
    expect(result.current.markerVisibility.visibleCount).toBe(1);
  });

  it("ignores stored ids not in current markerConfigs after mount", async () => {
    const storage = makeStorage({ "test:hiddenMarkerIds": JSON.stringify(["alpha", "stale"]) });
    const { result } = renderHook(() =>
      useReaderState({ markerConfigs: CONFIGS, toc: TOC, storage, storageKey: "test" })
    );
    await waitFor(() => {
      expect(result.current.markerVisibility.hiddenMarkerIds).toEqual(["alpha"]);
    });
  });

  it("does not overwrite storage with [] on initial mount", async () => {
    const storage = makeStorage({ "test:hiddenMarkerIds": JSON.stringify(["alpha"]) });
    renderHook(() =>
      useReaderState({ markerConfigs: CONFIGS, toc: TOC, storage, storageKey: "test" })
    );
    // Briefly after mount the stored value must still be intact (not overwritten with []).
    await waitFor(() => {
      expect(storage.store["test:hiddenMarkerIds"]).toBe(JSON.stringify(["alpha"]));
    });
  });

  it("waits to restore storage until markerConfigs are available", async () => {
    const storage = makeStorage({ "test:hiddenMarkerIds": JSON.stringify(["alpha"]) });
    const { result, rerender } = renderHook(
      ({ configs }) => useReaderState({ markerConfigs: configs, toc: TOC, storage, storageKey: "test" }),
      { initialProps: { configs: [] as typeof CONFIGS } }
    );

    expect(result.current.markerVisibility.hiddenMarkerIds).toEqual([]);
    expect(storage.store["test:hiddenMarkerIds"]).toBe(JSON.stringify(["alpha"]));

    rerender({ configs: CONFIGS });

    await waitFor(() => {
      expect(result.current.markerVisibility.hiddenMarkerIds).toEqual(["alpha"]);
    });
    expect(storage.store["test:hiddenMarkerIds"]).toBe(JSON.stringify(["alpha"]));
  });

  it("storage unavailable — no crash, starts all visible", () => {
    const { result } = renderHook(() =>
      useReaderState({ markerConfigs: CONFIGS, toc: TOC, storage: throwingStorage(), storageKey: "test" })
    );
    expect(result.current.markerVisibility.visibleCount).toBe(2);
    expect(() => {
      act(() => { result.current.markerVisibility.toggleMarker("alpha"); });
    }).not.toThrow();
  });

  it("storage null — no persistence, no crash", () => {
    const { result } = renderHook(() =>
      useReaderState({ markerConfigs: CONFIGS, toc: TOC, storage: null, storageKey: "test" })
    );
    act(() => { result.current.markerVisibility.toggleMarker("alpha"); });
    expect(result.current.markerVisibility.isHidden("alpha")).toBe(true);
  });

  it("storage undefined — no persistence, no crash", () => {
    const { result } = renderHook(() =>
      useReaderState({ markerConfigs: CONFIGS, toc: TOC })
    );
    act(() => { result.current.markerVisibility.toggleMarker("beta"); });
    expect(result.current.markerVisibility.isHidden("beta")).toBe(true);
  });
});
