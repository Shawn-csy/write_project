import { describe, it, expect } from "vitest";
import { parseScreenplay } from "./screenplayAST";
import { buildViewerRenderBlocks, buildRawRenderBlocks } from "./viewerRenderPipeline";
import type { CharacterBlock } from "@write/script-engine";

const configs = [
  { id: "char", start: "角色 ", matchMode: "prefix", parseAs: "character", mapFields: { text: "$text" } },
  { id: "diag", start: "#D ", matchMode: "prefix", parseAs: "dialogue", mapFields: { text: "$text" } },
] as const;

const SCRIPT = `角色 Amy\n#D 你好。\n角色 Bob\n#D 再見。\n一段動作。`.trim();

function getAst() {
  return parseScreenplay(SCRIPT, configs).ast;
}

describe("buildViewerRenderBlocks", () => {
  it("returns base blocks when no filter options", () => {
    const blocks = buildViewerRenderBlocks(getAst(), configs);
    expect(blocks.length).toBeGreaterThan(0);
    const kinds = blocks.map((b) => b.kind);
    expect(kinds).toContain("character");
    expect(kinds).toContain("dialogue");
    expect(kinds).toContain("action");
  });

  it("normalises __ALL__ sentinel to no-filter", () => {
    const all = buildViewerRenderBlocks(getAst(), configs);
    const sentinel = buildViewerRenderBlocks(getAst(), configs, { filterCharacter: "__ALL__" });
    expect(sentinel.length).toBe(all.length);
  });

  it("normalises empty string to no-filter", () => {
    const all = buildViewerRenderBlocks(getAst(), configs);
    const empty = buildViewerRenderBlocks(getAst(), configs, { filterCharacter: "" });
    expect(empty.length).toBe(all.length);
  });

  it("filters to Amy only when filterCharacter='Amy'", () => {
    const blocks = buildViewerRenderBlocks(getAst(), configs, { filterCharacter: "Amy" });
    const chars = blocks.filter((b) => b.kind === "character") as CharacterBlock[];
    expect(chars.every((c) => c.text.toLowerCase() === "amy")).toBe(true);
    expect(chars.some((c) => c.text.toLowerCase() === "bob")).toBe(false);
  });

  it("retains action blocks when filterCharacter is set", () => {
    const blocks = buildViewerRenderBlocks(getAst(), configs, { filterCharacter: "Amy" });
    expect(blocks.some((b) => b.kind === "action")).toBe(true);
  });

  it("normalises raw markerConfigs array internally (no crash)", () => {
    const rawConfigs = [
      { id: "char", start: "角色 ", matchMode: "prefix", parseAs: "character" },
    ];
    expect(() => buildViewerRenderBlocks(getAst(), rawConfigs)).not.toThrow();
  });

  it("handles empty markerConfigs", () => {
    const blocks = buildViewerRenderBlocks(getAst(), []);
    expect(blocks.length).toBeGreaterThan(0);
  });
});

describe("buildRawRenderBlocks", () => {
  it("returns unfiltered base blocks regardless of any prior filtering", () => {
    const raw = buildRawRenderBlocks(getAst(), configs);
    const chars = raw.filter((b) => b.kind === "character") as CharacterBlock[];
    // both characters present
    expect(chars.some((c) => c.text.toLowerCase() === "amy")).toBe(true);
    expect(chars.some((c) => c.text.toLowerCase() === "bob")).toBe(true);
  });

  it("blocks have no visibility annotation (plain RenderBlock[])", () => {
    const raw = buildRawRenderBlocks(getAst(), configs) as (CharacterBlock & { visibility?: unknown })[];
    expect(raw.every((b) => b.visibility === undefined)).toBe(true);
  });
});
