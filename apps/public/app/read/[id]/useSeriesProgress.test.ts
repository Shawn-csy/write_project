import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSeriesProgress } from "./useSeriesProgress";
import type { ChapterNavModel } from "./useSeriesChapterNav";

// ─── localStorage mock ────────────────────────────────────────────────────────

const store: Record<string, string> = {};

const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
  clear: vi.fn(() => { for (const k in store) delete store[k]; }),
};

beforeEach(() => {
  vi.stubGlobal("localStorage", localStorageMock);
  localStorageMock.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const STORAGE_KEY = "series-progress:epic series";

function makeNav(overrides: Partial<ChapterNavModel> = {}): ChapterNavModel {
  return {
    seriesName: "Epic Series",
    seriesHref: "/series/Epic%20Series",
    chapters: [
      { id: "c1", title: "Ch 1", seriesOrder: 1 },
      { id: "c2", title: "Ch 2", seriesOrder: 2 },
      { id: "c3", title: "Ch 3", seriesOrder: 3 },
    ],
    currentIndex: 1,
    prev: { id: "c1", title: "Ch 1", seriesOrder: 1 },
    next: { id: "c3", title: "Ch 3", seriesOrder: 3 },
    latestChapter: { id: "c3", title: "Ch 3", seriesOrder: 3 },
    isLatest: false,
    latestScriptUpdatedAt: "2026-06-01T00:00:00.000Z",
    ...overrides,
  };
}

function writeStoredProgress(data: object) {
  store[STORAGE_KEY] = JSON.stringify(data);
}

// ─── hasNewChapter — initial hint derivation ──────────────────────────────────

describe("hasNewChapter — initial hint", () => {
  it("no stored progress → false (first visit)", () => {
    const { result } = renderHook(() => useSeriesProgress("c2", makeNav()));
    expect(result.current.hasNewChapter).toBe(false);
  });

  it("no series (nav=null) → false", () => {
    const { result } = renderHook(() => useSeriesProgress("c1", null));
    expect(result.current.hasNewChapter).toBe(false);
  });

  it("stored latestSeenScriptId matches current latest → false (up to date)", () => {
    writeStoredProgress({
      seriesKey: "epic series",
      lastReadScriptId: "c2",
      lastReadAt: "2026-01-01T00:00:00.000Z",
      latestSeenScriptId: "c3",
    });
    const { result } = renderHook(() => useSeriesProgress("c2", makeNav()));
    expect(result.current.hasNewChapter).toBe(false);
  });

  it("stored latestSeenScriptId differs from current latest → true (new chapter)", () => {
    writeStoredProgress({
      seriesKey: "epic series",
      lastReadScriptId: "c1",
      lastReadAt: "2026-01-01T00:00:00.000Z",
      latestSeenScriptId: "c2", // visitor last saw c2, but c3 is now latest
    });
    const { result } = renderHook(() => useSeriesProgress("c1", makeNav()));
    expect(result.current.hasNewChapter).toBe(true);
  });

  it("isLatest=true, current script is latest, stored matches → false", () => {
    const nav = makeNav({ isLatest: true, latestChapter: null });
    writeStoredProgress({
      seriesKey: "epic series",
      lastReadScriptId: "c3",
      lastReadAt: "2026-01-01T00:00:00.000Z",
      latestSeenScriptId: "c3",
    });
    const { result } = renderHook(() => useSeriesProgress("c3", nav));
    expect(result.current.hasNewChapter).toBe(false);
  });

  it("stored progress has no latestSeenScriptId → false", () => {
    writeStoredProgress({
      seriesKey: "epic series",
      lastReadScriptId: "c1",
      lastReadAt: "2026-01-01T00:00:00.000Z",
      // latestSeenScriptId omitted
    });
    const { result } = renderHook(() => useSeriesProgress("c1", makeNav()));
    expect(result.current.hasNewChapter).toBe(false);
  });

  it("corrupted localStorage value → false (shape check discards it)", () => {
    store[STORAGE_KEY] = "not-json{{";
    const { result } = renderHook(() => useSeriesProgress("c2", makeNav()));
    expect(result.current.hasNewChapter).toBe(false);
  });

  it("localStorage value missing required fields → false", () => {
    store[STORAGE_KEY] = JSON.stringify({ foo: "bar" });
    const { result } = renderHook(() => useSeriesProgress("c2", makeNav()));
    expect(result.current.hasNewChapter).toBe(false);
  });

  it("latestScriptUpdatedAt newer than stored → true (same latest script, updated)", () => {
    writeStoredProgress({
      seriesKey: "epic series",
      lastReadScriptId: "c3",
      lastReadAt: "2026-01-01T00:00:00.000Z",
      latestSeenScriptId: "c3",
      latestSeenUpdatedAt: "2026-01-01T00:00:00.000Z",
    });
    // nav latestScriptUpdatedAt is "2026-06-01" — newer than stored
    const { result } = renderHook(() => useSeriesProgress("c3", makeNav({ isLatest: true, latestChapter: null })));
    expect(result.current.hasNewChapter).toBe(true);
  });
});

// ─── markSeen ─────────────────────────────────────────────────────────────────

describe("markSeen", () => {
  it("writes progress to localStorage", () => {
    const nav = makeNav();
    const { result } = renderHook(() => useSeriesProgress("c2", nav));
    act(() => { result.current.markSeen(); });
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      expect.stringContaining('"lastReadScriptId":"c2"')
    );
  });

  it("written progress records latestSeenScriptId = current latestScript", () => {
    const nav = makeNav(); // latestChapter.id = "c3"
    const { result } = renderHook(() => useSeriesProgress("c2", nav));
    act(() => { result.current.markSeen(); });
    const written = JSON.parse(store[STORAGE_KEY]);
    expect(written.latestSeenScriptId).toBe("c3");
  });

  it("written progress records latestSeenUpdatedAt from nav", () => {
    const nav = makeNav(); // latestScriptUpdatedAt = "2026-06-01T00:00:00.000Z"
    const { result } = renderHook(() => useSeriesProgress("c2", nav));
    act(() => { result.current.markSeen(); });
    const written = JSON.parse(store[STORAGE_KEY]);
    expect(written.latestSeenUpdatedAt).toBe("2026-06-01T00:00:00.000Z");
  });

  it("badge stays true after markSeen() (current visit)", () => {
    writeStoredProgress({
      seriesKey: "epic series",
      lastReadScriptId: "c1",
      lastReadAt: "2026-01-01T00:00:00.000Z",
      latestSeenScriptId: "c2", // old — c3 is now latest
    });
    const { result } = renderHook(() => useSeriesProgress("c1", makeNav()));
    expect(result.current.hasNewChapter).toBe(true);

    act(() => { result.current.markSeen(); });

    // Badge must still be true — markSeen does NOT clear it
    expect(result.current.hasNewChapter).toBe(true);
  });

  it("next mount after markSeen → hasNewChapter=false (hint cleared on remount)", () => {
    writeStoredProgress({
      seriesKey: "epic series",
      lastReadScriptId: "c1",
      lastReadAt: "2026-01-01T00:00:00.000Z",
      latestSeenScriptId: "c2",
    });
    const nav = makeNav();

    // First mount: hint is true, call markSeen to record c3 as seen
    const first = renderHook(() => useSeriesProgress("c1", nav));
    expect(first.result.current.hasNewChapter).toBe(true);
    act(() => { first.result.current.markSeen(); });
    first.unmount();

    // Second mount: stored progress now has latestSeenScriptId=c3, hint = false
    const second = renderHook(() => useSeriesProgress("c1", nav));
    expect(second.result.current.hasNewChapter).toBe(false);
  });

  it("markSeen with no nav → no-op, no localStorage write", () => {
    const { result } = renderHook(() => useSeriesProgress("c1", null));
    act(() => { result.current.markSeen(); });
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
  });
});
