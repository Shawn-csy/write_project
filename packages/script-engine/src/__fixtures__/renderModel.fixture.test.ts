/**
 * Render model fixture tests — lock RenderBlock[] shape for canonical AST cases.
 * Same marker configs as engine.fixture.test.ts so parse + render are tested together.
 */

import { describe, it, expect } from "vitest";
import { parseScreenplay, normalizeMarkerConfigsSchema, toRenderBlocks } from "../../src/index";
import type { RenderBlock, TextBlock, RangeBlock, LayerBlock } from "../../src/index";

// ─── helpers ──────────────────────────────────────────────────────────────────

const kinds = (blocks: RenderBlock[]) => blocks.map((b) => b.kind);

// ─── fixture 1: default theme (no configs) ────────────────────────────────────

describe("renderModel: default theme", () => {
  const TEXT = `INT. 室內 - 白天
一個老人坐在椅子上。

角色甲
你好，世界。`.trim();

  const { ast } = parseScreenplay(TEXT);
  const blocks = toRenderBlocks(ast, []);

  it("produces blocks", () => {
    expect(blocks.length).toBeGreaterThan(0);
  });

  it("all blocks have known kinds", () => {
    const VALID_KINDS = new Set(["scene_heading", "character", "dialogue", "action", "parenthetical", "transition", "centered", "blank", "layer", "range", "unknown"]);
    blocks.forEach((b) => expect(VALID_KINDS.has(b.kind)).toBe(true));
  });

  it("no React or DOM properties", () => {
    const json = JSON.stringify(blocks);
    expect(json).not.toContain("createElement");
    expect(json).not.toContain("document");
  });
});

// ─── fixture 2: scene_heading + action ────────────────────────────────────────

describe("renderModel: scene_heading blocks", () => {
  const configs = normalizeMarkerConfigsSchema([
    { id: "scene", start: "INT.", matchMode: "prefix", parseAs: "scene_heading", mapFields: { text: "$text" } },
    { id: "scene_ext", start: "EXT.", matchMode: "prefix", parseAs: "scene_heading", mapFields: { text: "$text" } },
  ]);

  const TEXT = `INT. 室內 - 白天
動作描述。
EXT. 室外 - 夜晚
另一段動作。`.trim();

  const { ast } = parseScreenplay(TEXT, configs);
  const blocks = toRenderBlocks(ast, configs);

  it("has scene_heading blocks", () => {
    const scenes = blocks.filter((b) => b.kind === "scene_heading");
    expect(scenes.length).toBe(2);
  });

  it("scene_heading block has text", () => {
    const scene = blocks.find((b) => b.kind === "scene_heading") as { kind: string; text: string };
    expect(scene.text).toContain("室內");
  });

  it("action blocks have lines[][]", () => {
    const actions = blocks.filter((b) => b.kind === "action") as TextBlock[];
    expect(actions.length).toBeGreaterThan(0);
    actions.forEach((a) => {
      expect(Array.isArray(a.lines)).toBe(true);
      a.lines.forEach((lineRuns) => {
        expect(Array.isArray(lineRuns)).toBe(true);
        lineRuns.forEach((run) => {
          expect(typeof run.text).toBe("string");
        });
      });
    });
  });

  it("block order: scene → action → scene → action", () => {
    expect(kinds(blocks)).toEqual(["scene_heading", "action", "scene_heading", "action"]);
  });
});

// ─── fixture 3: inline highlight (enclosure) ──────────────────────────────────

describe("renderModel: inline highlight runs", () => {
  const configs = normalizeMarkerConfigsSchema([
    { id: "em", start: "《", end: "》", matchMode: "enclosure", style: { color: "red" } },
  ]);

  const TEXT = "這是《強調》文字和普通文字。";
  const { ast } = parseScreenplay(TEXT, configs);
  const blocks = toRenderBlocks(ast, configs);

  it("has action block", () => {
    expect(blocks.some((b) => b.kind === "action")).toBe(true);
  });

  it("action block lines contain highlight run with style", () => {
    const action = blocks.find((b) => b.kind === "action") as TextBlock;
    const allRuns = action.lines.flat();
    const highlight = allRuns.find((r) => r.markerId === "em");
    expect(highlight).toBeDefined();
    expect(highlight!.style?.color).toBe("red");
  });

  it("plain text run has no markerId", () => {
    const action = blocks.find((b) => b.kind === "action") as TextBlock;
    const allRuns = action.lines.flat();
    const plain = allRuns.find((r) => !r.markerId);
    expect(plain).toBeDefined();
  });

  it("applies renderer template to inline run text", () => {
    const templateConfigs = normalizeMarkerConfigsSchema([
      {
        id: "em",
        start: "《",
        end: "》",
        matchMode: "enclosure",
        renderer: { template: "({{content}})" },
      },
    ]);
    const { ast } = parseScreenplay("這是《強調》文字。", templateConfigs);
    const [action] = toRenderBlocks(ast, templateConfigs) as TextBlock[];
    const highlight = action.lines.flat().find((r) => r.markerId === "em");
    expect(highlight?.text).toBe("(強調)");
    expect(highlight?.content).toBe("強調");
  });

  it("applies showDelimiters to inline run text", () => {
    const delimiterConfigs = normalizeMarkerConfigsSchema([
      {
        id: "em",
        start: "《",
        end: "》",
        matchMode: "enclosure",
        showDelimiters: true,
      },
    ]);
    const { ast } = parseScreenplay("這是《強調》文字。", delimiterConfigs);
    const [action] = toRenderBlocks(ast, delimiterConfigs) as TextBlock[];
    const highlight = action.lines.flat().find((r) => r.markerId === "em");
    expect(highlight?.text).toBe("《強調》");
    expect(highlight?.content).toBe("強調");
  });
});

