/**
 * Unit tests for mediaCropRef helpers:
 *   normalizeInitialCropRef — finite sanitize, clamp, fallback
 *   canApplyPersistentCropRef — URL guard
 */

import { describe, it, expect } from "vitest";
import { normalizeInitialCropRef, canApplyPersistentCropRef } from "./mediaCropRef";

describe("normalizeInitialCropRef", () => {
  it("returns null for null input", () => {
    expect(normalizeInitialCropRef(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(normalizeInitialCropRef(undefined)).toBeNull();
  });

  it("passes through valid crop unchanged", () => {
    expect(normalizeInitialCropRef({ cx: 0.3, cy: -0.2, zoom: 1.5 })).toEqual({
      cx: 0.3, cy: -0.2, zoom: 1.5,
    });
  });

  it("clamps cx/cy to -1..1", () => {
    const result = normalizeInitialCropRef({ cx: 5, cy: -999, zoom: 1 });
    expect(result?.cx).toBe(1);
    expect(result?.cy).toBe(-1);
  });

  it("replaces Infinity cx with 0", () => {
    const result = normalizeInitialCropRef({ cx: Infinity, cy: 0, zoom: 1 });
    expect(result?.cx).toBe(0);
  });

  it("replaces -Infinity cy with 0", () => {
    const result = normalizeInitialCropRef({ cx: 0, cy: -Infinity, zoom: 1 });
    expect(result?.cy).toBe(0);
  });

  it("replaces NaN cx with 0", () => {
    const result = normalizeInitialCropRef({ cx: NaN, cy: 0, zoom: 1 });
    expect(result?.cx).toBe(0);
  });

  it("replaces Infinity zoom with 1", () => {
    const result = normalizeInitialCropRef({ cx: 0, cy: 0, zoom: Infinity });
    expect(result?.zoom).toBe(1);
  });

  it("replaces zero zoom with 1", () => {
    const result = normalizeInitialCropRef({ cx: 0, cy: 0, zoom: 0 });
    expect(result?.zoom).toBe(1);
  });

  it("replaces negative zoom with 1", () => {
    const result = normalizeInitialCropRef({ cx: 0, cy: 0, zoom: -2 });
    expect(result?.zoom).toBe(1);
  });

  it("replaces NaN zoom with 1", () => {
    const result = normalizeInitialCropRef({ cx: 0, cy: 0, zoom: NaN });
    expect(result?.zoom).toBe(1);
  });

  it("fills missing fields with defaults", () => {
    const result = normalizeInitialCropRef({});
    expect(result).toEqual({ cx: 0, cy: 0, zoom: 1 });
  });
});

describe("canApplyPersistentCropRef", () => {
  it("returns true for https URL", () => {
    expect(canApplyPersistentCropRef("https://example.com/img.jpg")).toBe(true);
  });

  it("returns true for http URL", () => {
    expect(canApplyPersistentCropRef("http://localhost/img.jpg")).toBe(true);
  });

  it("returns true for absolute path", () => {
    expect(canApplyPersistentCropRef("/uploads/img.jpg")).toBe(true);
  });

  it("returns false for empty string", () => {
    expect(canApplyPersistentCropRef("")).toBe(false);
  });

  it("returns false for blob URL", () => {
    expect(canApplyPersistentCropRef("blob:http://localhost/abc-123")).toBe(false);
  });

  it("returns false for data URL", () => {
    expect(canApplyPersistentCropRef("data:image/png;base64,abc")).toBe(false);
  });

  it("returns false for plain filename", () => {
    expect(canApplyPersistentCropRef("cover.jpg")).toBe(false);
  });
});
