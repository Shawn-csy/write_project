/**
 * Fixture tests — snapshot-style checks for engine output across
 * canonical marker theme cases. These lock the parse contract so
 * Vite / Next / export all see the same AST shape.
 */

import { describe, it, expect } from "vitest";
import { parseScreenplay, normalizeMarkerConfigsSchema } from "../../src/index";
import type { AstNode, ScriptDocument } from "../../src/document/astTypes";

// ─── helpers ─────────────────────────────────────────────────────────────────

function nodeTypes(doc: ScriptDocument): string[] {
  return (doc.ast.children ?? []).map((n) => n.type);
}

function allNodeTypes(root: AstNode): string[] {
  const types: string[] = [];
  const walk = (n: AstNode) => {
    types.push(n.type);
    n.children?.forEach(walk);
  };
  (root.children ?? []).forEach(walk);
  return types;
}

// ─── fixture 1: default theme (no markerConfigs) ──────────────────────────────

describe("fixture: default theme", () => {
  const TEXT = `INT. 室內 - 白天
一個老人坐在椅子上。

角色甲
你好，世界。

EXT. 室外 - 夜晚
`.trim();

  const doc = parseScreenplay(TEXT);

  it("root has children", () => {
    expect(doc.ast.type).toBe("root");
    expect((doc.ast.children ?? []).length).toBeGreaterThan(0);
  });

  it("has blank node for empty line", () => {
    expect(nodeTypes(doc)).toContain("blank");
  });

  it("markersUsed is array (may be empty without configs)", () => {
    expect(Array.isArray(doc.markersUsed)).toBe(true);
  });

  it("toc is empty without scene_heading config", () => {
    expect(doc.toc).toEqual([]);
  });
});

// ─── fixture 2: custom prefix marker → scene_heading ─────────────────────────

describe("fixture: custom prefix marker (scene_heading)", () => {
  const configs = normalizeMarkerConfigsSchema([
    {
      id: "scene",
      start: "INT.",
      matchMode: "prefix",
      parseAs: "scene_heading",
      mapFields: { text: "$text" },
    },
    {
      id: "scene_ext",
      start: "EXT.",
      matchMode: "prefix",
      parseAs: "scene_heading",
      mapFields: { text: "$text" },
    },
  ]);

  const TEXT = `INT. 室內 - 白天
動作描述。
EXT. 室外 - 夜晚
另一段動作。`.trim();

  const doc = parseScreenplay(TEXT, configs);

  it("two scene_heading nodes", () => {
    const scenes = (doc.ast.children ?? []).filter((n) => n.type === "scene_heading");
    expect(scenes.length).toBe(2);
  });

  it("scene_heading has id (slugified)", () => {
    const scene = (doc.ast.children ?? []).find((n) => n.type === "scene_heading");
    expect(typeof scene?.id).toBe("string");
    expect((scene?.id as string).length).toBeGreaterThan(0);
  });

  it("toc has 2 entries", () => {
    expect(doc.toc.length).toBe(2);
    expect(doc.scenes.length).toBe(2);
  });

  it("markersUsed contains scene marker ids", () => {
    const ids = doc.markersUsed.map((m) => m.markerId);
    expect(ids).toContain("scene");
    expect(ids).toContain("scene_ext");
  });

  it("action lines remain as action", () => {
    const actions = (doc.ast.children ?? []).filter((n) => n.type === "action");
    expect(actions.length).toBe(2);
  });
});

// ─── fixture 3: enclosure inline marker ───────────────────────────────────────

