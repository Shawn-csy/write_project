import { describe, expect, it } from "vitest";
import {
  groupScriptsIntoGalleryEntries,
  deriveSeriesChapterOrder,
  deriveAggregateAgeGate,
} from "../gallery/seriesModel";
import type { PublicSeriesGroup } from "../gallery/seriesModel";
import { enrichScript } from "../gallery/filterModel";
import type { GalleryScriptInput } from "../gallery/filterModel";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeScript(overrides: Partial<GalleryScriptInput> = {}): ReturnType<typeof enrichScript> {
  return enrichScript({
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
  });
}

function seriesScript(
  id: string,
  seriesName: string,
  order: number | null = null,
  lastModified = 1000,
  extraTags: string[] = []
) {
  return makeScript({
    id,
    title: `Chapter ${id}`,
    series: { name: seriesName },
    seriesOrder: order ?? undefined,
    lastModified,
    tags: extraTags,
  });
}

// ─── groupScriptsIntoGalleryEntries ───────────────────────────────────────────

describe("groupScriptsIntoGalleryEntries — basic grouping", () => {
  it("scripts without series → type: script entries", () => {
    const scripts = [makeScript({ id: "a" }), makeScript({ id: "b" })];
    const entries = groupScriptsIntoGalleryEntries(scripts);
    expect(entries).toHaveLength(2);
    expect(entries[0].type).toBe("script");
    expect(entries[1].type).toBe("script");
  });

  it("same-series scripts → single series entry", () => {
    const scripts = [
      seriesScript("a", "MyStory", 1),
      seriesScript("b", "MyStory", 2),
      seriesScript("c", "MyStory", 3),
    ];
    const entries = groupScriptsIntoGalleryEntries(scripts);
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("series");
    const group = entries[0] as PublicSeriesGroup;
    expect(group.scripts).toHaveLength(3);
    expect(group.name).toBe("MyStory");
  });

  it("mix of series and solo scripts", () => {
    const scripts = [
      makeScript({ id: "solo1" }),
      seriesScript("a", "Alpha", 1),
      seriesScript("b", "Alpha", 2),
      makeScript({ id: "solo2" }),
    ];
    const entries = groupScriptsIntoGalleryEntries(scripts);
    expect(entries).toHaveLength(3);
    expect(entries[0].type).toBe("script");
    expect(entries[1].type).toBe("series");
    expect(entries[2].type).toBe("script");
  });

  it("two different series → two series entries", () => {
    const scripts = [
      seriesScript("a", "Alpha", 1),
      seriesScript("b", "Beta", 1),
      seriesScript("c", "Alpha", 2),
    ];
    const entries = groupScriptsIntoGalleryEntries(scripts);
    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.type === "series")).toBe(true);
  });

  it("series name matching is case-insensitive", () => {
    const scripts = [
      seriesScript("a", "MyStory", 1),
      seriesScript("b", "MYSTORY", 2),
      seriesScript("c", "mystory", 3),
    ];
    const entries = groupScriptsIntoGalleryEntries(scripts);
    expect(entries).toHaveLength(1);
    const group = entries[0] as PublicSeriesGroup;
    expect(group.scripts).toHaveLength(3);
  });

  it("empty series name → treated as solo script", () => {
    const scripts = [
      makeScript({ id: "a", series: { name: "" } }),
      makeScript({ id: "b" }),
    ];
    const entries = groupScriptsIntoGalleryEntries(scripts);
    expect(entries).toHaveLength(2);
    expect(entries.every((e) => e.type === "script")).toBe(true);
  });
});

// ─── chapter ordering ─────────────────────────────────────────────────────────

