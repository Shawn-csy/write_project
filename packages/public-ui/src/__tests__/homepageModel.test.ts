import { describe, expect, it } from "vitest";
import { buildPublicHomepageModel } from "../gallery/homepageModel";
import type { BuildPublicHomepageModelInput } from "../gallery/homepageModel";
import { enrichScript } from "../gallery/filterModel";
import type { GalleryScriptInput } from "../gallery/filterModel";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeScript(overrides: Partial<GalleryScriptInput> = {}): GalleryScriptInput {
  return {
    id: "s1",
    title: "Test Script",
    customMetadata: [],
    licenseCommercial: "",
    licenseDerivative: "",
    licenseNotify: "",
    persona: null,
    tags: [],
    views: 0,
    lastModified: 1000,
    ...overrides,
  };
}

const enriched = [
  enrichScript(makeScript({ id: "a", title: "Alpha", views: 10, lastModified: 2000 })),
  enrichScript(makeScript({ id: "b", title: "Beta", views: 5, lastModified: 1000 })),
];

const baseInput: BuildPublicHomepageModelInput = {
  view: "scripts",
  viewMode: "standard",
  laneMode: "latest",
  filteredScripts: enriched,
  topViewedScripts: [...enriched].sort((a, b) => (b.views || 0) - (a.views || 0)),
  latestScripts: enriched,
  featuredSeries: [],
  allTags: ["tag-a", "tag-b"],
  licenseTagShortcuts: [],
  filteredAuthors: [],
  filteredOrgs: [],
  selectedTags: [],
  selectedAuthorTags: [],
  selectedOrgTags: [],
  segment: "all",
  usage: "all",
  q: "",
  totalScriptCount: 2,
  totalAuthorCount: 0,
  totalOrgCount: 0,
};

// ─── hasFilters / showLanes ────────────────────────────────────────────────────

describe("hasFilters / showLanes", () => {
  it("small catalog, no filters → hasFilters=false, showLanes=false (below threshold)", () => {
    const m = buildPublicHomepageModel(baseInput);
    expect(m.hasFilters).toBe(false);
    expect(m.showLanes).toBe(false);
  });

  it("large catalog, no filters → showLanes=true", () => {
    const m = buildPublicHomepageModel({ ...baseInput, totalScriptCount: 25 });
    expect(m.hasFilters).toBe(false);
    expect(m.showLanes).toBe(true);
  });

  it("enough distinct entries → showLanes=true even with fewer total scripts", () => {
    const manyScripts = Array.from({ length: 12 }, (_, i) =>
      enrichScript(makeScript({ id: `s${i}`, title: `S${i}`, lastModified: 1000 + i }))
    );
    const m = buildPublicHomepageModel({
      ...baseInput,
      filteredScripts: manyScripts,
      latestScripts: manyScripts,
      topViewedScripts: manyScripts,
      totalScriptCount: 12,
    });
    expect(m.showLanes).toBe(true);
  });

  it("q set → hasFilters=true, showLanes=false", () => {
    const m = buildPublicHomepageModel({ ...baseInput, totalScriptCount: 25, q: "hello" });
    expect(m.hasFilters).toBe(true);
    expect(m.showLanes).toBe(false);
  });

  it("tag selected → hasFilters=true", () => {
    const m = buildPublicHomepageModel({ ...baseInput, selectedTags: ["tag-a"] });
    expect(m.hasFilters).toBe(true);
  });

  it("segment set → hasFilters=true", () => {
    const m = buildPublicHomepageModel({ ...baseInput, segment: "adult" });
    expect(m.hasFilters).toBe(true);
  });

  it("usage set → hasFilters=true", () => {
    const m = buildPublicHomepageModel({ ...baseInput, usage: "commercial" });
    expect(m.hasFilters).toBe(true);
  });

  it("authorTags set → hasFilters=true", () => {
    const m = buildPublicHomepageModel({ ...baseInput, selectedAuthorTags: ["voice"] });
    expect(m.hasFilters).toBe(true);
  });

  it("non-scripts view → showLanes=false even with large catalog", () => {
    const m = buildPublicHomepageModel({ ...baseInput, view: "authors", totalScriptCount: 25 });
    expect(m.showLanes).toBe(false);
  });
});

// ─── resultCount ──────────────────────────────────────────────────────────────