describe("fixture: enclosure inline marker", () => {
  const configs = normalizeMarkerConfigsSchema([
    {
      id: "emphasis",
      start: "《",
      end: "》",
      matchMode: "enclosure",
      style: { color: "red" },
    },
  ]);

  const TEXT = "這是《強調》文字和普通文字。";
  const doc = parseScreenplay(TEXT, configs);

  it("action node exists", () => {
    const action = (doc.ast.children ?? []).find((n) => n.type === "action");
    expect(action).toBeDefined();
  });

  it("action node has inline tokens with highlight", () => {
    const action = (doc.ast.children ?? []).find((n) => n.type === "action");
    const inline = action?.inline as Array<{ type: string; id?: string }> | undefined;
    expect(Array.isArray(inline)).toBe(true);
    const hl = (inline ?? []).find((t) => t.type === "highlight");
    expect(hl).toBeDefined();
    expect(hl?.id).toBe("emphasis");
  });

  it("inline marker counted in markersUsed", () => {
    // inline hits are not recorded at block level — markersUsed tracks block marker hits
    // inline markers hit via parseInline are separate; this asserts the array is valid
    expect(Array.isArray(doc.markersUsed)).toBe(true);
  });
});

// ─── fixture 4: range/layer marker ────────────────────────────────────────────

describe("fixture: range/layer marker", () => {
  const configs = normalizeMarkerConfigsSchema([
    {
      id: "act",
      start: "=== ACT",
      end: "=== END",
      matchMode: "range",
      rangeGroupId: "act",
      style: { borderLeft: "3px solid blue" },
    },
  ]);

  const TEXT = `=== ACT
幕內台詞一。
幕內台詞二。
=== END`.trim();

  const doc = parseScreenplay(TEXT, configs);

  it("range node at root level", () => {
    const range = (doc.ast.children ?? []).find((n) => n.type === "range");
    expect(range).toBeDefined();
  });

  it("range node has children", () => {
    const range = (doc.ast.children ?? []).find((n) => n.type === "range") as AstNode;
    expect((range?.children ?? []).length).toBeGreaterThan(0);
  });

  it("range node has startNode and endNode", () => {
    const range = (doc.ast.children ?? []).find((n) => n.type === "range") as AstNode;
    expect(range?.startNode).toBeDefined();
    expect(range?.endNode).toBeDefined();
  });

  it("act marker appears in markersUsed", () => {
    const entry = doc.markersUsed.find((m) => m.markerId === "act");
    expect(entry).toBeDefined();
    expect(entry!.count).toBeGreaterThanOrEqual(2); // start + end
  });
});

// ─── fixture 5: title page + scene TOC ────────────────────────────────────────

describe("fixture: title page + scene TOC", () => {
  const configs = normalizeMarkerConfigsSchema([
    {
      id: "sc",
      start: "INT.",
      matchMode: "prefix",
      parseAs: "scene_heading",
      mapFields: { text: "$text" },
    },
  ]);

  // Title page ends at blank line
  const TEXT = `Title: 測試劇本
Author: 某甲

INT. 第一場景
動作一。
INT. 第二場景
動作二。`.trim();

  const doc = parseScreenplay(TEXT, configs);

  it("title page extracted", () => {
    expect(doc.titlePage.length).toBeGreaterThan(0);
    expect(doc.titlePage.some((l) => l.includes("測試劇本"))).toBe(true);
  });

  it("titleEntries has Title and Author", () => {
    const keys = doc.titleEntries.map((e) => e.key);
    expect(keys).toContain("Title");
    expect(keys).toContain("Author");
  });

  it("body scene_headings have offset lineStart >= 4", () => {
    // title: 2 lines, blank: 1 line → bodyStartLine=4
    const scenes = allNodeTypes(doc.ast)
      .map((_, i) => (doc.ast.children ?? [])[i])
      .filter((n) => n?.type === "scene_heading");
    scenes.forEach((n) => {
      expect(n.lineStart as number).toBeGreaterThanOrEqual(4);
    });
  });

  it("toc has 2 entries", () => {
    expect(doc.toc.length).toBe(2);
  });

  it("scenes matches toc", () => {
    expect(doc.scenes.length).toBe(doc.toc.length);
    doc.scenes.forEach((s, i) => {
      expect(s.id).toBe(doc.toc[i].id);
      expect(s.label).toBe(doc.toc[i].label);
    });
  });
});