describe("groupScriptsIntoGalleryEntries — chapter ordering", () => {
  it("chapters sorted by seriesOrder ascending", () => {
    const scripts = [
      seriesScript("c", "S", 3),
      seriesScript("a", "S", 1),
      seriesScript("b", "S", 2),
    ];
    const entries = groupScriptsIntoGalleryEntries(scripts);
    const group = entries[0] as PublicSeriesGroup;
    expect(group.scripts.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("chapters without seriesOrder sorted after ordered ones", () => {
    const scripts = [
      seriesScript("x", "S", null, 5000),
      seriesScript("y", "S", null, 3000),
      seriesScript("a", "S", 1),
      seriesScript("b", "S", 2),
    ];
    const entries = groupScriptsIntoGalleryEntries(scripts);
    const group = entries[0] as PublicSeriesGroup;
    const ids = group.scripts.map((s) => s.id);
    expect(ids.indexOf("a")).toBeLessThan(ids.indexOf("x"));
    expect(ids.indexOf("b")).toBeLessThan(ids.indexOf("x"));
    // unordered sorted by updatedAt desc
    expect(ids.indexOf("x")).toBeLessThan(ids.indexOf("y"));
  });

  it("same order → sorted by updatedAt descending", () => {
    const scripts = [
      seriesScript("old", "S", 1, 1000),
      seriesScript("new", "S", 1, 9000),
    ];
    const entries = groupScriptsIntoGalleryEntries(scripts);
    const group = entries[0] as PublicSeriesGroup;
    expect(group.scripts[0].id).toBe("new");
  });
});

// ─── leadScript / latestScript ────────────────────────────────────────────────

describe("leadScript and latestScript", () => {
  it("leadScript = lowest seriesOrder", () => {
    const scripts = [
      seriesScript("a", "S", 3, 9000),
      seriesScript("b", "S", 1, 1000),
      seriesScript("c", "S", 2, 5000),
    ];
    const group = groupScriptsIntoGalleryEntries(scripts)[0] as PublicSeriesGroup;
    expect(group.leadScript.id).toBe("b");
  });

  it("latestScript = highest updatedAt", () => {
    const scripts = [
      seriesScript("a", "S", 1, 1000),
      seriesScript("b", "S", 2, 9000),
      seriesScript("c", "S", 3, 5000),
    ];
    const group = groupScriptsIntoGalleryEntries(scripts)[0] as PublicSeriesGroup;
    expect(group.latestScript.id).toBe("b");
  });

  it("updatedAt derived from latestScript timestamp", () => {
    const scripts = [
      seriesScript("a", "S", 1, 1000),
      seriesScript("b", "S", 2, 9000),
    ];
    const group = groupScriptsIntoGalleryEntries(scripts)[0] as PublicSeriesGroup;
    expect(group.updatedAt).toBe(9000);
  });
});

// ─── age gate aggregation ─────────────────────────────────────────────────────

describe("hasAgeGate", () => {
  it("series with no adult scripts → hasAgeGate false", () => {
    const scripts = [
      seriesScript("a", "S", 1),
      seriesScript("b", "S", 2),
    ];
    const group = groupScriptsIntoGalleryEntries(scripts)[0] as PublicSeriesGroup;
    expect(group.hasAgeGate).toBe(false);
  });

  it("series with one adult script → hasAgeGate true", () => {
    const scripts = [
      seriesScript("a", "S", 1),
      seriesScript("b", "S", 2, 1000, ["R-18"]),
    ];
    const group = groupScriptsIntoGalleryEntries(scripts)[0] as PublicSeriesGroup;
    expect(group.hasAgeGate).toBe(true);
  });
});

// ─── deriveAggregateAgeGate ───────────────────────────────────────────────────

describe("deriveAggregateAgeGate", () => {
  it("no adult tags → false", () => {
    const scripts = [makeScript({ id: "a" }), makeScript({ id: "b" })];
    expect(deriveAggregateAgeGate(scripts)).toBe(false);
  });

  it("one adult tag → true", () => {
    const scripts = [
      makeScript({ id: "a" }),
      makeScript({ id: "b", tags: ["成人向"] }),
    ];
    expect(deriveAggregateAgeGate(scripts)).toBe(true);
  });

  it("R-18 tag → true", () => {
    const scripts = [makeScript({ id: "a", tags: ["R-18"] })];
    expect(deriveAggregateAgeGate(scripts)).toBe(true);
  });
});

// ─── deriveSeriesChapterOrder ─────────────────────────────────────────────────

describe("deriveSeriesChapterOrder", () => {
  it("sorts by seriesOrder then updatedAt", () => {
    const scripts = [
      makeScript({ id: "c", series: { name: "S" }, seriesOrder: 3, lastModified: 1000 }),
      makeScript({ id: "a", series: { name: "S" }, seriesOrder: 1, lastModified: 1000 }),
      makeScript({ id: "b", series: { name: "S" }, seriesOrder: 2, lastModified: 1000 }),
    ];
    const sorted = deriveSeriesChapterOrder(scripts.map((s) => enrichScript(s)));
    expect(sorted.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("null order → sorted last", () => {
    const a = enrichScript(makeScript({ id: "a", series: { name: "S" }, seriesOrder: 1 }));
    const z = enrichScript(makeScript({ id: "z", series: { name: "S" }, lastModified: 9000 }));
    const sorted = deriveSeriesChapterOrder([z, a]);
    expect(sorted[0].id).toBe("a");
    expect(sorted[1].id).toBe("z");
  });
});

// ─── entry ordering preservation ──────────────────────────────────────────────

describe("entry order", () => {
  it("preserves first-seen order for series vs solo", () => {
    const scripts = [
      makeScript({ id: "solo-first" }),
      seriesScript("s1", "MySeries", 1),
      seriesScript("s2", "MySeries", 2),
      makeScript({ id: "solo-last" }),
    ];
    const entries = groupScriptsIntoGalleryEntries(scripts);
    expect(entries[0].type).toBe("script");
    if (entries[0].type === "script") expect(entries[0].script.id).toBe("solo-first");
    expect(entries[1].type).toBe("series");
    expect(entries[2].type).toBe("script");
    if (entries[2].type === "script") expect(entries[2].script.id).toBe("solo-last");
  });
});