describe("resultCount", () => {
  it("scripts view → filteredScripts.length", () => {
    const m = buildPublicHomepageModel(baseInput);
    expect(m.resultCount).toBe(2);
  });

  it("authors view → filteredAuthors.length", () => {
    const m = buildPublicHomepageModel({
      ...baseInput,
      view: "authors",
      filteredAuthors: [{ id: "a1", displayName: "Author" }],
    });
    expect(m.resultCount).toBe(1);
  });

  it("orgs view → filteredOrgs.length", () => {
    const m = buildPublicHomepageModel({
      ...baseInput,
      view: "orgs",
      filteredOrgs: [{ id: "o1", name: "Org" }],
    });
    expect(m.resultCount).toBe(1);
  });
});

// ─── emptyState ───────────────────────────────────────────────────────────────

describe("emptyState", () => {
  it("results present → 'none'", () => {
    const m = buildPublicHomepageModel(baseInput);
    expect(m.emptyState).toBe("none");
  });

  it("no scripts, filters active → 'no-match'", () => {
    const m = buildPublicHomepageModel({
      ...baseInput,
      filteredScripts: [],
      totalScriptCount: 5,
      q: "notfound",
    });
    expect(m.emptyState).toBe("no-match");
  });

  it("no scripts, no filters, totalScriptCount=0 → 'no-public-scripts'", () => {
    const m = buildPublicHomepageModel({
      ...baseInput,
      filteredScripts: [],
      totalScriptCount: 0,
    });
    expect(m.emptyState).toBe("no-public-scripts");
  });

  it("no scripts, no filters, totalScriptCount>0 → 'no-data' (enrichment in progress)", () => {
    const m = buildPublicHomepageModel({
      ...baseInput,
      filteredScripts: [],
      totalScriptCount: 3,
    });
    expect(m.emptyState).toBe("no-data");
  });

  it("authors view, empty filtered, totalAuthorCount=0 → 'no-data'", () => {
    const m = buildPublicHomepageModel({
      ...baseInput,
      view: "authors",
      filteredAuthors: [],
      totalAuthorCount: 0,
    });
    expect(m.emptyState).toBe("no-data");
  });

  it("authors view, empty filtered, totalAuthorCount>0 → 'no-match'", () => {
    const m = buildPublicHomepageModel({
      ...baseInput,
      view: "authors",
      filteredAuthors: [],
      totalAuthorCount: 2,
      q: "ghost",
    });
    expect(m.emptyState).toBe("no-match");
  });
});

// ─── filterChips ──────────────────────────────────────────────────────────────

describe("filterChips", () => {
  it("no filters → empty chips", () => {
    expect(buildPublicHomepageModel(baseInput).filterChips).toEqual([]);
  });

  it("q → chip type 'q'", () => {
    const chips = buildPublicHomepageModel({ ...baseInput, q: "hello" }).filterChips;
    expect(chips).toContainEqual({ type: "q", label: "「hello」", value: "hello" });
  });

  it("segment → chip type 'segment'", () => {
    const chips = buildPublicHomepageModel({ ...baseInput, segment: "adult" }).filterChips;
    expect(chips).toContainEqual({ type: "segment", label: "adult", value: "adult" });
  });

  it("usage commercial → chip with label '可商用'", () => {
    const chips = buildPublicHomepageModel({ ...baseInput, usage: "commercial" }).filterChips;
    expect(chips).toContainEqual({ type: "usage", label: "可商用", value: "commercial" });
  });

  it("selectedTags → chip per tag", () => {
    const chips = buildPublicHomepageModel({ ...baseInput, selectedTags: ["a", "b"] }).filterChips;
    expect(chips.filter((c) => c.type === "tag").map((c) => c.value)).toEqual(["a", "b"]);
  });
});

// ─── lanes ────────────────────────────────────────────────────────────────────

// Helpers to extract a specific lane from ordered list by id
function laneById(m: ReturnType<typeof buildPublicHomepageModel>, id: "latest" | "top" | "series") {
  const lane = m.lanes.ordered.find((l) => l.id === id);
  if (!lane) throw new Error(`Lane "${id}" not found in ordered list`);
  return lane;
}

