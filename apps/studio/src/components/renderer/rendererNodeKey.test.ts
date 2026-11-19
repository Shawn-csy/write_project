import { describe, expect, it } from "vitest";
import { getRendererNodeKey } from "./rendererNodeKey";

describe("getRendererNodeKey", () => {
  it("prefers parser ids", () => {
    expect(getRendererNodeKey({ id: "abc", lineStart: 10, type: "action" }, 3)).toBe("id-abc");
  });

  it("uses index as tiebreaker for same line/type siblings", () => {
    const node = { lineStart: 10, type: "action" };

    expect(getRendererNodeKey(node, 0)).toBe("L10-action-0");
    expect(getRendererNodeKey(node, 1)).toBe("L10-action-1");
  });

  it("falls back to index when no source line exists", () => {
    expect(getRendererNodeKey({ type: "blank" }, 2)).toBe("i-2");
  });
});
