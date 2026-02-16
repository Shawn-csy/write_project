import { describe, it } from "vitest";
import assert from "node:assert";
import { parseInline } from "./inlineParser.js";

describe("inlineParser block safety", () => {
  it("should not parse block-like markers as inline highlight", () => {
    const configs = [
      { id: "env-tag", label: "場景", start: "<t>", type: "block", matchMode: "prefix" },
      { id: "sfx", label: "一般音效", start: "/sfx", type: "inline", isBlock: false, matchMode: "prefix" },
    ];

    const nodes = parseInline("<t> /sfx 門外腳步", configs);
    const highlights = nodes.filter((n) => n.type === "highlight");

    assert.ok(highlights.some((n) => n.id === "sfx"), "inline marker should still work");
    assert.ok(!highlights.some((n) => n.id === "env-tag"), "block marker must not be parsed inline");
  });
});
