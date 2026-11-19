import { describe, it, expect } from "vitest";
import {
  normalizeCustomMetadataEntries,
  customMetadataEntriesToMeta,
  customMetadataEntriesToRawEntries,
} from "./customMetadata";

// ── normalizeCustomMetadataEntries ─────────────────────────────────────────

describe("normalizeCustomMetadataEntries", () => {
  it("returns empty array for non-array input", () => {
    expect(normalizeCustomMetadataEntries(null)).toEqual([]);
    expect(normalizeCustomMetadataEntries(undefined)).toEqual([]);
    expect(normalizeCustomMetadataEntries("string")).toEqual([]);
    expect(normalizeCustomMetadataEntries({})).toEqual([]);
  });

  it("filters out entries with empty key", () => {
    const entries = [
      { key: "", value: "val" },
      { key: "  ", value: "val" },
      { key: "validKey", value: "val" },
    ];
    const result = normalizeCustomMetadataEntries(entries);
    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("validKey");
  });

  it("trims key whitespace", () => {
    const [entry] = normalizeCustomMetadataEntries([{ key: "  myKey  ", value: "v" }]);
    expect(entry.key).toBe("myKey");
  });

  it("converts value to string", () => {
    const [entry] = normalizeCustomMetadataEntries([{ key: "k", value: 42 }]);
    expect(entry.value).toBe("42");
  });

  it("uses empty string for missing value", () => {
    const [entry] = normalizeCustomMetadataEntries([{ key: "k" }]);
    expect(entry.value).toBe("");
  });

  it("preserves type=divider", () => {
    const [entry] = normalizeCustomMetadataEntries([{ key: "sep", type: "divider" }]);
    expect(entry.type).toBe("divider");
  });

  it("defaults type to 'text' for non-divider", () => {
    const [entry] = normalizeCustomMetadataEntries([{ key: "k", value: "v", type: "other" }]);
    expect(entry.type).toBe("text");
  });

  it("filters out null entries in array", () => {
    const result = normalizeCustomMetadataEntries([null, { key: "k", value: "v" }]);
    expect(result).toHaveLength(1);
  });
});

// ── customMetadataEntriesToMeta ────────────────────────────────────────────

describe("customMetadataEntriesToMeta", () => {
  it("returns empty object for empty entries", () => {
    expect(customMetadataEntriesToMeta([])).toEqual({});
  });

  it("converts entries to meta object", () => {
    const entries = [
      { key: "Series", value: "My Series" },
      { key: "Episode", value: "3" },
    ];
    const meta = customMetadataEntriesToMeta(entries);
    expect(meta["series"]).toBe("My Series");
    expect(meta["episode"]).toBe("3");
  });

  it("normalizes key to lowercase and removes spaces", () => {
    const [result] = [customMetadataEntriesToMeta([{ key: "My Key", value: "v" }])];
    expect(result["mykey"]).toBe("v");
  });

  it("later duplicate key overwrites earlier", () => {
    const entries = [
      { key: "k", value: "first" },
      { key: "k", value: "second" },
    ];
    const meta = customMetadataEntriesToMeta(entries);
    expect(meta["k"]).toBe("second");
  });
});

// ── customMetadataEntriesToRawEntries ──────────────────────────────────────

describe("customMetadataEntriesToRawEntries", () => {
  it("returns only key and value (no type)", () => {
    const entries = [{ key: "k", value: "v", type: "divider" }];
    const raw = customMetadataEntriesToRawEntries(entries);
    expect(raw[0]).toEqual({ key: "k", value: "v" });
    expect(raw[0].type).toBeUndefined();
  });

  it("strips entries with empty keys", () => {
    const entries = [{ key: "", value: "v" }, { key: "valid", value: "x" }];
    const raw = customMetadataEntriesToRawEntries(entries);
    expect(raw).toHaveLength(1);
  });
});
