/**
 * Parser parity tests for script-engine.
 * Covers: marker theme configs, inline markers, title page line offset,
 * range/layer AST branches, applyLineOffset on startNode/endNode.
 */

import { describe, it, expect } from "vitest";
import { parseScreenplay } from "./parseScreenplay";
import { normalizeMarkerConfigsSchema } from "../marker-theme/normalize";
import { parseInline } from "./inlineParser";
import type { AstNode, MarkerConfig } from "../document/astTypes";

// ─── helpers ─────────────────────────────────────────────────────────────────

function flatNodes(root: AstNode): AstNode[] {
  const result: AstNode[] = [];
  const walk = (n: AstNode) => {
    result.push(n);
    n.children?.forEach(walk);
    if (n.startNode) walk(n.startNode as AstNode);
    if (n.endNode) walk(n.endNode as AstNode);
  };
  root.children?.forEach(walk);
  return result;
}

// ─── normalizeThemeConfigs / normalizeMarkerConfigsSchema ─────────────────────

describe("normalizeMarkerConfigsSchema", () => {
  it("accepts plain array", () => {
    const input = [{ id: "x", start: "【", end: "】" }];
    const out = normalizeMarkerConfigsSchema(input);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("x");
  });

  it("extracts from object.configs array", () => {
    const input = { configs: [{ id: "a", start: "#" }] };
    const out = normalizeMarkerConfigsSchema(input);
    expect(out[0].id).toBe("a");
  });

  it("extracts from object.markerConfigs array", () => {
    const input = { markerConfigs: [{ id: "b", start: "//" }] };
    const out = normalizeMarkerConfigsSchema(input);
    expect(out[0].id).toBe("b");
  });

  it("extracts from object.markers array", () => {
    const input = { markers: [{ id: "c", regex: "/^INT/" }] };
    const out = normalizeMarkerConfigsSchema(input);
    expect(out[0].id).toBe("c");
  });

  it("parses JSON string containing array", () => {
    const input = JSON.stringify([{ id: "d", start: "★" }]);
    const out = normalizeMarkerConfigsSchema(input);
    expect(out[0].id).toBe("d");
  });

  it("parses JSON string inside object.markers", () => {
    const inner = JSON.stringify([{ id: "e", start: "◆" }]);
    const out = normalizeMarkerConfigsSchema({ markers: inner });
    expect(out[0].id).toBe("e");
  });

  it("infers matchMode prefix when only start present", () => {
    const out = normalizeMarkerConfigsSchema([{ id: "f", start: "#" }]);
    expect(out[0].matchMode).toBe("prefix");
  });

  it("infers matchMode enclosure when start+end present without explicit mode", () => {
    const out = normalizeMarkerConfigsSchema([{ id: "g", start: "【", end: "】" }]);
    expect(out[0].matchMode).toBe("enclosure");
  });

  it("strips invalid mapFields (non-object)", () => {
    const out = normalizeMarkerConfigsSchema([{ id: "h", start: "#", mapFields: "bad" }]);
    expect(out[0].mapFields).toBeUndefined();
  });

  it("strips invalid mapCasts (non-object)", () => {
    const out = normalizeMarkerConfigsSchema([{ id: "i", start: "#", mapCasts: 42 }]);
    expect(out[0].mapCasts).toBeUndefined();
  });

  it("returns [] for null/undefined/number", () => {
    expect(normalizeMarkerConfigsSchema(null)).toEqual([]);
    expect(normalizeMarkerConfigsSchema(undefined)).toEqual([]);
    expect(normalizeMarkerConfigsSchema(42)).toEqual([]);
  });
});

// ─── inline parser ────────────────────────────────────────────────────────────

