import { describe, expect, it } from "vitest";
import { buildMarkerSample, findMarkerMatchLines } from "./markerMatchPreview";

const sample = ["#C 小雨", "#D （喘氣）末班車呢？", ">>SE 雨聲", "#D 剛走。【回音】", "<<SE", "旁白"].join("\n");

describe("findMarkerMatchLines", () => {
  it("matches prefix rules at the start of a line", () => {
    expect(findMarkerMatchLines(sample, { matchMode: "prefix", start: "#D" })).toEqual([2, 4]);
  });

  it("matches enclosure rules only when both symbols appear in order", () => {
    expect(findMarkerMatchLines(sample, { matchMode: "enclosure", start: "【", end: "】" })).toEqual([4]);
    expect(findMarkerMatchLines("】反了【", { matchMode: "enclosure", start: "【", end: "】" })).toEqual([]);
  });

  it("covers every line between range symbols, including nested ranges", () => {
    expect(findMarkerMatchLines(sample, { matchMode: "range", start: ">>SE", end: "<<SE" })).toEqual([3, 4, 5]);
    const nested = [">>A", ">>A", "x", "<<A", "y", "<<A", "z"].join("\n");
    expect(findMarkerMatchLines(nested, { matchMode: "range", start: ">>A", end: "<<A" })).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it("uses the regex per line and ignores invalid patterns", () => {
    expect(findMarkerMatchLines(sample, { matchMode: "regex", regex: "^#C" })).toEqual([1]);
    expect(findMarkerMatchLines(sample, { matchMode: "regex", regex: "(" })).toEqual([]);
  });

  it("returns nothing for incomplete rules", () => {
    expect(findMarkerMatchLines(sample, { matchMode: "prefix", start: "" })).toEqual([]);
    expect(findMarkerMatchLines(sample, null)).toEqual([]);
  });
});

describe("buildMarkerSample", () => {
  it("produces a snippet the rule itself would match", () => {
    for (const config of [
      { matchMode: "prefix" as const, start: "#SE", label: "門鈴" },
      { matchMode: "enclosure" as const, start: "（", end: "）", label: "小聲" },
      { matchMode: "range" as const, start: ">>BG", end: "<<BG", label: "雨" },
    ]) {
      const snippet = buildMarkerSample(config);
      expect(findMarkerMatchLines(snippet, config).length).toBeGreaterThan(0);
    }
    expect(buildMarkerSample({ matchMode: "regex", regex: "x" })).toBe("");
  });
});
