import { describe, expect, it } from "vitest";
import {
  enrichScript,
  filterGalleryScripts,
  buildFeaturedSeries,
  deriveTags,
  deriveSimpleLicenseTags,
  isLicenseShortcutTag,
  SEGMENT_KEYS,
  RESERVED_SEGMENT_TAGS,
} from "../gallery/filterModel";
import type { EnrichedGalleryScript, GalleryScriptInput } from "../gallery/filterModel";

// ─── Fixtures ────────────────────────────────────────────────────────────────

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

// ─── deriveSimpleLicenseTags ─────────────────────────────────────────────────

describe("deriveSimpleLicenseTags", () => {
  it("returns empty for empty input", () => {
    expect(deriveSimpleLicenseTags()).toEqual([]);
  });

  it("maps allow → 授權:可商用", () => {
    expect(deriveSimpleLicenseTags({ commercialUse: "allow" })).toContain("授權:可商用");
  });

  it("maps disallow → 授權:不可商用", () => {
    expect(deriveSimpleLicenseTags({ commercialUse: "disallow" })).toContain("授權:不可商用");
  });

  it("maps limited derivative → 授權:限定改作", () => {
    expect(deriveSimpleLicenseTags({ derivativeUse: "limited" })).toContain("授權:限定改作");
  });

  it("maps notify required (raw string) → 授權:修改需告知", () => {
    expect(deriveSimpleLicenseTags({ notifyOnModify: "true" })).toContain("授權:修改需告知");
    expect(deriveSimpleLicenseTags({ notifyOnModify: "required" })).toContain("授權:修改需告知");
    expect(deriveSimpleLicenseTags({ notifyOnModify: "需告知" })).toContain("授權:修改需告知");
  });

  it("maps notify not-required (raw string) → 授權:修改免告知", () => {
    expect(deriveSimpleLicenseTags({ notifyOnModify: "false" })).toContain("授權:修改免告知");
    expect(deriveSimpleLicenseTags({ notifyOnModify: "no" })).toContain("授權:修改免告知");
    expect(deriveSimpleLicenseTags({ notifyOnModify: "optional" })).toContain("授權:修改免告知");
    expect(deriveSimpleLicenseTags({ notifyOnModify: "無需告知" })).toContain("授權:修改免告知");
  });
});

// ─── RESERVED_SEGMENT_TAGS ───────────────────────────────────────────────────

describe("RESERVED_SEGMENT_TAGS", () => {
  it("contains segment tag names (lowercased)", () => {
    expect(RESERVED_SEGMENT_TAGS.has("成人向")).toBe(true);
    expect(RESERVED_SEGMENT_TAGS.has("全年齡向")).toBe(true);
    expect(RESERVED_SEGMENT_TAGS.has("男性向")).toBe(true);
    expect(RESERVED_SEGMENT_TAGS.has("女性向")).toBe(true);
  });
});

// ─── enrichScript ────────────────────────────────────────────────────────────

describe("enrichScript – license derivation", () => {
  it("derives license tags from top-level fields", () => {
    const s = enrichScript(makeScript({ licenseCommercial: "allow", licenseDerivative: "disallow" }));
    expect(s._derivedLicenseTags).toContain("授權:可商用");
    expect(s._derivedLicenseTags).toContain("授權:不可改作");
    expect(s._allowCommercial).toBe(true);
  });

  it("falls back to persona default when script has no license", () => {
    const s = enrichScript(makeScript({
      persona: {
        defaultLicenseCommercial: "allow",
        defaultLicenseDerivative: "disallow",
        defaultLicenseNotify: "required",
      },
    }));
    expect(s._allowCommercial).toBe(true);
    expect(s._derivedLicenseTags).toContain("授權:可商用");
    expect(s._derivedLicenseTags).toContain("授權:不可改作");
    expect(s._derivedLicenseTags).toContain("授權:修改需告知");
  });

  it("prefers customMetadata license over persona default", () => {
    const s = enrichScript(makeScript({
      customMetadata: [{ key: "LicenseCommercial", value: "disallow", type: "text" }],
      persona: { defaultLicenseCommercial: "allow" },
    }));
    expect(s._allowCommercial).toBe(false);
  });

  it("prefers top-level licenseCommercial over persona default", () => {
    const s = enrichScript(makeScript({
      licenseCommercial: "disallow",
      persona: { defaultLicenseCommercial: "allow" },
    }));
    expect(s._allowCommercial).toBe(false);
  });

  it("_allowCommercial is false when no license set anywhere", () => {
    const s = enrichScript(makeScript({ persona: null }));
    expect(s._allowCommercial).toBe(false);
  });

  it("license tags appear in _searchLicenseText", () => {
    const s = enrichScript(makeScript({
      persona: {
        defaultLicenseCommercial: "allow",
        defaultLicenseDerivative: "disallow",
        defaultLicenseNotify: "required",
      },
    }));
    expect(s._searchLicenseText).toContain("授權:可商用");
    expect(s._searchLicenseText).toContain("授權:不可改作");
    expect(s._searchLicenseText).toContain("授權:修改需告知");
  });
});

