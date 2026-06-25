/**
 * Unit tests for resolvePresetStyle() — Phase 2 crop resolver.
 *
 * Covers:
 *   - cx/cy extremes map to 0% / 50% / 100%
 *   - cropOverride takes priority over hash crop in URL
 *   - hash crop used when no override
 *   - no crop → no objectPosition
 *   - logo (contain-safe) → no objectPosition regardless of crop
 *   - no transform in output (blank-space guard)
 *   - empty URL → empty src, no crash
 */

import { describe, it, expect } from "vitest";
import { resolvePresetStyle } from "./imagePresets";

// ── Focal mapping ─────────────────────────────────────────────────────────────

describe("focal mapping", () => {
  it("cx=-1 cy=-1 → 0.0% 0.0%", () => {
    const { style } = resolvePresetStyle("https://example.com/img.jpg", "script-cover", { cx: -1, cy: -1 });
    expect(style.objectPosition).toBe("0.0% 0.0%");
  });

  it("cx=0 cy=0 → 50.0% 50.0%", () => {
    const { style } = resolvePresetStyle("https://example.com/img.jpg", "script-cover", { cx: 0, cy: 0 });
    expect(style.objectPosition).toBe("50.0% 50.0%");
  });

  it("cx=1 cy=1 → 100.0% 100.0%", () => {
    const { style } = resolvePresetStyle("https://example.com/img.jpg", "script-cover", { cx: 1, cy: 1 });
    expect(style.objectPosition).toBe("100.0% 100.0%");
  });

  it("cx=-1 cy=1 → 0.0% 100.0%", () => {
    const { style } = resolvePresetStyle("https://example.com/img.jpg", "avatar", { cx: -1, cy: 1 });
    expect(style.objectPosition).toBe("0.0% 100.0%");
  });
});

// ── Crop priority ─────────────────────────────────────────────────────────────

describe("crop priority", () => {
  it("cropOverride wins over hash crop in URL", () => {
    const urlWithHash = `https://example.com/img.jpg#srCrop=${encodeURIComponent(JSON.stringify({ cx: 0.5, cy: 0.5, zoom: 1 }))}`;
    const { style } = resolvePresetStyle(urlWithHash, "script-cover", { cx: -1, cy: -1 });
    // Override (-1,-1) → 0.0% 0.0%, not hash (0.5,0.5) → 75.0% 75.0%
    expect(style.objectPosition).toBe("0.0% 0.0%");
  });

  it("hash crop used when no override provided", () => {
    const urlWithHash = `https://example.com/img.jpg#srCrop=${encodeURIComponent(JSON.stringify({ cx: 0, cy: 0, zoom: 1 }))}`;
    const { style } = resolvePresetStyle(urlWithHash, "script-cover");
    expect(style.objectPosition).toBe("50.0% 50.0%");
  });

  it("hash crop used when override is null", () => {
    const urlWithHash = `https://example.com/img.jpg#srCrop=${encodeURIComponent(JSON.stringify({ cx: 1, cy: 1, zoom: 1 }))}`;
    const { style } = resolvePresetStyle(urlWithHash, "avatar", null);
    expect(style.objectPosition).toBe("100.0% 100.0%");
  });

  it("src stripped of hash fragment", () => {
    const urlWithHash = `https://example.com/img.jpg#srCrop=${encodeURIComponent(JSON.stringify({ cx: 0, cy: 0, zoom: 1 }))}`;
    const { src } = resolvePresetStyle(urlWithHash, "script-cover");
    expect(src).toBe("https://example.com/img.jpg");
    expect(src).not.toContain("#");
  });
});

// ── No crop ───────────────────────────────────────────────────────────────────

describe("no crop", () => {
  it("no crop → no objectPosition, objectFit: cover", () => {
    const { style } = resolvePresetStyle("https://example.com/img.jpg", "script-cover");
    expect(style.objectPosition).toBeUndefined();
    expect(style.objectFit).toBe("cover");
  });
});

// ── contain-safe (logo) ───────────────────────────────────────────────────────

describe("logo preset (contain-safe)", () => {
  it("no objectPosition even with crop", () => {
    const { style } = resolvePresetStyle("https://example.com/logo.png", "logo", { cx: -1, cy: -1 });
    expect(style.objectPosition).toBeUndefined();
  });

  it("objectFit is contain", () => {
    const { style } = resolvePresetStyle("https://example.com/logo.png", "logo", { cx: 0, cy: 0 });
    expect(style.objectFit).toBe("contain");
  });
});

// ── No transform ──────────────────────────────────────────────────────────────

describe("no transform output", () => {
  it("focal-cover preset: style has no transform", () => {
    const { style } = resolvePresetStyle("https://example.com/img.jpg", "author-banner", { cx: 0.5, cy: -0.3, zoom: 2 });
    expect((style as Record<string, unknown>).transform).toBeUndefined();
  });

  it("respectZoom opt-in applies scale for zoom > 1", () => {
    const { style } = resolvePresetStyle(
      "https://example.com/img.jpg",
      "hero-banner",
      { cx: 0.5, cy: -0.3, zoom: 2 },
      { respectZoom: true }
    );
    expect((style as Record<string, unknown>).transform).toBe("scale(2)");
    expect((style as Record<string, unknown>).transformOrigin).toBe("center center");
  });

  it("respectZoom ignores zoom <= 1 to avoid blank-space states", () => {
    const { style } = resolvePresetStyle(
      "https://example.com/img.jpg",
      "hero-banner",
      { cx: 0, cy: 0, zoom: 0.5 },
      { respectZoom: true }
    );
    expect((style as Record<string, unknown>).transform).toBeUndefined();
  });

  it("no crop case: style has no transform", () => {
    const { style } = resolvePresetStyle("https://example.com/img.jpg", "series-cover");
    expect((style as Record<string, unknown>).transform).toBeUndefined();
  });

  it("logo preset: style has no transform", () => {
    const { style } = resolvePresetStyle("https://example.com/logo.png", "logo", { cx: 0, cy: 0, zoom: 1.5 });
    expect((style as Record<string, unknown>).transform).toBeUndefined();
  });
});

// ── Edge cases ────────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("empty URL → src is empty string, no crash", () => {
    const { src, style } = resolvePresetStyle("", "script-cover");
    expect(src).toBe("");
    expect(style.objectFit).toBe("cover");
  });

  it("zoom field in crop is ignored (no transform side-effect)", () => {
    const { style } = resolvePresetStyle("https://example.com/img.jpg", "script-cover", { cx: 0, cy: 0, zoom: 3 });
    // Position still correct, no scale
    expect(style.objectPosition).toBe("50.0% 50.0%");
    expect((style as Record<string, unknown>).transform).toBeUndefined();
  });
});