describe("parseInline", () => {
  const configs: MarkerConfig[] = normalizeMarkerConfigsSchema([
    { id: "bold", start: "**", end: "**", matchMode: "enclosure", style: { fontWeight: "bold" } },
    { id: "em", start: "*", end: "*", matchMode: "enclosure", style: { fontStyle: "italic" } },
    { id: "note", start: "//", matchMode: "prefix", style: { color: "#888" } },
  ]);

  it("returns single text token for plain text", () => {
    const tokens = parseInline("hello world", configs);
    expect(tokens).toEqual([{ type: "text", content: "hello world" }]);
  });

  it("matches enclosure marker", () => {
    const tokens = parseInline("**bold**", configs);
    const hl = tokens.find((t) => t.type === "highlight");
    expect(hl).toBeDefined();
    expect(hl!.id).toBe("bold");
    expect(hl!.content).toBe("bold");
  });

  it("matches prefix marker", () => {
    const tokens = parseInline("//comment here", configs);
    const hl = tokens.find((t) => t.type === "highlight");
    expect(hl?.id).toBe("note");
    expect(hl?.content).toContain("comment");
  });

  it("text before and after marker preserved", () => {
    const tokens = parseInline("intro **X** outro", configs);
    expect(tokens[0].type).toBe("text");
    expect(tokens[0].content).toContain("intro");
    const hl = tokens.find((t) => t.type === "highlight");
    expect(hl?.content).toBe("X");
    const last = tokens[tokens.length - 1];
    expect(last.content).toContain("outro");
  });

  it("returns [] for empty string", () => {
    expect(parseInline("", configs)).toEqual([]);
  });

  it("accepts fullwidth enclosure markers", () => {
    const fwConfigs: MarkerConfig[] = normalizeMarkerConfigsSchema([
      { id: "hw", start: "【", end: "】", matchMode: "enclosure" },
    ]);
    const tokens = parseInline("【舞台】", fwConfigs);
    const hl = tokens.find((t) => t.type === "highlight");
    expect(hl?.id).toBe("hw");
    expect(hl?.content).toBe("舞台");
  });
});

// ─── title page line offset ───────────────────────────────────────────────────

describe("title page line offset", () => {
  // splitTitleAndBody: first line matches /key:/, blank line is separator
  // "Title: X\nAuthor: Y\n\n" → titleLines=["Title: X","Author: Y"], bodyStartLine=4
  const TITLE = "Title: 測試劇本\nAuthor: 某人\n";
  const BODY = "EXT. 戶外 - DAY\n一個角色走進來。\n";
  const TEXT = TITLE + "\n" + BODY; // blank line separates title from body

  it("body AST nodes have lineStart offset by title page length", () => {
    const doc = parseScreenplay(TEXT);
    const nodes = flatNodes(doc.ast).filter((n) => Number.isFinite(n.lineStart));
    // Title: 2 lines, blank: 1 line → bodyStartLine=4
    expect(nodes.length).toBeGreaterThan(0);
    nodes.forEach((n) => {
      expect((n.lineStart as number)).toBeGreaterThanOrEqual(4);
    });
  });

  it("no title page — line 1 starts at 1", () => {
    const doc = parseScreenplay("INT. 室內\n動作。");
    const first = doc.ast.children?.[0];
    expect(first?.lineStart).toBe(1);
  });

  it("applyLineOffset propagates to startNode and endNode of range nodes", () => {
    const rangeConfigs = normalizeMarkerConfigsSchema([
      {
        id: "act",
        start: "=== ACT",
        end: "=== END",
        matchMode: "range",
        rangeGroupId: "act",
      },
    ]);
    // Title: 1 line, blank: 1 line → bodyStartLine=3
    const input = "Title: X\n\n=== ACT\n正文\n=== END\n";
    const doc = parseScreenplay(input, rangeConfigs);
    const allNodes = flatNodes(doc.ast);
    const rangeNode = allNodes.find((n) => n.type === "range");
    expect(rangeNode).toBeDefined();
    expect(rangeNode?.startNode).toBeDefined();
    expect(rangeNode?.endNode).toBeDefined();
    expect((rangeNode?.startNode as AstNode).lineStart).toBeGreaterThanOrEqual(3);
    expect((rangeNode?.endNode as AstNode).lineStart).toBeGreaterThanOrEqual(3);
    // All numbered nodes must have lineStart >= 3 (title 1 line + blank = body at line 3)
    allNodes
      .filter((n) => Number.isFinite(n.lineStart))
      .forEach((n) => {
        expect(n.lineStart as number).toBeGreaterThanOrEqual(3);
      });
  });
});