describe("enrichScript – author override", () => {
  it("uses override author when authordisplaymode=override", () => {
    const s = enrichScript(makeScript({
      customMetadata: [
        { key: "author", value: "Override Name", type: "text" },
        { key: "authorDisplayMode", value: "override", type: "text" },
      ],
      author: { displayName: "Real Author", id: "real" },
    }));
    expect((s.author as { displayName: string }).displayName).toBe("Override Name");
    expect(s._disableAuthorLink).toBe(true);
  });

  it("keeps real author when authordisplaymode is not override", () => {
    const s = enrichScript(makeScript({
      author: { displayName: "Real Author", id: "real" },
    }));
    expect((s.author as { displayName: string }).displayName).toBe("Real Author");
    expect(s._disableAuthorLink).toBe(false);
  });
});

describe("enrichScript – series", () => {
  it("normalizes series from script.series.name", () => {
    const s = enrichScript(makeScript({ series: { name: "My Series" } }));
    expect(s._seriesName).toBe("My Series");
  });

  it("normalizes series from customMetadata", () => {
    const s = enrichScript(makeScript({
      customMetadata: [{ key: "series", value: "Meta Series", type: "text" }],
    }));
    expect(s._seriesName).toBe("Meta Series");
  });

  it("parses seriesOrder", () => {
    const s = enrichScript(makeScript({ seriesOrder: 3 }));
    expect(s._seriesOrder).toBe(3);
  });
});

describe("enrichScript – tag merging", () => {
  it("merges tags array with derived license tags", () => {
    const s = enrichScript(makeScript({
      tags: ["奇幻"],
      licenseCommercial: "allow",
    }));
    expect(s.tags).toContain("奇幻");
    expect(s.tags).toContain("授權:可商用");
  });

  it("tagSetLower contains lowercased tags", () => {
    const s = enrichScript(makeScript({ tags: ["奇幻", "R-18"] }));
    expect(s._tagSetLower.has("r-18")).toBe(true);
    expect(s._tagSetLower.has("奇幻")).toBe(true);
  });

  it("deduplicates tags", () => {
    const s = enrichScript(makeScript({
      tags: ["奇幻", "奇幻"],
      licenseCommercial: "allow",
    }));
    const count = s.tags.filter((t) => t === "奇幻").length;
    expect(count).toBe(1);
  });
});

describe("enrichScript – search fields", () => {
  it("lowercases _searchTitle", () => {
    const s = enrichScript(makeScript({ title: "Magic Script" }));
    expect(s._searchTitle).toBe("magic script");
  });

  it("_searchAuthor from author.displayName", () => {
    const s = enrichScript(makeScript({ author: { displayName: "Author Name" } }));
    expect(s._searchAuthor).toBe("author name");
  });
});

// ─── filterGalleryScripts ─────────────────────────────────────────────────────

