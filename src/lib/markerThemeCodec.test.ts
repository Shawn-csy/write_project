import { describe, it, expect } from "vitest";
import {
  normalizeThemeConfigs,
  normalizeMarkerConfigsSchema,
  serializeThemeConfigs,
  safeParseThemeConfigsText,
} from "./markerThemeCodec";

// ── normalizeThemeConfigs ──────────────────────────────────────────────────

describe("normalizeThemeConfigs", () => {
  it("passes through an array unchanged", () => {
    const arr = [{ id: "a" }, { id: "b" }];
    expect(normalizeThemeConfigs(arr)).toBe(arr);
  });

  it("extracts .configs array from object", () => {
    const configs = [{ id: "x" }];
    expect(normalizeThemeConfigs({ configs })).toBe(configs);
  });

  it("extracts .markerConfigs array from object", () => {
    const markerConfigs = [{ id: "y" }];
    expect(normalizeThemeConfigs({ markerConfigs })).toBe(markerConfigs);
  });

  it("extracts .markers array from object", () => {
    const markers = [{ id: "z" }];
    expect(normalizeThemeConfigs({ markers })).toBe(markers);
  });

  it("parses a JSON string of an array", () => {
    const result = normalizeThemeConfigs('[{"id":"a"}]');
    expect(result).toEqual([{ id: "a" }]);
  });

  it("returns empty array for invalid JSON string", () => {
    expect(normalizeThemeConfigs("not json")).toEqual([]);
  });

  it("returns empty array for null/undefined", () => {
    expect(normalizeThemeConfigs(null)).toEqual([]);
    expect(normalizeThemeConfigs(undefined)).toEqual([]);
  });

  it("returns object values when it is a single-value-array object", () => {
    const arr = [{ id: "a" }];
    const result = normalizeThemeConfigs({ only: arr });
    expect(result).toBe(arr);
  });
});

// ── normalizeMarkerConfigsSchema ───────────────────────────────────────────

describe("normalizeMarkerConfigsSchema", () => {
  it("filters out non-object entries", () => {
    const result = normalizeMarkerConfigsSchema([null, "string", 42, { id: "ok" }]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("ok");
  });

  it("infers matchMode=prefix from .start without .end", () => {
    const [cfg] = normalizeMarkerConfigsSchema([{ start: ">>", id: "a" }]);
    expect(cfg.matchMode).toBe("prefix");
  });

  it("infers matchMode=enclosure from .start + .end", () => {
    const [cfg] = normalizeMarkerConfigsSchema([{ start: "[[", end: "]]", id: "a" }]);
    expect(cfg.matchMode).toBe("enclosure");
  });

  it("infers matchMode=regex from .regex", () => {
    const [cfg] = normalizeMarkerConfigsSchema([{ regex: "^>", id: "a" }]);
    expect(cfg.matchMode).toBe("regex");
  });

  it("falls back to matchMode=none when no trigger fields", () => {
    const [cfg] = normalizeMarkerConfigsSchema([{ id: "a", label: "test" }]);
    expect(cfg.matchMode).toBe("none");
  });

  it("respects explicit matchMode", () => {
    const [cfg] = normalizeMarkerConfigsSchema([{ id: "a", matchMode: "range" }]);
    expect(cfg.matchMode).toBe("range");
  });

  it("sets isBlock=true when matchMode=range", () => {
    const [cfg] = normalizeMarkerConfigsSchema([{ id: "a", matchMode: "range" }]);
    expect(cfg.isBlock).toBe(true);
  });

  it("sets isBlock=true when parseAs is set", () => {
    const [cfg] = normalizeMarkerConfigsSchema([{ id: "a", parseAs: "scene_heading" }]);
    expect(cfg.isBlock).toBe(true);
  });

  it("removes mapFields when it is not an object", () => {
    const [cfg] = normalizeMarkerConfigsSchema([{ id: "a", mapFields: "bad" }]);
    expect(cfg.mapFields).toBeUndefined();
  });

  it("keeps mapFields when it is an object", () => {
    const [cfg] = normalizeMarkerConfigsSchema([{ id: "a", mapFields: { key: "val" } }]);
    expect(cfg.mapFields).toEqual({ key: "val" });
  });
});

// ── serializeThemeConfigs ──────────────────────────────────────────────────

describe("serializeThemeConfigs", () => {
  it("returns valid JSON string", () => {
    const result = serializeThemeConfigs([{ id: "a", start: ">>" }]);
    expect(() => JSON.parse(result)).not.toThrow();
    const parsed = JSON.parse(result);
    expect(parsed[0].id).toBe("a");
    expect(parsed[0].matchMode).toBe("prefix");
  });
});

// ── safeParseThemeConfigsText ──────────────────────────────────────────────

describe("safeParseThemeConfigsText", () => {
  it("parses valid JSON array", () => {
    const { value, error } = safeParseThemeConfigsText('[{"id":"a","start":">>"}]');
    expect(error).toBe("");
    expect(value).toHaveLength(1);
    expect(value[0].matchMode).toBe("prefix");
  });

  it("returns error for invalid JSON", () => {
    const { value, error } = safeParseThemeConfigsText("not json");
    expect(value).toBeNull();
    expect(error).toBeTruthy();
  });

  it("returns error when root is not an array", () => {
    const { value, error } = safeParseThemeConfigsText('{"key":"val"}');
    expect(value).toBeNull();
    expect(error).toMatch(/陣列/);
  });

  it("returns empty array for empty JSON array input", () => {
    const { value, error } = safeParseThemeConfigsText("[]");
    expect(error).toBe("");
    expect(value).toEqual([]);
  });

  it("returns validation error for unknown marker color token", () => {
    const { value, error } = safeParseThemeConfigsText(
      '[{"id":"a","matchMode":"prefix","start":">>","style":{"color":"var(--marker-color-gray)"}}]'
    );
    expect(value).toBeNull();
    expect(error).toMatch(/未知色彩 token/);
  });

  it("returns validation error for range without end", () => {
    const { value, error } = safeParseThemeConfigsText(
      '[{"id":"r","matchMode":"range","start":"<s>"}]'
    );
    expect(value).toBeNull();
    expect(error).toMatch(/range 模式必須同時有 start 與 end/);
  });
});