describe("lanes", () => {
  it("latest lane entries capped at 15", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      enrichScript(makeScript({ id: `s${i}`, title: `Script ${i}` }))
    );
    const m = buildPublicHomepageModel({ ...baseInput, latestScripts: many, filteredScripts: many });
    expect(laneById(m, "latest").entries).toHaveLength(15);
  });

  it("top lane entries capped at 15", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      enrichScript(makeScript({ id: `s${i}`, title: `Script ${i}` }))
    );
    const m = buildPublicHomepageModel({ ...baseInput, topViewedScripts: many });
    expect(laneById(m, "top").entries).toHaveLength(15);
  });

  it("activeLaneMode matches input laneMode", () => {
    const m = buildPublicHomepageModel({ ...baseInput, laneMode: "top" });
    expect(m.lanes.activeLaneMode).toBe("top");
  });

  it("active lane isActive=true, others isActive=false", () => {
    const m = buildPublicHomepageModel({ ...baseInput, laneMode: "top" });
    expect(laneById(m, "top").isActive).toBe(true);
    expect(laneById(m, "latest").isActive).toBe(false);
    expect(laneById(m, "series").isActive).toBe(false);
  });

  it("latest lane isActive=false even when laneMode=latest (latest is default, not explicit selection)", () => {
    const m = buildPublicHomepageModel({ ...baseInput, laneMode: "latest" });
    expect(laneById(m, "latest").isActive).toBe(false);
  });

  it("laneMode=latest → ordered [latest, top, series]", () => {
    const m = buildPublicHomepageModel({ ...baseInput, laneMode: "latest" });
    expect(m.lanes.ordered.map((l) => l.id)).toEqual(["latest", "top", "series"]);
  });

  it("laneMode=top → ordered [top, latest, series]", () => {
    const m = buildPublicHomepageModel({ ...baseInput, laneMode: "top" });
    expect(m.lanes.ordered.map((l) => l.id)).toEqual(["top", "latest", "series"]);
  });

  it("laneMode=series → ordered [series, latest, top]", () => {
    const m = buildPublicHomepageModel({ ...baseInput, laneMode: "series" });
    expect(m.lanes.ordered.map((l) => l.id)).toEqual(["series", "latest", "top"]);
  });

  it("laneMode=featured → ordered [top, series, latest]", () => {
    const m = buildPublicHomepageModel({ ...baseInput, laneMode: "featured" });
    expect(m.lanes.ordered.map((l) => l.id)).toEqual(["top", "series", "latest"]);
  });

  it("series lane isActive=true only for laneMode=series", () => {
    const ms = buildPublicHomepageModel({ ...baseInput, laneMode: "series" });
    const mf = buildPublicHomepageModel({ ...baseInput, laneMode: "featured" });
    expect(laneById(ms, "series").isActive).toBe(true);
    // featured is a meta-mode (editorial ordering) — no single lane is explicitly active
    expect(laneById(mf, "series").isActive).toBe(false);
    expect(laneById(mf, "top").isActive).toBe(false);
    expect(laneById(mf, "latest").isActive).toBe(false);
  });

  it("series lane has correct title", () => {
    const m = buildPublicHomepageModel({ ...baseInput, laneMode: "latest" });
    expect(laneById(m, "series").title).toBe("系列作品");
    expect(laneById(m, "latest").title).toBe("最新發布");
    expect(laneById(m, "top").title).toBe("點閱排行");
  });

  it("featuredSeries converted to PublicSeriesGroup in series lane", () => {
    const series = [{ name: "S", totalViews: 10, count: 2, lead: enriched[0], coverUrl: "", scripts: enriched }];
    const m = buildPublicHomepageModel({ ...baseInput, featuredSeries: series });
    const seriesLane = laneById(m, "series");
    expect(seriesLane.entries).toHaveLength(1);
    expect(seriesLane.entries[0].type).toBe("series");
    expect((seriesLane.entries[0] as import("../gallery/seriesModel").PublicSeriesGroup).name).toBe("S");
    expect((seriesLane.entries[0] as import("../gallery/seriesModel").PublicSeriesGroup).leadScript).toBeDefined();
  });

  it("featuredSeries latestScript resolves from ISO updatedAt when lastModified missing", () => {
    const older = enrichScript(makeScript({
      id: "ch1", title: "Ch 1", series: { name: "S" }, seriesOrder: 1,
      lastModified: undefined as unknown as number, updatedAt: "2025-01-01T00:00:00Z",
    }));
    const newer = enrichScript(makeScript({
      id: "ch2", title: "Ch 2", series: { name: "S" }, seriesOrder: 2,
      lastModified: undefined as unknown as number, updatedAt: "2025-06-15T00:00:00Z",
    }));
    const series = [{ name: "S", totalViews: 0, count: 2, lead: older, coverUrl: "", scripts: [older, newer] }];
    const m = buildPublicHomepageModel({ ...baseInput, featuredSeries: series });
    const group = laneById(m, "series").entries[0] as import("../gallery/seriesModel").PublicSeriesGroup;
    expect(group.latestScript.id).toBe("ch2");
    expect(group.updatedAt).toBe(Date.parse("2025-06-15T00:00:00Z"));
  });

  it("invalid empty featuredSeries entries are ignored (series lane empty)", () => {
    const series = [{ name: "Empty", totalViews: 0, count: 0, lead: null, coverUrl: "", scripts: [] }];
    const m = buildPublicHomepageModel({ ...baseInput, featuredSeries: series });
    expect(laneById(m, "series").entries).toEqual([]);
  });

  it("featuredSeries de-duplicates series already in latest lane", () => {
    const ch1 = enrichScript(makeScript({ id: "c1", title: "Ch 1", series: { name: "Dup" }, seriesOrder: 1, lastModified: 2000 }));
    const ch2 = enrichScript(makeScript({ id: "c2", title: "Ch 2", series: { name: "Dup" }, seriesOrder: 2, lastModified: 1000 }));
    const unique = enrichScript(makeScript({ id: "u1", title: "Unique Ch", series: { name: "Unique" }, seriesOrder: 1, lastModified: 500 }));
    const featured = [
      { name: "Dup", totalViews: 10, count: 2, lead: ch1, coverUrl: "", scripts: [ch1, ch2] },
      { name: "Unique", totalViews: 5, count: 1, lead: unique, coverUrl: "", scripts: [unique] },
    ];
    const m = buildPublicHomepageModel({ ...baseInput, latestScripts: [ch1, ch2], featuredSeries: featured });
    const names = laneById(m, "series").entries.map(
      (e) => (e as import("../gallery/seriesModel").PublicSeriesGroup).name
    );
    expect(names).toEqual(["Unique"]);
  });

  it("same-series chapters collapse into one series entry in latest lane", () => {
    const chapter1 = enrichScript(makeScript({ id: "c1", title: "Ch 1", series: { name: "Epic" }, seriesOrder: 1, lastModified: 2000 }));
    const chapter2 = enrichScript(makeScript({ id: "c2", title: "Ch 2", series: { name: "Epic" }, seriesOrder: 2, lastModified: 1000 }));
    const solo = enrichScript(makeScript({ id: "solo", title: "Solo" }));
    const m = buildPublicHomepageModel({
      ...baseInput,
      latestScripts: [chapter1, chapter2, solo],
      filteredScripts: [chapter1, chapter2, solo],
    });
    const entries = laneById(m, "latest").entries;
    // 3 scripts → 2 entries (1 series + 1 solo)
    expect(entries).toHaveLength(2);
    expect(entries[0].type).toBe("series");
    expect((entries[0] as import("../gallery/seriesModel").PublicSeriesGroup).name).toBe("Epic");
    expect((entries[0] as import("../gallery/seriesModel").PublicSeriesGroup).scripts).toHaveLength(2);
    expect(entries[1].type).toBe("script");
  });

  it("same-series chapters collapse into one series entry in top lane", () => {
    const chapter1 = enrichScript(makeScript({ id: "c1", title: "Ch 1", series: { name: "Epic" }, seriesOrder: 1, views: 100, lastModified: 2000 }));
    const chapter2 = enrichScript(makeScript({ id: "c2", title: "Ch 2", series: { name: "Epic" }, seriesOrder: 2, views: 50, lastModified: 1000 }));
    const m = buildPublicHomepageModel({ ...baseInput, topViewedScripts: [chapter1, chapter2] });
    const entries = laneById(m, "top").entries;
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("series");
  });

  it("15-entry cap counts series as one entry (not per chapter)", () => {
    const solos = Array.from({ length: 14 }, (_, i) =>
      enrichScript(makeScript({ id: `solo${i}`, title: `Solo ${i}` }))
    );
    const chapters = Array.from({ length: 10 }, (_, i) =>
      enrichScript(makeScript({ id: `ch${i}`, title: `Ch ${i}`, series: { name: "Big Series" }, seriesOrder: i }))
    );
    const m = buildPublicHomepageModel({
      ...baseInput,
      latestScripts: [...solos, ...chapters],
      filteredScripts: [...solos, ...chapters],
    });
    const entries = laneById(m, "latest").entries;
    // 14 solos + 1 series = 15 entries — all fit within cap
    expect(entries).toHaveLength(15);
    const seriesEntry = entries.find((e) => e.type === "series");
    expect(seriesEntry).toBeDefined();
    expect((seriesEntry as import("../gallery/seriesModel").PublicSeriesGroup).scripts).toHaveLength(10);
  });
});

// ─── passthrough ──────────────────────────────────────────────────────────────

describe("passthrough fields", () => {
  it("allTags passed through", () => {
    const m = buildPublicHomepageModel(baseInput);
    expect(m.allTags).toEqual(["tag-a", "tag-b"]);
  });

  it("view and viewMode passed through", () => {
    const m = buildPublicHomepageModel({ ...baseInput, view: "orgs", viewMode: "compact" });
    expect(m.view).toBe("orgs");
    expect(m.viewMode).toBe("compact");
  });
});
