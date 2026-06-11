import { describe, it, expect } from "vitest";
import {
  parseGalleryUrlState,
  serializeGalleryUrlState,
  serializeGalleryUrlStateToString,
  mergeGalleryUrlState,
  isDefaultGalleryUrlState,
  DEFAULT_URL_STATE,
  type PublicHomepageUrlState,
} from "../gallery/galleryUrlState";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parse(qs: string) {
  return parseGalleryUrlState(qs);
}

function serialize(state: PublicHomepageUrlState): string {
  return serializeGalleryUrlStateToString(state);
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

describe("parseGalleryUrlState — defaults", () => {
  it("empty string returns default state", () => {
    expect(parse("")).toEqual(DEFAULT_URL_STATE);
  });

  it("unknown view normalizes to 'scripts'", () => {
    expect(parse("view=xyz").view).toBe("scripts");
  });

  it("unknown segment normalizes to 'all'", () => {
    expect(parse("segment=bogus").segment).toBe("all");
  });

  it("unknown usage normalizes to 'all'", () => {
    expect(parse("usage=paid").usage).toBe("all");
  });

  it("unknown mode normalizes to 'standard'", () => {
    expect(parse("mode=huge").mode).toBe("standard");
  });
});

// ─── Valid values ─────────────────────────────────────────────────────────────

describe("parseGalleryUrlState — valid values", () => {
  it("view=authors", () => expect(parse("view=authors").view).toBe("authors"));
  it("view=orgs", () => expect(parse("view=orgs").view).toBe("orgs"));
  it("segment=adult", () => expect(parse("segment=adult").segment).toBe("adult"));
  it("segment=all-ages", () => expect(parse("segment=all-ages").segment).toBe("all-ages"));
  it("segment=male", () => expect(parse("segment=male").segment).toBe("male"));
  it("segment=female", () => expect(parse("segment=female").segment).toBe("female"));
  it("usage=commercial", () => expect(parse("usage=commercial").usage).toBe("commercial"));
  it("mode=compact", () => expect(parse("mode=compact").mode).toBe("compact"));
  it("unknown lane param is ignored (lane not in Phase 2 URL state)", () => {
    // lane is reserved for Phase 4; parsed state has no lane field
    const state = parse("lane=top");
    expect(state).not.toHaveProperty("lane");
  });
  it("q is trimmed", () => expect(parse("q=%20hello%20").q).toBe("hello"));
});

// ─── Tags ─────────────────────────────────────────────────────────────────────

describe("parseGalleryUrlState — tags", () => {
  it("single tag", () => {
    expect(parse("tag=foo").tags).toEqual(["foo"]);
  });

  it("multiple tags deduplicated and sorted", () => {
    expect(parse("tag=zoo&tag=alpha&tag=zoo").tags).toEqual(["alpha", "zoo"]);
  });

  it("empty tag values filtered", () => {
    expect(parse("tag=&tag=foo").tags).toEqual(["foo"]);
  });

  it("whitespace-only tags filtered", () => {
    expect(parse("tag=%20&tag=foo").tags).toEqual(["foo"]);
  });

  it("tags with surrounding whitespace are trimmed", () => {
    // %20Drama%20 → "Drama" after trim; matching and URL output stays clean
    expect(parse("tag=%20Drama%20").tags).toEqual(["Drama"]);
  });

  it("authorTag", () => {
    expect(parse("authorTag=writer").authorTags).toEqual(["writer"]);
  });

  it("orgTag", () => {
    expect(parse("orgTag=studio").orgTags).toEqual(["studio"]);
  });
});

// ─── Round trips ──────────────────────────────────────────────────────────────

describe("round trip — serialize then parse", () => {
  it("default state produces clean URL", () => {
    expect(serialize(DEFAULT_URL_STATE)).toBe("");
  });

  it("non-default state survives round trip", () => {
    const state: PublicHomepageUrlState = {
      view: "authors",
      tags: ["tag-b", "tag-a"],
      authorTags: ["voice"],
      orgTags: [],
      usage: "commercial",
      segment: "adult",
      mode: "compact",
      q: "search term",
    };
    const qs = serialize(state);
    const parsed = parse(qs.replace(/^\?/, ""));
    expect(parsed.view).toBe("authors");
    expect(parsed.tags).toEqual(["tag-a", "tag-b"]); // sorted
    expect(parsed.authorTags).toEqual(["voice"]);
    expect(parsed.orgTags).toEqual([]);
    expect(parsed.usage).toBe("commercial");
    expect(parsed.segment).toBe("adult");
    expect(parsed.mode).toBe("compact");
    expect(parsed.q).toBe("search term");
  });

  it("serialize omits default view", () => {
    const state = { ...DEFAULT_URL_STATE, q: "hello" };
    expect(serialize(state)).not.toContain("view=");
  });

  it("serialize omits default segment", () => {
    const state = { ...DEFAULT_URL_STATE, q: "x" };
    expect(serialize(state)).not.toContain("segment=");
  });

  it("serialize omits default usage", () => {
    const state = { ...DEFAULT_URL_STATE, mode: "compact" };
    expect(serialize(state)).not.toContain("usage=");
  });

  it("tags are sorted deterministically in output", () => {
    const qs1 = serialize({ ...DEFAULT_URL_STATE, tags: ["zoo", "alpha"] });
    const qs2 = serialize({ ...DEFAULT_URL_STATE, tags: ["alpha", "zoo"] });
    expect(qs1).toBe(qs2);
  });

  it("serialize normalizes dirty tag array: trim, dedupe, filter empty", () => {
    const qs = serialize({ ...DEFAULT_URL_STATE, tags: [" Drama ", "Drama", ""] });
    expect(qs).toBe("?tag=Drama");
  });
});

// ─── mergeGalleryUrlState ─────────────────────────────────────────────────────

describe("mergeGalleryUrlState", () => {
  it("partial patch preserves unchanged fields", () => {
    const base = { ...DEFAULT_URL_STATE, segment: "adult" } as PublicHomepageUrlState;
    const merged = mergeGalleryUrlState(base, { mode: "compact" });
    expect(merged.segment).toBe("adult");
    expect(merged.mode).toBe("compact");
  });

  it("invalid patch value normalizes to default", () => {
    const merged = mergeGalleryUrlState(DEFAULT_URL_STATE, { view: "invalid" as "scripts" });
    expect(merged.view).toBe("scripts");
  });

  it("tag deduplication in merge", () => {
    const merged = mergeGalleryUrlState(DEFAULT_URL_STATE, { tags: ["a", "a", "b"] });
    expect(merged.tags).toEqual(["a", "b"]);
  });
});

// ─── isDefaultGalleryUrlState ─────────────────────────────────────────────────

describe("isDefaultGalleryUrlState", () => {
  it("default state is default", () => {
    expect(isDefaultGalleryUrlState(DEFAULT_URL_STATE)).toBe(true);
  });

  it("non-default tag is not default", () => {
    expect(isDefaultGalleryUrlState({ ...DEFAULT_URL_STATE, tags: ["x"] })).toBe(false);
  });

  it("non-default view is not default", () => {
    expect(isDefaultGalleryUrlState({ ...DEFAULT_URL_STATE, view: "authors" })).toBe(false);
  });

  it("non-default q is not default", () => {
    expect(isDefaultGalleryUrlState({ ...DEFAULT_URL_STATE, q: "foo" })).toBe(false);
  });

  it("non-default segment is not default", () => {
    expect(isDefaultGalleryUrlState({ ...DEFAULT_URL_STATE, segment: "adult" })).toBe(false);
  });
});

// ─── URLSearchParams input ────────────────────────────────────────────────────

describe("parseGalleryUrlState — URLSearchParams input", () => {
  it("accepts URLSearchParams directly", () => {
    const params = new URLSearchParams("view=orgs&mode=compact");
    const state = parseGalleryUrlState(params);
    expect(state.view).toBe("orgs");
    expect(state.mode).toBe("compact");
  });
});