// ─── fixture 4: range block structure ─────────────────────────────────────────

describe("renderModel: range block", () => {
  const configs = normalizeMarkerConfigsSchema([
    { id: "act", start: "=== ACT", end: "=== END", matchMode: "range", rangeGroupId: "act", style: { borderLeft: "3px solid blue" } },
  ]);

  const TEXT = `=== ACT
幕內台詞一。
幕內台詞二。
=== END`.trim();

  const { ast } = parseScreenplay(TEXT, configs);
  const blocks = toRenderBlocks(ast, configs);

  it("has range block at root", () => {
    expect(blocks.some((b) => b.kind === "range")).toBe(true);
  });

  it("range block has startBlock and endBlock", () => {
    const range = blocks.find((b) => b.kind === "range") as RangeBlock;
    expect(range.startBlock).toBeDefined();
    expect(range.endBlock).toBeDefined();
  });

  it("range block has children", () => {
    const range = blocks.find((b) => b.kind === "range") as RangeBlock;
    expect(range.children.length).toBeGreaterThan(0);
  });

  it("range depth is 0 at root", () => {
    const range = blocks.find((b) => b.kind === "range") as RangeBlock;
    expect(range.depth).toBe(0);
  });

  it("range children have no nested range kind (actions inside)", () => {
    const range = blocks.find((b) => b.kind === "range") as RangeBlock;
    const childKinds = new Set(range.children.map((c) => c.kind));
    expect(childKinds.has("action")).toBe(true);
  });

  it("startBlock has labelRuns", () => {
    const range = blocks.find((b) => b.kind === "range") as RangeBlock;
    expect(Array.isArray(range.startBlock!.labelRuns)).toBe(true);
  });
});

// ─── fixture 5: character block ───────────────────────────────────────────────

describe("renderModel: character block", () => {
  const configs = normalizeMarkerConfigsSchema([
    { id: "char", start: "角色", matchMode: "prefix", parseAs: "character", mapFields: { text: "$text" } },
    { id: "diag", parseAs: "dialogue" },
  ]);

  const TEXT = `角色甲
台詞一。`.trim();

  const { ast } = parseScreenplay(TEXT, configs);
  const blocks = toRenderBlocks(ast, configs);

  it("has character block with text", () => {
    const char = blocks.find((b) => b.kind === "character") as { kind: string; text: string } | undefined;
    expect(char).toBeDefined();
    // prefix "角色" is stripped by mapFields $text; remaining text is "甲"
    expect(char!.text).toContain("甲");
  });
});

// ─── fixture 6: blank blocks ──────────────────────────────────────────────────

describe("renderModel: blank blocks", () => {
  const TEXT = `行一。

行三。`.trim();

  const { ast } = parseScreenplay(TEXT);
  const blocks = toRenderBlocks(ast, []);

  it("has blank block for empty line", () => {
    expect(blocks.some((b) => b.kind === "blank")).toBe(true);
  });
});

// ─── fixture 7: line span metadata ────────────────────────────────────────────

describe("renderModel: span metadata", () => {
  const configs = normalizeMarkerConfigsSchema([
    { id: "sc", start: "INT.", matchMode: "prefix", parseAs: "scene_heading", mapFields: { text: "$text" } },
  ]);

  const TEXT = `INT. 第一場景
動作一。`.trim();

  const { ast } = parseScreenplay(TEXT, configs);
  const blocks = toRenderBlocks(ast, configs);

  it("scene_heading block has span", () => {
    const scene = blocks.find((b) => b.kind === "scene_heading");
    expect(scene?.span).toBeDefined();
    expect(typeof scene?.span?.lineStart).toBe("number");
  });

  it("action block has span", () => {
    const action = blocks.find((b) => b.kind === "action");
    expect(action?.span).toBeDefined();
  });
});
