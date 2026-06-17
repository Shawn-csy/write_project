import { describe, it, expect } from "vitest";
import {
  deriveChapterRows,
  detectOrderConflicts,
  getSeriesReadiness,
  buildSeriesEditorModel,
  buildAttachScriptUpdate,
  buildDetachScriptUpdate,
  buildReorderScriptUpdate,
  buildSeriesMutationPlan,
  normalizeEditableSeriesOrder,
} from "./seriesEditorModel";
import type { SeriesChapterRow } from "./seriesEditorModel";
import type { BaseScriptApi } from "../../types/api";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeScript(overrides: Partial<BaseScriptApi> & { id: string }): BaseScriptApi {
  return {
    title: "Untitled",
    status: "published",
    seriesId: "s1",
    seriesOrder: null,
    lastModified: 1000,
    updatedAt: 1000,
    ...overrides,
  } as BaseScriptApi;
}

// ─── deriveChapterRows ────────────────────────────────────────────────────────

describe("deriveChapterRows", () => {
  it("sorts by seriesOrder ascending", () => {
    const scripts = [
      makeScript({ id: "c", seriesOrder: 3 }),
      makeScript({ id: "a", seriesOrder: 1 }),
      makeScript({ id: "b", seriesOrder: 2 }),
    ];
    const rows = deriveChapterRows(scripts);
    expect(rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("puts null-order rows at the end", () => {
    const scripts = [
      makeScript({ id: "x", seriesOrder: null }),
      makeScript({ id: "a", seriesOrder: 1 }),
    ];
    const rows = deriveChapterRows(scripts);
    expect(rows[0].id).toBe("a");
    expect(rows[1].id).toBe("x");
  });

  it("tie-breaks same order by updatedAt descending", () => {
    const scripts = [
      makeScript({ id: "old", seriesOrder: 2, lastModified: 100 }),
      makeScript({ id: "new", seriesOrder: 2, lastModified: 999 }),
    ];
    const rows = deriveChapterRows(scripts);
    expect(rows[0].id).toBe("new");
    expect(rows[1].id).toBe("old");
  });

  it("marks seriesOrder === 0 as prologue", () => {
    const rows = deriveChapterRows([makeScript({ id: "p", seriesOrder: 0 })]);
    expect(rows[0].isPrologue).toBe(true);
    expect(rows[0].isMissingOrder).toBe(false);
  });

  it("marks null seriesOrder as isMissingOrder", () => {
    const rows = deriveChapterRows([makeScript({ id: "m", seriesOrder: null })]);
    expect(rows[0].isMissingOrder).toBe(true);
    expect(rows[0].isPrologue).toBe(false);
  });

  it("normalizes non-finite seriesOrder to null", () => {
    const script = makeScript({ id: "nan" });
    (script as unknown as Record<string, unknown>).seriesOrder = NaN;
    const rows = deriveChapterRows([script]);
    expect(rows[0].seriesOrder).toBeNull();
    expect(rows[0].isMissingOrder).toBe(true);
  });

  it("returns empty array for empty input", () => {
    expect(deriveChapterRows([])).toEqual([]);
  });

  it("uses ISO updatedAt for tie-break when lastModified is absent", () => {
    // Both scripts have same seriesOrder. "new" has no lastModified but a later
    // ISO updatedAt. It should still sort first via getSeriesTimestamp fallback.
    const scripts: BaseScriptApi[] = [
      { id: "old", seriesOrder: 2, lastModified: 100, updatedAt: 100 } as BaseScriptApi,
      { id: "new", seriesOrder: 2, updatedAt: "2025-01-01T00:00:00.000Z" } as BaseScriptApi,
    ];
    const rows = deriveChapterRows(scripts);
    // "new" has updatedAt ~1.7e12 ms >> 100 ms, so it should sort first
    expect(rows[0].id).toBe("new");
    expect(rows[1].id).toBe("old");
  });
});

// ─── detectOrderConflicts ─────────────────────────────────────────────────────

describe("detectOrderConflicts", () => {
  it("returns no conflicts when all orders unique", () => {
    const rows = deriveChapterRows([
      makeScript({ id: "a", seriesOrder: 1 }),
      makeScript({ id: "b", seriesOrder: 2 }),
    ]);
    expect(detectOrderConflicts(rows)).toEqual([]);
  });

  it("detects duplicate seriesOrder", () => {
    const rows = deriveChapterRows([
      makeScript({ id: "a", seriesOrder: 2 }),
      makeScript({ id: "b", seriesOrder: 2 }),
    ]);
    const conflicts = detectOrderConflicts(rows);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].order).toBe(2);
    expect(conflicts[0].scriptIds).toHaveLength(2);
  });

  it("includes prologue (order 0) conflicts", () => {
    const rows = deriveChapterRows([
      makeScript({ id: "a", seriesOrder: 0 }),
      makeScript({ id: "b", seriesOrder: 0 }),
    ]);
    const conflicts = detectOrderConflicts(rows);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].order).toBe(0);
  });

  it("excludes null-order rows from conflict detection", () => {
    const rows = deriveChapterRows([
      makeScript({ id: "a", seriesOrder: null }),
      makeScript({ id: "b", seriesOrder: null }),
    ]);
    expect(detectOrderConflicts(rows)).toEqual([]);
  });
});