// ─── block marker AST shape ───────────────────────────────────────────────────

describe("block marker AST", () => {
  it("scene_heading parsed via parseAs", () => {
    const configs = normalizeMarkerConfigsSchema([
      {
        id: "scene",
        start: "INT.",
        matchMode: "prefix",
        parseAs: "scene_heading",
        mapFields: { text: "$text" },
      },
    ]);
    const doc = parseScreenplay("INT. 室內 - DAY", configs);
    const scene = doc.ast.children?.find((n) => n.type === "scene_heading");
    expect(scene).toBeDefined();
    expect(scene?.id).toBeDefined(); // slugified id
    expect(typeof scene?.text).toBe("string");
  });

  it("layer node created for range start marker", () => {
    const configs = normalizeMarkerConfigsSchema([
      { id: "act", start: "=== ACT", end: "=== END", matchMode: "range", rangeGroupId: "act" },
    ]);
    const doc = parseScreenplay("=== ACT\n正文\n=== END");
    // Without passing configs, default markers apply — pass configs here
    const doc2 = parseScreenplay("=== ACT\n正文\n=== END", configs);
    const allNodes = flatNodes(doc2.ast);
    expect(allNodes.some((n) => n.type === "range")).toBe(true);
  });

  it("blank line produces blank node", () => {
    const doc = parseScreenplay("INT. 室內\n\n動作");
    const blank = doc.ast.children?.find((n) => n.type === "blank");
    expect(blank).toBeDefined();
  });

  it("unmatched line defaults to action", () => {
    const doc = parseScreenplay("普通動作描述");
    const action = doc.ast.children?.find((n) => n.type === "action");
    expect(action).toBeDefined();
    expect(action?.text).toBe("普通動作描述");
  });
});

// ─── range / layer collapse ───────────────────────────────────────────────────

describe("range collapse", () => {
  const rangeConfigs = normalizeMarkerConfigsSchema([
    { id: "act", start: "=== ACT", end: "=== END", matchMode: "range", rangeGroupId: "act" },
  ]);

  it("content between range markers becomes children of range node", () => {
    const doc = parseScreenplay("=== ACT\n一行內容\n=== END", rangeConfigs);
    const range = flatNodes(doc.ast).find((n) => n.type === "range");
    expect(range).toBeDefined();
    expect(range?.children?.length).toBeGreaterThan(0);
  });

  it("nested ranges produce nested range nodes", () => {
    const configs = normalizeMarkerConfigsSchema([
      { id: "outer", start: "== OUTER", end: "== /OUTER", matchMode: "range", rangeGroupId: "outer" },
      { id: "inner", start: "-- INNER", end: "-- /INNER", matchMode: "range", rangeGroupId: "inner" },
    ]);
    const text = "== OUTER\n-- INNER\n內容\n-- /INNER\n== /OUTER";
    const doc = parseScreenplay(text, configs);
    const allNodes = flatNodes(doc.ast);
    const ranges = allNodes.filter((n) => n.type === "range");
    expect(ranges.length).toBeGreaterThanOrEqual(2);
  });
});

// ─── TOC / scenes ─────────────────────────────────────────────────────────────

describe("TOC extraction", () => {
  it("scene_heading nodes appear in toc", () => {
    const configs = normalizeMarkerConfigsSchema([
      {
        id: "scene",
        start: "INT.",
        matchMode: "prefix",
        parseAs: "scene_heading",
        mapFields: { text: "$text" },
      },
    ]);
    const doc = parseScreenplay("INT. 室內\n動作\nINT. 室外\n動作2", configs);
    expect(doc.toc.length).toBe(2);
    expect(doc.scenes.length).toBe(2);
    expect(doc.toc[0].label).toContain("室內");
  });
});
