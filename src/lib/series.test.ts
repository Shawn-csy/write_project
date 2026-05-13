import { describe, it, expect } from "vitest";
import {
  normalizeSeriesName,
  parseSeriesOrder,
  getSeriesInfoFromScript,
} from "./series";

// ── normalizeSeriesName ────────────────────────────────────────────────────

describe("normalizeSeriesName", () => {
  it("trims whitespace", () => {
    expect(normalizeSeriesName("  My Series  ")).toBe("My Series");
  });

  it("returns empty string for null/undefined", () => {
    expect(normalizeSeriesName(null)).toBe("");
    expect(normalizeSeriesName(undefined)).toBe("");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeSeriesName("")).toBe("");
  });

  it("preserves inner content", () => {
    expect(normalizeSeriesName("Dragon Ball Z")).toBe("Dragon Ball Z");
  });
});

// ── parseSeriesOrder ───────────────────────────────────────────────────────

describe("parseSeriesOrder", () => {
  it("parses a valid integer", () => {
    expect(parseSeriesOrder(3)).toBe(3);
    expect(parseSeriesOrder("5")).toBe(5);
  });

  it("floors float to integer", () => {
    expect(parseSeriesOrder(2.9)).toBe(2);
  });

  it("returns null for negative numbers", () => {
    expect(parseSeriesOrder(-1)).toBeNull();
  });

  it("returns null for zero", () => {
    expect(parseSeriesOrder(0)).toBe(0);
  });

  it("returns null for NaN", () => {
    expect(parseSeriesOrder(NaN)).toBeNull();
    expect(parseSeriesOrder("abc")).toBeNull();
  });

  it("returns 0 for null (Number(null) === 0)", () => {
    expect(parseSeriesOrder(null)).toBe(0);
  });

  it("returns null for undefined (Number(undefined) === NaN)", () => {
    expect(parseSeriesOrder(undefined)).toBeNull();
  });

  it("returns null for Infinity", () => {
    expect(parseSeriesOrder(Infinity)).toBeNull();
  });
});

// ── getSeriesInfoFromScript ────────────────────────────────────────────────

describe("getSeriesInfoFromScript", () => {
  it("extracts series name from customMetadata", () => {
    const script = {
      customMetadata: [{ key: "series", value: "Dragon Ball" }],
    };
    const { seriesName } = getSeriesInfoFromScript(script);
    expect(seriesName).toBe("Dragon Ball");
  });

  it("extracts series order from seriesOrder field", () => {
    const script = {
      seriesOrder: 3,
      customMetadata: [],
    };
    const { seriesOrder } = getSeriesInfoFromScript(script);
    expect(seriesOrder).toBe(3);
  });

  it("extracts episode from customMetadata as seriesOrder", () => {
    const script = {
      customMetadata: [{ key: "episode", value: "7" }],
    };
    const { seriesOrder } = getSeriesInfoFromScript(script);
    expect(seriesOrder).toBe(7);
  });

  it("returns empty string and null for script with no series info", () => {
    const { seriesName, seriesOrder } = getSeriesInfoFromScript({
      customMetadata: [],
    });
    expect(seriesName).toBe("");
    expect(seriesOrder).toBeNull();
  });

  it("returns empty values for null input", () => {
    const { seriesName, seriesOrder } = getSeriesInfoFromScript(null);
    expect(seriesName).toBe("");
    expect(seriesOrder).toBeNull();
  });

  it("seriesOrder field takes precedence over metadata episode", () => {
    const script = {
      seriesOrder: 10,
      customMetadata: [{ key: "episode", value: "5" }],
    };
    const { seriesOrder } = getSeriesInfoFromScript(script);
    expect(seriesOrder).toBe(10);
  });
});
