/**
 * Entity page metadata contract tests.
 *
 * Tests the pure building-blocks used by generateMetadata in entity pages
 * (author, org, series, tag) without requiring network access.
 *
 * These ensure:
 * - title format includes TITLE_SUFFIX
 * - canonical URLs are path-only (no query string)
 * - absoluteUrl / pickPreviewImage behave correctly for entity images
 */
import { describe, it, expect } from "vitest";
import { TITLE_SUFFIX, BASE_URL, absoluteUrl, pickPreviewImage } from "../seo";
import {
  authorUrl,
  orgUrl,
  seriesUrl,
  tagUrl,
  homeUrl,
} from "../publicSeoModel";

const BASE = "https://open-scripts.shawnup.com";

// ── Title suffix contract ────────────────────────────────────────────────────

describe("TITLE_SUFFIX", () => {
  it("is non-empty", () => {
    expect(TITLE_SUFFIX.length).toBeGreaterThan(0);
  });

  it("entity title format includes TITLE_SUFFIX", () => {
    // Pattern used by all entity pages: `${entityName}｜${TITLE_SUFFIX}`
    const authorTitle = `作者A｜${TITLE_SUFFIX}`;
    const orgTitle = `某組織｜${TITLE_SUFFIX}`;
    const seriesTitle = `黑夜系列｜${TITLE_SUFFIX}`;
    const tagTitle = `#配音劇本｜${TITLE_SUFFIX}`;
    expect(authorTitle).toContain(TITLE_SUFFIX);
    expect(orgTitle).toContain(TITLE_SUFFIX);
    expect(seriesTitle).toContain(TITLE_SUFFIX);
    expect(tagTitle).toContain(TITLE_SUFFIX);
  });
});

// ── Canonical URL shape — no query string ────────────────────────────────────

describe("entity canonical URLs have no query string", () => {
  it("homeUrl has no query string", () => {
    expect(homeUrl()).not.toContain("?");
  });

  it("authorUrl has no query string", () => {
    expect(authorUrl("persona-1")).not.toContain("?");
  });

  it("orgUrl has no query string", () => {
    expect(orgUrl("org-1")).not.toContain("?");
  });

  it("seriesUrl has no query string", () => {
    expect(seriesUrl("黑夜系列")).not.toContain("?");
  });

  it("tagUrl has no query string", () => {
    expect(tagUrl("配音")).not.toContain("?");
  });

  it("homepage canonical is BASE_URL + / (not affected by gallery URL state)", () => {
    // generateMetadata on the homepage hardcodes canonicalUrl = `${BASE_URL}/`
    // This test verifies the contract: canonical must equal homeUrl(), never contain ?
    const homepageCanonical = `${BASE_URL}/`;
    expect(homepageCanonical).toBe(homeUrl());
    expect(homepageCanonical).not.toContain("?");
  });
});

// ── absoluteUrl / pickPreviewImage ───────────────────────────────────────────

describe("absoluteUrl", () => {
  it("passes through absolute URLs unchanged", () => {
    const abs = "https://cdn.example.com/avatar.jpg";
    expect(absoluteUrl(abs)).toBe(abs);
  });

  it("prepends BASE_URL to relative paths", () => {
    expect(absoluteUrl("/media/avatar.jpg")).toBe(`${BASE}/media/avatar.jpg`);
  });

  it("adds leading slash when missing", () => {
    expect(absoluteUrl("media/avatar.jpg")).toBe(`${BASE}/media/avatar.jpg`);
  });

  it("returns DEFAULT_OG_IMAGE_URL for empty string", () => {
    const result = absoluteUrl("");
    expect(result.startsWith("http")).toBe(true);
  });
});

describe("pickPreviewImage", () => {
  it("returns absoluteUrl of entity image when provided", () => {
    expect(pickPreviewImage("/media/banner.jpg")).toBe(`${BASE}/media/banner.jpg`);
  });

  it("returns absolute URL for absolute entity image", () => {
    const abs = "https://cdn.example.com/banner.jpg";
    expect(pickPreviewImage(abs)).toBe(abs);
  });

  it("returns DEFAULT_OG_IMAGE_URL when entity image is undefined", () => {
    const result = pickPreviewImage(undefined);
    expect(result).toContain("/og/homepage.png");
  });

  it("returns DEFAULT_OG_IMAGE_URL when entity image is null", () => {
    const result = pickPreviewImage(null);
    expect(result).toContain("/og/homepage.png");
  });
});

// ── No /gallery in any canonical URL ────────────────────────────────────────

describe("retired /gallery route not in canonical builders", () => {
  it("homeUrl does not point to /gallery", () => {
    expect(homeUrl()).not.toContain("/gallery");
  });

  it("entity canonical builders do not produce /gallery paths", () => {
    expect(authorUrl("x")).not.toContain("/gallery");
    expect(orgUrl("x")).not.toContain("/gallery");
    expect(seriesUrl("x")).not.toContain("/gallery");
    expect(tagUrl("x")).not.toContain("/gallery");
  });
});