describe("filterGalleryScripts", () => {
  const enrich = (s: GalleryScriptInput) => enrichScript(s);

  it("searchNeedle matches title", () => {
    const scripts: EnrichedGalleryScript[] = [
      enrich(makeScript({ id: "s1", title: "Magic Fantasy" })),
      enrich(makeScript({ id: "s2", title: "Horror Story" })),
    ];
    const result = filterGalleryScripts(scripts, {
      searchNeedle: "magic",
      selectedTags: [],
      segmentFilter: SEGMENT_KEYS.all,
      usageFilter: "all",
    });
    expect(result.map((s) => s.id)).toEqual(["s1"]);
  });

  it("searchNeedle matches author", () => {
    const scripts = [
      enrich(makeScript({ id: "s1", author: { displayName: "Alice" } })),
      enrich(makeScript({ id: "s2", author: { displayName: "Bob" } })),
    ];
    const result = filterGalleryScripts(scripts, {
      searchNeedle: "alice",
      selectedTags: [],
      segmentFilter: SEGMENT_KEYS.all,
      usageFilter: "all",
    });
    expect(result.map((s) => s.id)).toEqual(["s1"]);
  });

  it("searchNeedle matches license text", () => {
    const scripts = [
      enrich(makeScript({ id: "s1", licenseCommercial: "allow" })),
      enrich(makeScript({ id: "s2" })),
    ];
    const result = filterGalleryScripts(scripts, {
      searchNeedle: "可商用",
      selectedTags: [],
      segmentFilter: SEGMENT_KEYS.all,
      usageFilter: "all",
    });
    expect(result.map((s) => s.id)).toContain("s1");
    expect(result.map((s) => s.id)).not.toContain("s2");
  });

  it("usageFilter=commercial keeps only _allowCommercial=true", () => {
    const scripts = [
      enrich(makeScript({ id: "s1", licenseCommercial: "allow" })),
      enrich(makeScript({ id: "s2", licenseCommercial: "disallow" })),
      enrich(makeScript({ id: "s3", persona: { defaultLicenseCommercial: "allow" } })),
    ];
    const result = filterGalleryScripts(scripts, {
      searchNeedle: "",
      selectedTags: [],
      segmentFilter: SEGMENT_KEYS.all,
      usageFilter: "commercial",
    });
    const ids = result.map((s) => s.id);
    expect(ids).toContain("s1");
    expect(ids).not.toContain("s2");
    expect(ids).toContain("s3");
  });

  it("segmentFilter=adult keeps scripts with 成人向 tag", () => {
    const scripts = [
      enrich(makeScript({ id: "adult", tags: ["成人向"] })),
      enrich(makeScript({ id: "general", tags: ["奇幻"] })),
    ];
    const result = filterGalleryScripts(scripts, {
      searchNeedle: "",
      selectedTags: [],
      segmentFilter: SEGMENT_KEYS.adult,
      usageFilter: "all",
    });
    const ids = result.map((s) => s.id);
    expect(ids).toContain("adult");
    expect(ids).not.toContain("general");
  });

  it("segmentFilter=adult also matches R-18 alias", () => {
    const scripts = [
      enrich(makeScript({ id: "r18", tags: ["R-18"] })),
    ];
    const result = filterGalleryScripts(scripts, {
      searchNeedle: "",
      selectedTags: [],
      segmentFilter: SEGMENT_KEYS.adult,
      usageFilter: "all",
    });
    expect(result[0].id).toBe("r18");
  });

  it("segmentFilter=all-ages keeps scripts with 全年齡向", () => {
    const scripts = [
      enrich(makeScript({ id: "s1", tags: ["全年齡向"] })),
      enrich(makeScript({ id: "s2", tags: ["成人向"] })),
    ];
    const result = filterGalleryScripts(scripts, {
      searchNeedle: "",
      selectedTags: [],
      segmentFilter: SEGMENT_KEYS.allAges,
      usageFilter: "all",
    });
    const ids = result.map((s) => s.id);
    expect(ids).toContain("s1");
    expect(ids).not.toContain("s2");
  });

  it("selectedTags filters by tag match (OR within scripts, AND across selected)", () => {
    const scripts = [
      enrich(makeScript({ id: "s1", tags: ["奇幻", "愛情"] })),
      enrich(makeScript({ id: "s2", tags: ["奇幻"] })),
      enrich(makeScript({ id: "s3", tags: ["愛情"] })),
      enrich(makeScript({ id: "s4", tags: ["科幻"] })),
    ];
    // selectedTags is OR: any selected tag match = include
    const result = filterGalleryScripts(scripts, {
      searchNeedle: "",
      selectedTags: ["奇幻"],
      segmentFilter: SEGMENT_KEYS.all,
      usageFilter: "all",
    });
    const ids = result.map((s) => s.id);
    expect(ids).toContain("s1");
    expect(ids).toContain("s2");
    expect(ids).not.toContain("s4");
  });

  it("sorts results by lastModified descending", () => {
    const scripts = [
      enrich(makeScript({ id: "s1", lastModified: 100 })),
      enrich(makeScript({ id: "s2", lastModified: 300 })),
      enrich(makeScript({ id: "s3", lastModified: 200 })),
    ];
    const result = filterGalleryScripts(scripts, {
      searchNeedle: "",
      selectedTags: [],
      segmentFilter: SEGMENT_KEYS.all,
      usageFilter: "all",
    });
    expect(result.map((s) => s.id)).toEqual(["s2", "s3", "s1"]);
  });
});

