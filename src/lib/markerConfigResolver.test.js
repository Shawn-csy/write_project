import { describe, it } from "vitest";
import assert from "node:assert";
import { resolveEffectiveMarkerConfigs } from "./markerConfigResolver.js";

describe("resolveEffectiveMarkerConfigs", () => {
  it("should prefer scoped configs when provided", () => {
    const base = [{ id: "base", start: "#B", matchMode: "prefix", isBlock: true }];
    const scoped = [{ id: "scoped", regex: "^\\d+\\..+$", matchMode: "regex", isBlock: true, parseAs: "scene_heading" }];
    const resolved = resolveEffectiveMarkerConfigs({ baseConfigs: base, scopedConfigs: scoped });
    assert.strictEqual(resolved.source, "scoped");
    assert.strictEqual(resolved.configs[0].id, "scoped");
  });

  it("should unwrap nested configs container", () => {
    const scoped = {
      configs: [
        { id: "chapter", regex: "^\\d+\\..+$", matchMode: "regex", isBlock: true, parseAs: "scene_heading" },
      ],
    };
    const resolved = resolveEffectiveMarkerConfigs({ baseConfigs: [], scopedConfigs: scoped });
    assert.strictEqual(resolved.source, "scoped");
    assert.strictEqual(resolved.configs.length, 1);
    assert.strictEqual(resolved.configs[0].id, "chapter");
  });
});
