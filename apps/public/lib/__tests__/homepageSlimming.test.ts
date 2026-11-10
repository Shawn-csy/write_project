import { describe, it, expect } from "vitest";
import { slimExternalScriptForHomepage, slimScriptForHomepage, toGalleryInput } from "../galleryProjection";
import type { ExternalPublicScript, PublicScript } from "../types";
import { parseHomepageBundle } from "../homepageBundle";

it("keeps author and organization data ready for homepage navigation", () => {
  const parsed = parseHomepageBundle({
    personas: [{ id: "author-1", displayName: "Author" }],
    organizations: [{ id: "org-1", name: "Org" }],
  });
  expect(parsed.personas.map((person) => person.id)).toEqual(["author-1"]);
  expect(parsed.organizations.map((org) => org.id)).toEqual(["org-1"]);
});

it("retains a small Demo marker for approved submissions without shipping their records", () => {
  const parsed = parseHomepageBundle({
    scripts: [{ id: "internal", title: "台本" }],
    externalPublicScripts: [{ id: "external", sourceUrl: "https://example.com/script", title: "外部台本" }],
    demoSubmissions: [
      { id: "d1", scriptType: "internal", scriptId: "internal", scriptTitle: "台本", scriptUrl: "", demoUrl: "https://example.com/demo", createdAt: 1 },
      { id: "d2", scriptType: "external", externalScriptId: "external", scriptTitle: "外部台本", scriptUrl: "", demoUrl: "https://example.com/demo", createdAt: 1 },
    ],
  });
  expect(parsed.scripts[0].hasDemo).toBe(true);
  expect(parsed.externalPublicScripts[0].hasDemo).toBe(true);
  expect(parsed).not.toHaveProperty("demoSubmissions");
});

it("exposes only published activities in the same order as the activity page", () => {
  const activity = (id: string, status: "draft" | "published", sortOrder: number) => ({
    id, slug: id, title: id, summary: "介紹", status, sortOrder, publishedAt: 1,
    coverUrl: "", body: "large body", scriptIds: [], externalScriptIds: [], acceptingSubmissions: false,
  });
  const parsed = parseHomepageBundle({
    activityPages: [activity("later", "published", 2), activity("draft", "draft", 0), activity("first", "published", 1)],
  });

  expect(parsed.activities.map((page) => page.slug)).toEqual(["first", "later"]);
  expect(parsed.activities[0]).not.toHaveProperty("body");
});

describe("slimScriptForHomepage", () => {
  it("drops reader-only and admin bookkeeping fields but keeps card data", () => {
    const script = {
      id: "s1",
      title: "T",
      synopsis: "S",
      tags: [{ id: "t", name: "x" }],
      markerTheme: { big: "x".repeat(1000) },
      markerThemeId: "m",
      activityContent: "a",
      publishReadiness: {},
      customMetadata: [{ key: "Contact", value: "Large reader-only notes" }],
      persona: { id: "p1", displayName: "Author", bio: "Private profile detail", defaultLicenseCommercial: "allow" },
      owner: { id: "u1", displayName: "Owner", email: "owner@example.com" },
      contentLength: 4200,
      licenseCommercial: "allow",
      series: { id: "series-1", name: "系列", summary: "系列介紹", coverUrl: "/series.jpg" },
    } as unknown as PublicScript;
    const slim = slimScriptForHomepage(script);
    expect(slim.id).toBe("s1");
    expect(slim.synopsis).toBe("S");
    expect(slim.tags).toEqual([{ id: "t", name: "x" }]);
    expect(slim.contentLength).toBe(4200);
    expect(slim.persona).toEqual({ id: "p1", displayName: "Author", avatar: undefined, defaultLicenseCommercial: "allow", defaultLicenseDerivative: undefined, defaultLicenseNotify: undefined });
    expect(slim.owner).not.toHaveProperty("email");
    expect(slim).not.toHaveProperty("customMetadata");
    expect(slim).not.toHaveProperty("markerTheme");
    expect(slim).not.toHaveProperty("markerThemeId");
    expect(slim).not.toHaveProperty("activityContent");
    expect(slim).not.toHaveProperty("publishReadiness");
    const card = toGalleryInput(slim);
    expect(card.contentLength).toBe(4200);
    expect(card.licenseCommercial).toBe("allow");
    expect(card.author).toEqual({ id: "p1", displayName: "Author", avatarUrl: undefined });
    expect(card.series).toMatchObject({ name: "系列", summary: "系列介紹", coverUrl: "/series.jpg" });
  });
});

describe("slimExternalScriptForHomepage", () => {
  const base: ExternalPublicScript = {
    id: "e1",
    sourceUrl: "https://example.com/a",
    title: "",
    remoteTitle: "遠端標題",
    remoteSummary: "遠端摘要",
    summaryOverride: "x".repeat(500),
    coverUrl: "https://example.com/cover.png",
    remoteCoverUrl: "https://example.com/remote.png",
    canonicalUrl: "https://example.com/canonical",
    authorBio: "b".repeat(400),
    categories: ["a"],
  };

  it("folds remote fallbacks into title/summary and drops the duplicates", () => {
    const slim = slimExternalScriptForHomepage(base) as unknown as Record<string, unknown>;
    expect(slim.title).toBe("遠端標題");
    expect(slim.summary).toBe("遠端摘要");
    for (const key of ["remoteTitle", "remoteSummary", "summaryOverride", "remoteCoverUrl", "canonicalUrl"]) {
      expect(slim).not.toHaveProperty(key);
    }
  });

  it("clips long summaries and bios", () => {
    const slim = slimExternalScriptForHomepage({ ...base, summary: "s".repeat(1000) });
    expect(slim.summary!.length).toBeLessThanOrEqual(601);
    expect(slim.summary!.endsWith("…")).toBe(true);
    expect(slim.authorBio).toBe("b".repeat(400)); // under the cap: untouched
  });

  it("keeps organization bios, which the organizations view reads", () => {
    const slim = slimExternalScriptForHomepage({ ...base, organizationName: "Org", organizationBio: "介紹" });
    expect(slim.organizationBio).toBe("介紹");
  });

  it("preserves the canonical author link used to merge public identities", () => {
    const slim = slimExternalScriptForHomepage({
      ...base,
      authorName: "安里",
      authorPersonaId: "persona-1",
      externalAuthorId: "external-author-1",
      authorKey: "writer-hiiro",
    });
    expect(slim.authorPersonaId).toBe("persona-1");
    expect(slim.externalAuthorId).toBe("external-author-1");
    expect(slim.authorKey).toBe("writer-hiiro");
  });

  it("points the cover at the proxy route and omits it when absent", () => {
    expect(slimExternalScriptForHomepage(base).coverUrl).toBe("/api/public-media/external/e1");
    expect(slimExternalScriptForHomepage({ ...base, coverUrl: undefined }).coverUrl).toBeUndefined();
  });
});