// ─── buildFeaturedSeries ──────────────────────────────────────────────────────

describe("buildFeaturedSeries", () => {
  it("groups scripts by seriesName", () => {
    const scripts = [
      enrichScript(makeScript({ id: "s1", series: { name: "Series A" } })),
      enrichScript(makeScript({ id: "s2", series: { name: "Series A" } })),
      enrichScript(makeScript({ id: "s3", series: { name: "Series B" } })),
    ];
    const result = buildFeaturedSeries(scripts);
    const names = result.map((s) => s.name);
    expect(names).toContain("Series A");
    expect(names).toContain("Series B");
  });

  it("sets count correctly", () => {
    const scripts = [
      enrichScript(makeScript({ id: "s1", series: { name: "Series A" } })),
      enrichScript(makeScript({ id: "s2", series: { name: "Series A" } })),
    ];
    const result = buildFeaturedSeries(scripts);
    expect(result.find((s) => s.name === "Series A")!.count).toBe(2);
  });

  it("sorts series by totalViews descending", () => {
    const scripts = [
      enrichScript(makeScript({ id: "s1", series: { name: "Low" }, views: 10 })),
      enrichScript(makeScript({ id: "s2", series: { name: "High" }, views: 100 })),
    ];
    const result = buildFeaturedSeries(scripts);
    expect(result[0].name).toBe("High");
  });

  it("sorts scripts within series by seriesOrder", () => {
    const scripts = [
      enrichScript(makeScript({ id: "s3", series: { name: "S" }, seriesOrder: 3 })),
      enrichScript(makeScript({ id: "s1", series: { name: "S" }, seriesOrder: 1 })),
      enrichScript(makeScript({ id: "s2", series: { name: "S" }, seriesOrder: 2 })),
    ];
    const result = buildFeaturedSeries(scripts);
    const ids = result[0].scripts.map((s) => s.id);
    expect(ids).toEqual(["s1", "s2", "s3"]);
  });

  it("ignores scripts without series", () => {
    const scripts = [
      enrichScript(makeScript({ id: "s1" })),
      enrichScript(makeScript({ id: "s2", series: { name: "S" } })),
    ];
    const result = buildFeaturedSeries(scripts);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("S");
  });

  it("respects maxCount", () => {
    const scripts = Array.from({ length: 15 }, (_, i) =>
      enrichScript(makeScript({ id: `s${i}`, series: { name: `Series ${i}` } }))
    );
    const result = buildFeaturedSeries(scripts, 5);
    expect(result.length).toBe(5);
  });
});

// ─── isLicenseShortcutTag ─────────────────────────────────────────────────────

describe("isLicenseShortcutTag", () => {
  it("returns true for 授權: prefix", () => {
    expect(isLicenseShortcutTag("授權:可商用")).toBe(true);
    expect(isLicenseShortcutTag("授權:不可改作")).toBe(true);
  });

  it("returns false for non-license tags", () => {
    expect(isLicenseShortcutTag("奇幻")).toBe(false);
    expect(isLicenseShortcutTag("成人向")).toBe(false);
    expect(isLicenseShortcutTag("")).toBe(false);
  });
});

// ─── deriveTags ───────────────────────────────────────────────────────────────

// ─── enrichScript – _cardSummary and _hoverOutline ───────────────────────────

describe("enrichScript – _cardSummary", () => {
  it("uses synopsis field directly", () => {
    const s = enrichScript(makeScript({ synopsis: "Short summary" }));
    expect(s._cardSummary).toBe("Short summary");
  });

  it("falls back to customMetadata synopsis", () => {
    const s = enrichScript(makeScript({
      customMetadata: [{ key: "synopsis", value: "Meta summary", type: "text" }],
    }));
    expect(s._cardSummary).toBe("Meta summary");
  });

  it("falls back to customMetadata summary", () => {
    const s = enrichScript(makeScript({
      customMetadata: [{ key: "summary", value: "Summary text", type: "text" }],
    }));
    expect(s._cardSummary).toBe("Summary text");
  });

  it("is empty string when no synopsis-like field present", () => {
    const s = enrichScript(makeScript({ customMetadata: [] }));
    expect(s._cardSummary).toBe("");
  });

  it("synopsis field wins over customMetadata synopsis", () => {
    const s = enrichScript(makeScript({
      synopsis: "Top-level wins",
      customMetadata: [{ key: "synopsis", value: "Meta synopsis", type: "text" }],
    }));
    expect(s._cardSummary).toBe("Top-level wins");
  });
});