// ─── getSeriesReadiness ───────────────────────────────────────────────────────

describe("getSeriesReadiness", () => {
  function makeModel(overrides: Partial<Parameters<typeof getSeriesReadiness>[0]> = {}) {
    return getSeriesReadiness({
      name: "My Series",
      summary: "A summary.",
      coverUrl: "https://example.com/cover.jpg",
      chapterRows: [
        { id: "a", seriesOrder: 1, isMissingOrder: false, isPrologue: false, title: "", status: "published", updatedAt: 0 },
      ],
      conflicts: [],
      ...overrides,
    });
  }

  it("isReady when all fields present and no issues", () => {
    expect(makeModel().isReady).toBe(true);
  });

  it("not ready when name missing", () => {
    expect(makeModel({ name: "" }).isReady).toBe(false);
    expect(makeModel({ name: "" }).hasName).toBe(false);
  });

  it("not ready when summary missing", () => {
    expect(makeModel({ summary: "" }).isReady).toBe(false);
    expect(makeModel({ summary: "" }).hasSummary).toBe(false);
  });

  it("not ready when cover missing", () => {
    expect(makeModel({ coverUrl: "" }).isReady).toBe(false);
    expect(makeModel({ coverUrl: "" }).hasCover).toBe(false);
  });

  it("not ready when no chapters", () => {
    expect(makeModel({ chapterRows: [] }).isReady).toBe(false);
    expect(makeModel({ chapterRows: [] }).hasChapters).toBe(false);
  });

  it("not ready when missing orders", () => {
    const rows = [{ id: "a", seriesOrder: null, isMissingOrder: true, isPrologue: false, title: "", status: "published", updatedAt: 0 }];
    expect(makeModel({ chapterRows: rows }).isReady).toBe(false);
    expect(makeModel({ chapterRows: rows }).hasMissingOrders).toBe(true);
  });

  it("not ready when conflicts exist", () => {
    const conflicts = [{ order: 2, scriptIds: ["a", "b"] }];
    expect(makeModel({ conflicts }).isReady).toBe(false);
    expect(makeModel({ conflicts }).hasConflicts).toBe(true);
  });
});

// ─── buildSeriesEditorModel ───────────────────────────────────────────────────

describe("buildSeriesEditorModel", () => {
  it("builds model with sorted chapters and readiness", () => {
    const model = buildSeriesEditorModel({
      seriesId: "s1",
      name: "Test Series",
      summary: "Summary.",
      coverUrl: "https://example.com/cover.jpg",
      scripts: [
        makeScript({ id: "b", seriesOrder: 2 }),
        makeScript({ id: "a", seriesOrder: 1 }),
      ],
    });
    expect(model.seriesId).toBe("s1");
    expect(model.chapterRows.map((r) => r.id)).toEqual(["a", "b"]);
    expect(model.conflicts).toEqual([]);
    expect(model.readiness.isReady).toBe(true);
  });

  it("detects conflicts in built model", () => {
    const model = buildSeriesEditorModel({
      seriesId: "s1",
      name: "Series",
      summary: "",
      coverUrl: "",
      scripts: [
        makeScript({ id: "a", seriesOrder: 1 }),
        makeScript({ id: "b", seriesOrder: 1 }),
      ],
    });
    expect(model.conflicts).toHaveLength(1);
    expect(model.readiness.hasConflicts).toBe(true);
    expect(model.readiness.isReady).toBe(false);
  });

  it("defaults summary and coverUrl to empty string when null", () => {
    const model = buildSeriesEditorModel({
      seriesId: "s1",
      name: "Series",
      summary: null,
      coverUrl: null,
      scripts: [],
    });
    expect(model.summary).toBe("");
    expect(model.coverUrl).toBe("");
  });
});

