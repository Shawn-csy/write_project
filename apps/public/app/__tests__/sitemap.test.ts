import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock apiFetch before importing sitemap ────────────────────────────────────
vi.mock("@/lib/api", () => ({
  apiFetch: vi.fn(),
}));

import { apiFetch } from "@/lib/api";
import type { PublicScript } from "@/lib/types";

const BASE = "https://open-scripts.shawnup.com";

function makeScript(overrides: Partial<PublicScript> = {}): PublicScript {
  return {
    id: "script-1",
    title: "Test Script",
    persona: { id: "persona-1", displayName: "Author A" },
    owner: { id: "owner-1" },
    organization: { id: "org-1", name: "Test Org" },
    series: { id: "s1", name: "Epic Series" },
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("sitemap", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockResolvedValue([makeScript()]);
  });

  async function getSitemap() {
    // Re-import each time to avoid module cache from previous tests.
    const mod = await import("../sitemap");
    return mod.default();
  }

  it("includes homepage", async () => {
    const urls = (await getSitemap()).map((e) => e.url);
    expect(urls).toContain(`${BASE}/`);
  });

  it("includes static pages", async () => {
    const urls = (await getSitemap()).map((e) => e.url);
    expect(urls).toContain(`${BASE}/about`);
    expect(urls).toContain(`${BASE}/help`);
    expect(urls).toContain(`${BASE}/license`);
    expect(urls).toContain(`${BASE}/privacy`);
    expect(urls).toContain(`${BASE}/terms`);
  });

  it("includes public script read pages", async () => {
    const urls = (await getSitemap()).map((e) => e.url);
    expect(urls).toContain(`${BASE}/read/script-1`);
  });

  it("includes canonical persona author pages", async () => {
    const urls = (await getSitemap()).map((e) => e.url);
    expect(urls).toContain(`${BASE}/author/persona-1`);
  });

  it("excludes owner-fallback author URLs (personaId === ownerId)", async () => {
    vi.mocked(apiFetch).mockResolvedValue([
      makeScript({ persona: { id: "owner-1" }, owner: { id: "owner-1" } }),
    ]);
    const urls = (await getSitemap()).map((e) => e.url);
    expect(urls).not.toContain(`${BASE}/author/owner-1`);
  });

  it("includes org pages", async () => {
    const urls = (await getSitemap()).map((e) => e.url);
    expect(urls).toContain(`${BASE}/org/org-1`);
  });

  it("includes series pages", async () => {
    const urls = (await getSitemap()).map((e) => e.url);
    expect(urls).toContain(`${BASE}/series/${encodeURIComponent("Epic Series")}`);
  });

  it("excludes /gallery", async () => {
    const urls = (await getSitemap()).map((e) => e.url);
    expect(urls.some((u) => u.includes("/gallery"))).toBe(false);
  });

  it("does not include tag pages by default", async () => {
    vi.mocked(apiFetch).mockResolvedValue([makeScript({ tags: [{ id: "t1", name: "配音" }] })]);
    const urls = (await getSitemap()).map((e) => e.url);
    expect(urls.some((u) => u.includes("/tag/"))).toBe(false);
  });

  it("fails closed when API fails instead of returning a static-only sitemap", async () => {
    vi.mocked(apiFetch).mockRejectedValue(new Error("network error"));
    await expect(getSitemap()).rejects.toThrow("network error");
  });

  it("de-duplicates persona entries across multiple scripts", async () => {
    vi.mocked(apiFetch).mockResolvedValue([
      makeScript({ id: "s1", persona: { id: "persona-1" }, owner: { id: "o1" } }),
      makeScript({ id: "s2", persona: { id: "persona-1" }, owner: { id: "o1" } }),
    ]);
    const urls = (await getSitemap()).map((e) => e.url);
    const authorUrls = urls.filter((u) => u.includes("/author/persona-1"));
    expect(authorUrls).toHaveLength(1);
  });
});