describe("enrichScript – _hoverOutline", () => {
  it("uses outline field directly", () => {
    const s = enrichScript(makeScript({ outline: "Detailed outline" }));
    expect(s._hoverOutline).toBe("Detailed outline");
  });

  it("falls back to customMetadata outline", () => {
    const s = enrichScript(makeScript({
      customMetadata: [{ key: "outline", value: "Meta outline", type: "text" }],
    }));
    expect(s._hoverOutline).toBe("Meta outline");
  });

  it("falls back to customMetadata 大綱", () => {
    const s = enrichScript(makeScript({
      customMetadata: [{ key: "大綱", value: "大綱 text", type: "text" }],
    }));
    expect(s._hoverOutline).toBe("大綱 text");
  });

  it("is empty string when no outline-like field present", () => {
    const s = enrichScript(makeScript({ customMetadata: [] }));
    expect(s._hoverOutline).toBe("");
  });

  it("outline field wins over customMetadata outline", () => {
    const s = enrichScript(makeScript({
      outline: "Top-level outline",
      customMetadata: [{ key: "outline", value: "Meta outline", type: "text" }],
    }));
    expect(s._hoverOutline).toBe("Top-level outline");
  });
});

describe("deriveTags", () => {
  it("collects all tags excluding segment tags", () => {
    const scripts = [
      enrichScript(makeScript({ id: "s1", tags: ["奇幻", "成人向"] })),
      enrichScript(makeScript({ id: "s2", tags: ["愛情"] })),
    ];
    const { allTags } = deriveTags(scripts);
    expect(allTags).toContain("奇幻");
    expect(allTags).toContain("愛情");
    expect(allTags).not.toContain("成人向"); // reserved segment tag
  });

  it("collects license tag shortcuts", () => {
    const scripts = [
      enrichScript(makeScript({ id: "s1", licenseCommercial: "allow" })),
      enrichScript(makeScript({ id: "s2", licenseCommercial: "disallow" })),
    ];
    const { licenseTagShortcuts } = deriveTags(scripts);
    expect(licenseTagShortcuts).toContain("授權:可商用");
    expect(licenseTagShortcuts).toContain("授權:不可商用");
  });

  it("license tags from persona appear in shortcuts", () => {
    const scripts = [
      enrichScript(makeScript({ persona: { defaultLicenseCommercial: "allow" } })),
    ];
    const { licenseTagShortcuts } = deriveTags(scripts);
    expect(licenseTagShortcuts).toContain("授權:可商用");
  });

  it("does not include license tags in allTags — they appear only in licenseTagShortcuts", () => {
    // enrichScript merges license tags into script.tags; deriveTags must exclude them from allTags.
    const scripts = [
      enrichScript(makeScript({ licenseCommercial: "allow", tags: ["奇幻"] })),
    ];
    const { allTags, licenseTagShortcuts } = deriveTags(scripts);
    expect(licenseTagShortcuts).toContain("授權:可商用");
    expect(allTags).not.toContain("授權:可商用");
    expect(allTags).toContain("奇幻");
  });

  it("raw 授權: tag in script.tags routes to licenseTagShortcuts, not allTags", () => {
    // Edge case: author manually adds 授權:可商用 as a raw tag (not via licenseCommercial field).
    const scripts = [
      enrichScript(makeScript({ tags: ["授權:可商用", "奇幻"] })),
    ];
    const { allTags, licenseTagShortcuts } = deriveTags(scripts);
    expect(licenseTagShortcuts).toContain("授權:可商用");
    expect(allTags).not.toContain("授權:可商用");
    expect(allTags).toContain("奇幻");
  });

  it("deduplicates tags across scripts", () => {
    const scripts = [
      enrichScript(makeScript({ id: "s1", tags: ["奇幻"] })),
      enrichScript(makeScript({ id: "s2", tags: ["奇幻"] })),
    ];
    const { allTags } = deriveTags(scripts);
    expect(allTags.filter((t) => t === "奇幻").length).toBe(1);
  });
});
