import { describe, it, expect } from "vitest";
import {
  homeUrl,
  readUrl,
  authorUrl,
  orgUrl,
  seriesUrl,
  tagUrl,
  staticPageUrl,
  STATIC_PUBLIC_PAGES,
  isPersonaSitemapEligible,
  shouldIncludeTagsInSitemap,
  isExcludedRoute,
  toSitemapDate,
} from "../publicSeoModel";

const BASE = "https://open-scripts.shawnup.com";

describe("canonical URL builders", () => {
  it("homeUrl returns base with trailing slash", () => {
    expect(homeUrl()).toBe(`${BASE}/`);
  });

  it("readUrl encodes script ID", () => {
    expect(readUrl("abc123")).toBe(`${BASE}/read/abc123`);
  });

  it("authorUrl encodes persona ID", () => {
    expect(authorUrl("user-01")).toBe(`${BASE}/author/user-01`);
  });

  it("orgUrl encodes org ID", () => {
    expect(orgUrl("org-abc")).toBe(`${BASE}/org/org-abc`);
  });

  it("seriesUrl encodes UTF-8 series name", () => {
    const name = "異世界台本 & 奇幻";
    expect(seriesUrl(name)).toBe(`${BASE}/series/${encodeURIComponent(name)}`);
  });

  it("tagUrl encodes UTF-8 tag name", () => {
    const tag = "配音劇本/R18";
    expect(tagUrl(tag)).toBe(`${BASE}/tag/${encodeURIComponent(tag)}`);
  });

  it("staticPageUrl prepends base", () => {
    expect(staticPageUrl("/about")).toBe(`${BASE}/about`);
  });

  it("staticPageUrl adds leading slash when missing", () => {
    expect(staticPageUrl("help")).toBe(`${BASE}/help`);
  });
});

describe("STATIC_PUBLIC_PAGES", () => {
  it("contains expected pages", () => {
    expect(STATIC_PUBLIC_PAGES).toContain("/about");
    expect(STATIC_PUBLIC_PAGES).toContain("/help");
    expect(STATIC_PUBLIC_PAGES).toContain("/license");
    expect(STATIC_PUBLIC_PAGES).toContain("/privacy");
    expect(STATIC_PUBLIC_PAGES).toContain("/terms");
  });

  it("does not contain /gallery", () => {
    expect(STATIC_PUBLIC_PAGES).not.toContain("/gallery");
  });
});

describe("isPersonaSitemapEligible", () => {
  it("returns true when personaId differs from ownerId", () => {
    expect(isPersonaSitemapEligible("persona-1", "owner-1")).toBe(true);
  });

  it("returns false when personaId === ownerId (owner fallback)", () => {
    expect(isPersonaSitemapEligible("owner-1", "owner-1")).toBe(false);
  });

  it("returns false when personaId is undefined", () => {
    expect(isPersonaSitemapEligible(undefined, "owner-1")).toBe(false);
  });

  it("returns true when ownerId is absent (treat as canonical)", () => {
    expect(isPersonaSitemapEligible("persona-1", undefined)).toBe(true);
  });
});

describe("shouldIncludeTagsInSitemap", () => {
  it("returns false by default", () => {
    expect(shouldIncludeTagsInSitemap()).toBe(false);
  });
});

describe("toSitemapDate", () => {
  it("converts valid ISO string", () => {
    expect(toSitemapDate("2026-01-01T00:00:00Z")).toBe("2026-01-01T00:00:00.000Z");
  });

  it("converts Unix ms number", () => {
    expect(toSitemapDate(0)).toBe("1970-01-01T00:00:00.000Z");
  });

  it("returns fallback for undefined", () => {
    const fb = "2025-01-01T00:00:00.000Z";
    expect(toSitemapDate(undefined, fb)).toBe(fb);
  });

  it("returns fallback for malformed string", () => {
    const fb = "2025-01-01T00:00:00.000Z";
    expect(toSitemapDate("not-a-date", fb)).toBe(fb);
  });

  it("returns fallback for NaN-producing number", () => {
    const fb = "2025-01-01T00:00:00.000Z";
    expect(toSitemapDate(NaN, fb)).toBe(fb);
  });
});

describe("isExcludedRoute", () => {
  it("excludes /gallery", () => {
    expect(isExcludedRoute("/gallery")).toBe(true);
  });

  it("excludes /dashboard and subpaths", () => {
    expect(isExcludedRoute("/dashboard")).toBe(true);
    expect(isExcludedRoute("/dashboard/scripts")).toBe(true);
  });

  it("excludes /api paths", () => {
    expect(isExcludedRoute("/api/public-bundle")).toBe(true);
  });

  it("does not exclude public content routes", () => {
    expect(isExcludedRoute("/")).toBe(false);
    expect(isExcludedRoute("/read/abc")).toBe(false);
    expect(isExcludedRoute("/author/xyz")).toBe(false);
    expect(isExcludedRoute("/series/foo")).toBe(false);
  });
});
