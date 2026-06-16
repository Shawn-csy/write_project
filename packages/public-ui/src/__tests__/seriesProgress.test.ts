import { describe, it, expect } from "vitest";
import { deriveNewChapterHint, buildProgressUpdate } from "../gallery/seriesProgress";
import type { LocalSeriesProgress } from "../gallery/seriesProgress";

// ─── deriveNewChapterHint ─────────────────────────────────────────────────────

describe("deriveNewChapterHint", () => {
  it("no stored progress → false (first visit)", () => {
    expect(
      deriveNewChapterHint({ latestScriptId: "c3", latestScriptUpdatedAt: null, progress: null })
    ).toBe(false);
  });

  it("no latestSeenScriptId in progress → false", () => {
    const progress: LocalSeriesProgress = {
      seriesKey: "epic",
      lastReadScriptId: "c1",
      lastReadAt: "2026-01-01T00:00:00.000Z",
      // latestSeenScriptId omitted
    };
    expect(
      deriveNewChapterHint({ latestScriptId: "c3", latestScriptUpdatedAt: null, progress })
    ).toBe(false);
  });

  it("latestScriptId differs from latestSeenScriptId → true (new chapter added)", () => {
    const progress: LocalSeriesProgress = {
      seriesKey: "epic",
      lastReadScriptId: "c1",
      lastReadAt: "2026-01-01T00:00:00.000Z",
      latestSeenScriptId: "c2",
    };
    expect(
      deriveNewChapterHint({ latestScriptId: "c3", latestScriptUpdatedAt: null, progress })
    ).toBe(true);
  });

  it("same latestScriptId, no updatedAt data → false", () => {
    const progress: LocalSeriesProgress = {
      seriesKey: "epic",
      lastReadScriptId: "c2",
      lastReadAt: "2026-01-01T00:00:00.000Z",
      latestSeenScriptId: "c2",
      // no latestSeenUpdatedAt
    };
    expect(
      deriveNewChapterHint({ latestScriptId: "c2", latestScriptUpdatedAt: null, progress })
    ).toBe(false);
  });

  it("same latestScriptId, current updatedAt newer than seen → true (updated chapter)", () => {
    const progress: LocalSeriesProgress = {
      seriesKey: "epic",
      lastReadScriptId: "c2",
      lastReadAt: "2026-01-01T00:00:00.000Z",
      latestSeenScriptId: "c2",
      latestSeenUpdatedAt: "2026-01-01T00:00:00.000Z",
    };
    expect(
      deriveNewChapterHint({
        latestScriptId: "c2",
        latestScriptUpdatedAt: "2026-06-01T00:00:00.000Z",
        progress,
      })
    ).toBe(true);
  });

  it("same latestScriptId, current updatedAt older than seen → false", () => {
    const progress: LocalSeriesProgress = {
      seriesKey: "epic",
      lastReadScriptId: "c2",
      lastReadAt: "2026-06-01T00:00:00.000Z",
      latestSeenScriptId: "c2",
      latestSeenUpdatedAt: "2026-06-01T00:00:00.000Z",
    };
    expect(
      deriveNewChapterHint({
        latestScriptId: "c2",
        latestScriptUpdatedAt: "2026-01-01T00:00:00.000Z",
        progress,
      })
    ).toBe(false);
  });

  it("numeric ms updatedAt newer than seen ISO string → true", () => {
    const progress: LocalSeriesProgress = {
      seriesKey: "epic",
      lastReadScriptId: "c2",
      lastReadAt: "2026-01-01T00:00:00.000Z",
      latestSeenScriptId: "c2",
      latestSeenUpdatedAt: "2026-01-01T00:00:00.000Z",
    };
    const newerTs = Date.parse("2026-06-01T00:00:00.000Z");
    expect(
      deriveNewChapterHint({ latestScriptId: "c2", latestScriptUpdatedAt: newerTs, progress })
    ).toBe(true);
  });
});

// ─── buildProgressUpdate ──────────────────────────────────────────────────────

describe("buildProgressUpdate", () => {
  it("sets seriesKey, lastReadScriptId, latestSeenScriptId", () => {
    const result = buildProgressUpdate({
      seriesKey: "epic",
      currentScriptId: "c2",
      latestScriptId: "c3",
      latestScriptUpdatedAt: null,
    });
    expect(result.seriesKey).toBe("epic");
    expect(result.lastReadScriptId).toBe("c2");
    expect(result.latestSeenScriptId).toBe("c3");
  });

  it("lastReadAt is a valid ISO string", () => {
    const result = buildProgressUpdate({
      seriesKey: "epic",
      currentScriptId: "c1",
      latestScriptId: "c1",
      latestScriptUpdatedAt: null,
    });
    expect(Number.isFinite(Date.parse(result.lastReadAt))).toBe(true);
  });

  it("latestSeenUpdatedAt is stringified when provided as ISO string", () => {
    const result = buildProgressUpdate({
      seriesKey: "epic",
      currentScriptId: "c1",
      latestScriptId: "c1",
      latestScriptUpdatedAt: "2026-06-01T00:00:00.000Z",
    });
    expect(result.latestSeenUpdatedAt).toBe("2026-06-01T00:00:00.000Z");
  });

  it("latestSeenUpdatedAt is stringified when provided as ms number", () => {
    const ts = Date.parse("2026-06-01T00:00:00.000Z");
    const result = buildProgressUpdate({
      seriesKey: "epic",
      currentScriptId: "c1",
      latestScriptId: "c1",
      latestScriptUpdatedAt: ts,
    });
    expect(result.latestSeenUpdatedAt).toBe(String(ts));
  });

  it("latestSeenUpdatedAt is undefined when updatedAt is null", () => {
    const result = buildProgressUpdate({
      seriesKey: "epic",
      currentScriptId: "c1",
      latestScriptId: "c1",
      latestScriptUpdatedAt: null,
    });
    expect(result.latestSeenUpdatedAt).toBeUndefined();
  });
});