// ─── Mutation builders ────────────────────────────────────────────────────────

describe("buildAttachScriptUpdate", () => {
  it("returns seriesId and seriesOrder", () => {
    expect(buildAttachScriptUpdate("s1", 3)).toEqual({ seriesId: "s1", seriesOrder: 3 });
  });

  it("allows null order for unordered attach", () => {
    expect(buildAttachScriptUpdate("s1", null)).toEqual({ seriesId: "s1", seriesOrder: null });
  });
});

describe("buildDetachScriptUpdate", () => {
  it("returns null seriesId and seriesOrder", () => {
    expect(buildDetachScriptUpdate()).toEqual({ seriesId: null, seriesOrder: null });
  });
});

describe("buildReorderScriptUpdate", () => {
  it("returns seriesOrder only", () => {
    expect(buildReorderScriptUpdate(5)).toEqual({ seriesOrder: 5 });
  });

  it("allows null to clear order", () => {
    expect(buildReorderScriptUpdate(null)).toEqual({ seriesOrder: null });
  });
});

// ─── normalizeEditableSeriesOrder ─────────────────────────────────────────────

describe("normalizeEditableSeriesOrder", () => {
  it("empty string → valid null", () => {
    expect(normalizeEditableSeriesOrder("")).toEqual({ valid: true, order: null });
    expect(normalizeEditableSeriesOrder("   ")).toEqual({ valid: true, order: null });
  });

  it("valid integer → valid with that order", () => {
    expect(normalizeEditableSeriesOrder("1")).toEqual({ valid: true, order: 1 });
    expect(normalizeEditableSeriesOrder("0")).toEqual({ valid: true, order: 0 });
    expect(normalizeEditableSeriesOrder("42")).toEqual({ valid: true, order: 42 });
  });

  it("non-integer string → invalid", () => {
    const r = normalizeEditableSeriesOrder("abc");
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.error).toBeTruthy();
  });

  it("float string → invalid", () => {
    expect(normalizeEditableSeriesOrder("1.5").valid).toBe(false);
  });

  it("negative integer → invalid", () => {
    expect(normalizeEditableSeriesOrder("-1").valid).toBe(false);
  });

  it("whitespace-padded valid integer → valid", () => {
    expect(normalizeEditableSeriesOrder("  3  ")).toEqual({ valid: true, order: 3 });
  });
});

// ─── buildSeriesMutationPlan ──────────────────────────────────────────────────

function makeRow(id: string, seriesOrder: number | null): SeriesChapterRow {
  return {
    id,
    title: "Chapter",
    seriesOrder,
    status: "published",
    updatedAt: 0,
    isPrologue: seriesOrder === 0,
    isMissingOrder: seriesOrder === null,
  };
}

describe("buildSeriesMutationPlan", () => {
  it("returns empty plan when nothing changed", () => {
    const rows = [makeRow("c1", 1), makeRow("c2", 2)];
    const target = new Map([["c1", 1], ["c2", 2]]);
    expect(buildSeriesMutationPlan(rows, target)).toEqual([]);
  });

  it("returns only changed items", () => {
    const rows = [makeRow("c1", 1), makeRow("c2", 2), makeRow("c3", 3)];
    const target = new Map([["c1", 1], ["c2", 5], ["c3", 3]]);
    const plan = buildSeriesMutationPlan(rows, target);
    expect(plan).toHaveLength(1);
    expect(plan[0]).toEqual({ scriptId: "c2", seriesOrder: 5 });
  });

  it("includes null order changes", () => {
    const rows = [makeRow("c1", 1)];
    const target = new Map<string, number | null>([["c1", null]]);
    const plan = buildSeriesMutationPlan(rows, target);
    expect(plan).toEqual([{ scriptId: "c1", seriesOrder: null }]);
  });

  it("ignores rows not in targetOrders map", () => {
    const rows = [makeRow("c1", 1), makeRow("c2", 2)];
    const target = new Map([["c1", 3]]); // c2 not in map
    const plan = buildSeriesMutationPlan(rows, target);
    expect(plan).toHaveLength(1);
    expect(plan[0].scriptId).toBe("c1");
  });

  it("returns all items when all changed", () => {
    const rows = [makeRow("c1", 1), makeRow("c2", 2)];
    const target = new Map([["c1", 10], ["c2", 20]]);
    const plan = buildSeriesMutationPlan(rows, target);
    expect(plan).toHaveLength(2);
  });
});
