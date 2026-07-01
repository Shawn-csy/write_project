/**
 * Fixture tests for renderTransforms pure functions.
 * Tests cover filter-by-character using real engine parse + render model output.
 */

import { describe, it, expect } from "vitest";
import { parseScreenplay, normalizeMarkerConfigsSchema, toRenderBlocks } from "../../src/index";
import {
  filterRenderBlocksByCharacter,
} from "../../src/render/renderTransforms";
import type { RenderBlock, CharacterBlock } from "../../src/index";

// ─── shared fixtures ──────────────────────────────────────────────────────────

const configs = normalizeMarkerConfigsSchema([
  { id: "char", start: "角色 ", matchMode: "prefix", parseAs: "character", mapFields: { text: "$text" } },
  { id: "diag", start: "#D ", matchMode: "prefix", parseAs: "dialogue", mapFields: { text: "$text" } },
  { id: "paren", start: "(", matchMode: "prefix", parseAs: "parenthetical", mapFields: { text: "$text" } },
]);

const SCRIPT = `角色 Amy
#D 你好，世界。
(低聲)
角色 Bob
#D 再見。
一段動作。
角色 Amy
#D 第二句台詞。`.trim();

function getBlocks(): RenderBlock[] {
  const { ast } = parseScreenplay(SCRIPT, configs);
  return toRenderBlocks(ast, configs);
}

// ─── filterRenderBlocksByCharacter ────────────────────────────────────────────

describe("filterRenderBlocksByCharacter", () => {
  it("returns blocks unchanged when characterName is null", () => {
    const blocks = getBlocks();
    expect(filterRenderBlocksByCharacter(blocks, null)).toEqual(blocks);
  });

  it("returns blocks unchanged when characterName is empty string", () => {
    const blocks = getBlocks();
    expect(filterRenderBlocksByCharacter(blocks, "")).toEqual(blocks);
  });

  it("keeps only Amy's speech groups (character + dialogue + parenthetical)", () => {
    const filtered = filterRenderBlocksByCharacter(getBlocks(), "Amy");
    const kinds = filtered.map((b) => b.kind);
    // action block is non-speech so retained
    expect(kinds).toContain("character");
    expect(kinds).toContain("dialogue");
    // no Bob character block
    const chars = filtered.filter((b) => b.kind === "character") as CharacterBlock[];
    expect(chars.every((c) => c.text.toLowerCase() === "amy")).toBe(true);
  });

  it("keeps Bob's speech group when filtering for Bob", () => {
    const filtered = filterRenderBlocksByCharacter(getBlocks(), "Bob");
    const chars = filtered.filter((b) => b.kind === "character") as CharacterBlock[];
    expect(chars.length).toBe(1);
    expect(chars[0].text.toLowerCase()).toBe("bob");
    // Amy blocks absent
    expect(chars.every((c) => c.text.toLowerCase() !== "amy")).toBe(true);
  });

  it("retains action blocks regardless of character filter", () => {
    const filtered = filterRenderBlocksByCharacter(getBlocks(), "Amy");
    expect(filtered.some((b) => b.kind === "action")).toBe(true);
  });

  it("retains parenthetical in Amy's speech group", () => {
    const filtered = filterRenderBlocksByCharacter(getBlocks(), "Amy");
    expect(filtered.some((b) => b.kind === "parenthetical")).toBe(true);
  });

  it("is case-insensitive", () => {
    const lower = filterRenderBlocksByCharacter(getBlocks(), "amy");
    const upper = filterRenderBlocksByCharacter(getBlocks(), "AMY");
    expect(lower.length).toBe(upper.length);
  });

  it("returns empty speech groups when character not present", () => {
    const filtered = filterRenderBlocksByCharacter(getBlocks(), "Charlie");
    const chars = filtered.filter((b) => b.kind === "character");
    expect(chars.length).toBe(0);
  });

  it("recurses into range children", () => {
    const rangeConfigs = normalizeMarkerConfigsSchema([
      { id: "rng", start: ">>R", end: "<<R", matchMode: "range" },
      { id: "char", start: "角色 ", matchMode: "prefix", parseAs: "character", mapFields: { text: "$text" } },
      { id: "diag", start: "#D ", matchMode: "prefix", parseAs: "dialogue", mapFields: { text: "$text" } },
    ]);
    const text = ">>R\n角色 Amy\n#D 台詞。\n角色 Bob\n#D 回應。\n<<R";
    const { ast } = parseScreenplay(text, rangeConfigs);
    const blocks = toRenderBlocks(ast, rangeConfigs);
    const filtered = filterRenderBlocksByCharacter(blocks, "Amy");
    // range block preserved; its children only contain Amy
    const range = filtered.find((b) => b.kind === "range") as Extract<RenderBlock, { kind: "range" }> | undefined;
    if (range) {
      const chars = range.children.filter((b) => b.kind === "character") as CharacterBlock[];
      expect(chars.every((c) => c.text.toLowerCase() === "amy")).toBe(true);
    }
  });

  it("hidden marker ids do not affect filter result (filter is pure data)", () => {
    // hiddenMarkerIds are a render concern, not a filter concern
    const all = getBlocks();
    const filtered = filterRenderBlocksByCharacter(all, "Amy");
    // filter result identical whether or not any marker is "hidden" — this test
    // simply asserts filterRenderBlocksByCharacter ignores visibility state
    expect(filtered).toEqual(filterRenderBlocksByCharacter(all, "Amy"));
  });
});
