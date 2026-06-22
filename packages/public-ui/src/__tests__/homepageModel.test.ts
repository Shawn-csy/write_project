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

describe("lanes", () => {
  it("latestEntriesPreview capped at 15 entries", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      enrichScript(makeScript({ id: `s${i}`, title: `Script ${i}` }))
    );
    const m = buildPublicHomepageModel({ ...baseInput, latestScripts: many, filteredScripts: many });
    expect(m.lanes.latestEntriesPreview).toHaveLength(15);
  });

  it("topViewedEntriesPreview capped at 15 entries", () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      enrichScript(makeScript({ id: `s${i}`, title: `Script ${i}` }))
    );
    const m = buildPublicHomepageModel({ ...baseInput, topViewedScripts: many });
    expect(m.lanes.topViewedEntriesPreview).toHaveLength(15);
  });

  it("activeLaneMode matches input laneMode", () => {
    const m = buildPublicHomepageModel({ ...baseInput, laneMode: "top" });
    expect(m.lanes.activeLaneMode).toBe("top");
  });

  it("featuredSeries converted to PublicSeriesGroup", () => {
    const series = [{ name: "S", totalViews: 10, count: 2, lead: enriched[0], coverUrl: "", scripts: enriched }];
    const m = buildPublicHomepageModel({ ...baseInput, featuredSeries: series });
    expect(m.lanes.featuredSeries).toHaveLength(1);
    expect(m.lanes.featuredSeries[0].name).toBe("S");
    expect(m.lanes.featuredSeries[0].type).toBe("series");
    expect(m.lanes.featuredSeries[0].leadScript).toBeDefined();
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
    const group = m.lanes.featuredSeries[0];
    expect(group.latestScript.id).toBe("ch2");
    expect(group.updatedAt).toBe(Date.parse("2025-06-15T00:00:00Z"));
  });

  it("invalid empty featuredSeries entries are ignored", () => {
    const series = [{ name: "Empty", totalViews: 0, count: 0, lead: null, coverUrl: "", scripts: [] }];
    const m = buildPublicHomepageModel({ ...baseInput, featuredSeries: series });
    expect(m.lanes.featuredSeries).toEqual([]);
  });

  it("featuredSeries de-duplicates series already in latest/top lanes", () => {
    const ch1 = enrichScript(makeScript({ id: "c1", title: "Ch 1", series: { name: "Dup" }, seriesOrder: 1, lastModified: 2000 }));
    const ch2 = enrichScript(makeScript({ id: "c2", title: "Ch 2", series: { name: "Dup" }, seriesOrder: 2, lastModified: 1000 }));
    const unique = enrichScript(makeScript({ id: "u1", title: "Unique Ch", series: { name: "Unique" }, seriesOrder: 1, lastModified: 500 }));
    // "Dup" appears in latestScripts (will be grouped into a series entry in the lane)
    const featured = [
      { name: "Dup", totalViews: 10, count: 2, lead: ch1, coverUrl: "", scripts: [ch1, ch2] },
      { name: "Unique", totalViews: 5, count: 1, lead: unique, coverUrl: "", scripts: [unique] },
    ];
    const m = buildPublicHomepageModel({
      ...baseInput,
      latestScripts: [ch1, ch2],
      featuredSeries: featured,
    });
    // "Dup" should be removed from featured since it appears in latest lane
    expect(m.lanes.featuredSeries.map((s) => s.name)).toEqual(["Unique"]);
  });

  it("same-series chapters collapse into one series entry in latestEntriesPreview", () => {
    const chapter1 = enrichScript(makeScript({ id: "c1", title: "Ch 1", series: { name: "Epic" }, seriesOrder: 1, lastModified: 2000 }));
    const chapter2 = enrichScript(makeScript({ id: "c2", title: "Ch 2", series: { name: "Epic" }, seriesOrder: 2, lastModified: 1000 }));
    const solo = enrichScript(makeScript({ id: "solo", title: "Solo" }));
    const m = buildPublicHomepageModel({
      ...baseInput,
      latestScripts: [chapter1, chapter2, solo],
      filteredScripts: [chapter1, chapter2, solo],
    });
    // 3 scripts → 2 entries (1 series + 1 solo)
    expect(m.lanes.latestEntriesPreview).toHaveLength(2);
    expect(m.lanes.latestEntriesPreview[0].type).toBe("series");
    expect((m.lanes.latestEntriesPreview[0] as import("../gallery/seriesModel").PublicSeriesGroup).name).toBe("Epic");
    expect((m.lanes.latestEntriesPreview[0] as import("../gallery/seriesModel").PublicSeriesGroup).scripts).toHaveLength(2);
    expect(m.lanes.latestEntriesPreview[1].type).toBe("script");
  });

  it("same-series chapters collapse into one series entry in topViewedEntriesPreview", () => {
    const chapter1 = enrichScript(makeScript({ id: "c1", title: "Ch 1", series: { name: "Epic" }, seriesOrder: 1, views: 100, lastModified: 2000 }));
    const chapter2 = enrichScript(makeScript({ id: "c2", title: "Ch 2", series: { name: "Epic" }, seriesOrder: 2, views: 50, lastModified: 1000 }));
    const m = buildPublicHomepageModel({
      ...baseInput,
      topViewedScripts: [chapter1, chapter2],
    });
    expect(m.lanes.topViewedEntriesPreview).toHaveLength(1);
    expect(m.lanes.topViewedEntriesPreview[0].type).toBe("series");
  });

  it("15-entry cap counts series as one entry (not per chapter)", () => {
    // 14 solo scripts + 1 series of 10 chapters = 15 entries before cap, not 24
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
    // 14 solos + 1 series = 15 entries — all fit within cap
    expect(m.lanes.latestEntriesPreview).toHaveLength(15);
    const seriesEntry = m.lanes.latestEntriesPreview.find((e) => e.type === "series");
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
