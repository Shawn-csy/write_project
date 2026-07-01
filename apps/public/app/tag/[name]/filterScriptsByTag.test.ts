import { describe, it, expect } from "vitest";
import { filterScriptsByTag, scriptHasTag } from "./filterScriptsByTag";

describe("scriptHasTag", () => {
  it("matches object tag by name", () => {
    expect(scriptHasTag({ tags: [{ name: "Drama" }] }, "drama")).toBe(true);
  });

  it("matches string tag", () => {
    expect(scriptHasTag({ tags: ["Comedy"] }, "comedy")).toBe(true);
  });

  it("case-insensitive exact match", () => {
    expect(scriptHasTag({ tags: [{ name: "ACTION" }] }, "action")).toBe(true);
    expect(scriptHasTag({ tags: [{ name: "action" }] }, "ACTION")).toBe(true);
  });

  it("does not match partial", () => {
    expect(scriptHasTag({ tags: [{ name: "drama" }] }, "dram")).toBe(false);
  });

  it("returns false when no tags", () => {
    expect(scriptHasTag({}, "drama")).toBe(false);
    expect(scriptHasTag({ tags: [] }, "drama")).toBe(false);
  });
});

describe("filterScriptsByTag", () => {
  const scripts = [
    { id: "1", title: "A", tags: [{ name: "Drama" }] },
    { id: "2", title: "B", tags: [{ name: "Comedy" }, { name: "Romance" }] },
    { id: "3", title: "C", tags: [] },
    { id: "4", title: "D", tags: ["drama"] },
  ];

  it("returns matching scripts", () => {
    const result = filterScriptsByTag(scripts, "drama");
    expect(result.map((s) => s.id)).toEqual(["1", "4"]);
  });

  it("returns empty when no match", () => {
    expect(filterScriptsByTag(scripts, "thriller")).toHaveLength(0);
  });

  it("matches mixed string/object tags", () => {
    const result = filterScriptsByTag(scripts, "comedy");
    expect(result.map((s) => s.id)).toEqual(["2"]);
  });
});
