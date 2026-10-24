import { describe, it, expect } from "vitest";
import { slimExternalScriptForHomepage, slimScriptForHomepage } from "../galleryProjection";
import type { ExternalPublicScript, PublicScript } from "../types";

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
      contentLength: 4200, // ScriptGalleryCard derives the estimated duration from this
    } as unknown as PublicScript;
    const slim = slimScriptForHomepage(script) as unknown as Record<string, unknown>;
    expect(slim.id).toBe("s1");
    expect(slim.synopsis).toBe("S");
    expect(slim.tags).toEqual([{ id: "t", name: "x" }]);
    expect(slim.contentLength).toBe(4200);
    expect(slim).not.toHaveProperty("markerTheme");
    expect(slim).not.toHaveProperty("markerThemeId");
    expect(slim).not.toHaveProperty("activityContent");
    expect(slim).not.toHaveProperty("publishReadiness");
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

  it("points the cover at the proxy route and omits it when absent", () => {
    expect(slimExternalScriptForHomepage(base).coverUrl).toBe("/api/public-media/external/e1");
    expect(slimExternalScriptForHomepage({ ...base, coverUrl: undefined }).coverUrl).toBeUndefined();
  });
});
