/**
 * @write/media-crop unit tests.
 *
 * Covers:
 *   - encodeMediaCropRef: builds correct hash fragment
 *   - decodeMediaCropRef: parses encoded hash, returns null for invalid
 *   - normalizeMediaCropLike: clamps values, rejects non-finite
 *   - getMediaCropStyle: crop from hash, override precedence, no-crop passthrough
 */

import { describe, it, expect } from "vitest";
import {
  encodeMediaCropRef,
  decodeMediaCropRef,
  normalizeMediaCropLike,
  getMediaCropStyle,
} from "./index";

// ---------------------------------------------------------------------------
// encodeMediaCropRef
// ---------------------------------------------------------------------------

describe("encodeMediaCropRef", () => {
  it("produces a URL with #srCrop= fragment", () => {
    const result = encodeMediaCropRef("https://example.com/img.jpg", { cx: 0.1, cy: -0.2, zoom: 1.5 });
    expect(result).toMatch(/^https:\/\/example\.com\/img\.jpg#srCrop=/);
  });

  it("strips existing hash before encoding", () => {
    const result = encodeMediaCropRef("https://example.com/img.jpg#old=data", { cx: 0, cy: 0, zoom: 1 });
    expect(result).not.toContain("old=data");
    expect(result).toContain("#srCrop=");
  });

  it("clamps cx/cy to [-1, 1]", () => {
    const result = encodeMediaCropRef("https://example.com/img.jpg", { cx: 5, cy: -5, zoom: 1 });
    const { crop } = decodeMediaCropRef(result);
    expect(crop?.cx).toBe(1);
    expect(crop?.cy).toBe(-1);
  });

  it("clamps zoom to [0.35, 3]", () => {
    const r1 = encodeMediaCropRef("u", { cx: 0, cy: 0, zoom: 10 });
    const r2 = encodeMediaCropRef("u", { cx: 0, cy: 0, zoom: 0.1 });
    expect(decodeMediaCropRef(r1).crop?.zoom).toBe(3);
    expect(decodeMediaCropRef(r2).crop?.zoom).toBe(0.35);
  });

  it("round-trips through decode", () => {
    const base = "https://example.com/img.jpg";
    const crop = { cx: 0.3, cy: -0.4, zoom: 2 };
    const encoded = encodeMediaCropRef(base, crop);
    const { src, crop: decoded } = decodeMediaCropRef(encoded);
    expect(src).toBe(base);
    expect(decoded?.cx).toBeCloseTo(crop.cx);
    expect(decoded?.cy).toBeCloseTo(crop.cy);
    expect(decoded?.zoom).toBeCloseTo(crop.zoom);
  });
});

// ---------------------------------------------------------------------------
// decodeMediaCropRef
// ---------------------------------------------------------------------------

describe("decodeMediaCropRef", () => {
  it("returns null crop for plain URL with no hash", () => {
    const { src, crop } = decodeMediaCropRef("https://example.com/img.jpg");
    expect(src).toBe("https://example.com/img.jpg");
    expect(crop).toBeNull();
  });

  it("returns null crop for hash without srCrop key", () => {
    const { crop } = decodeMediaCropRef("https://example.com/img.jpg#other=data");
    expect(crop).toBeNull();
  });

  it("returns null crop for malformed JSON in hash", () => {
    const bad = "https://example.com/img.jpg#srCrop=" + encodeURIComponent("{not json}");
    const { crop } = decodeMediaCropRef(bad);
    expect(crop).toBeNull();
  });

  it("returns null crop for empty string input", () => {
    const { crop } = decodeMediaCropRef("");
    expect(crop).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// normalizeMediaCropLike
// ---------------------------------------------------------------------------

describe("normalizeMediaCropLike", () => {
  it("returns null for null/undefined input", () => {
    expect(normalizeMediaCropLike(null)).toBeNull();
    expect(normalizeMediaCropLike(undefined)).toBeNull();
  });

  it("clamps cx/cy to [-1, 1]", () => {
    const result = normalizeMediaCropLike({ cx: 2, cy: -3, zoom: 1 });
    expect(result?.cx).toBe(1);
    expect(result?.cy).toBe(-1);
  });

  it("clamps zoom to [0.35, 3]", () => {
    expect(normalizeMediaCropLike({ cx: 0, cy: 0, zoom: 99 })?.zoom).toBe(3);
    expect(normalizeMediaCropLike({ cx: 0, cy: 0, zoom: 0.01 })?.zoom).toBe(0.35);
  });

  it("defaults missing fields to 0/1", () => {
    const result = normalizeMediaCropLike({});
    expect(result?.cx).toBe(0);
    expect(result?.cy).toBe(0);
    expect(result?.zoom).toBe(1);
  });

  it("returns null when value is non-finite", () => {
    expect(normalizeMediaCropLike({ cx: NaN, cy: 0, zoom: 1 })).toBeNull();
    expect(normalizeMediaCropLike({ cx: 0, cy: Infinity, zoom: 1 })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getMediaCropStyle
// ---------------------------------------------------------------------------

describe("getMediaCropStyle", () => {
  it("returns src and undefined style when no crop", () => {
    const { src, style, crop } = getMediaCropStyle("https://example.com/img.jpg");
    expect(src).toBe("https://example.com/img.jpg");
    expect(style).toBeUndefined();
    expect(crop).toBeNull();
  });

  it("returns style when crop encoded in hash", () => {
    const url = encodeMediaCropRef("https://example.com/img.jpg", { cx: 0, cy: 0, zoom: 1 });
    const { style } = getMediaCropStyle(url);
    expect(style).toBeDefined();
    expect(style?.objectPosition).toBe("50% 50%");
    expect(style?.transformOrigin).toBe("center center");
  });

  it("override takes precedence over hash crop", () => {
    const url = encodeMediaCropRef("https://example.com/img.jpg", { cx: 0.5, cy: 0.5, zoom: 2 });
    const { crop } = getMediaCropStyle(url, { cx: -0.5, cy: -0.5, zoom: 1.5 });
    expect(crop?.cx).toBeCloseTo(-0.5);
    expect(crop?.cy).toBeCloseTo(-0.5);
    expect(crop?.zoom).toBeCloseTo(1.5);
  });

  it("null override falls back to hash crop", () => {
    const url = encodeMediaCropRef("https://example.com/img.jpg", { cx: 0.3, cy: 0.3, zoom: 1.2 });
    const { crop } = getMediaCropStyle(url, null);
    expect(crop?.cx).toBeCloseTo(0.3);
  });

  it("objectPosition reflects cx/cy correctly", () => {
    // cx=0.5 → x = 50 + 0.5*20 = 60, cy=-1 → y = 50 + (-1)*20 = 30
    const url = encodeMediaCropRef("https://example.com/img.jpg", { cx: 0.5, cy: -1, zoom: 1 });
    const { style } = getMediaCropStyle(url);
    expect(style?.objectPosition).toBe("60% 30%");
  });

  it("strips hash from src", () => {
    const url = encodeMediaCropRef("https://example.com/img.jpg", { cx: 0, cy: 0, zoom: 1 });
    const { src } = getMediaCropStyle(url);
    expect(src).toBe("https://example.com/img.jpg");
    expect(src).not.toContain("#");
  });
});
