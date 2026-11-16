import { describe, expect, it } from "vitest";
import { enrichScript, groupScriptsIntoGalleryEntries } from "@write/public-ui";
import type { ExternalPublicScript } from "@/lib/types";
import { projectRecommendation } from "./recommendationModel";

const policies = new Map([["local", { scriptId: "local", reason: "age-gate" as const, showGateIndicator: true }]]);
const local = enrichScript({ id: "local", title: "Local", synopsis: "Short summary", author: { id: "author", displayName: "Writer" }, hasDemo: true });

describe("recommendation card projection", () => {
  it("keeps local read, author, Demo, adult policy and disabled author links", () => {
    const card = projectRecommendation({ kind: "gallery", entry: { type: "script", script: local } }, policies);
    expect(card).toMatchObject({ href: "/read/local", authorHref: "/author/author", summary: "Short summary", demoHref: "/demos?script=internal%3Alocal", showAgeGate: true });
    expect(projectRecommendation({ kind: "gallery", entry: { type: "script", script: { ...local, _disableAuthorLink: true } } }, policies).authorHref).toBeUndefined();
  });
  it("keeps external source, persona priority, normalized adult categories, Demo and view identity", () => {
    const item = { id: "external", title: "External", sourceUrl: "https://example.com/script", authorName: "Writer", authorPersonaId: "linked", authorUrl: "https://example.com/writer", categories: ["戀愛，成人向"], demoLinks: [{ url: "https://example.com/demo" }] } as ExternalPublicScript;
    expect(projectRecommendation({ kind: "external", item }, policies)).toMatchObject({ href: item.sourceUrl, external: true, authorHref: "/author/linked", demoHref: "/demos?script=external%3Aexternal", showAgeGate: true, externalViewId: "external" });
  });
  it.each([false, true])("keeps %s external-series navigation and series cover/summary", (external) => {
    const script = enrichScript({ ...local, id: external ? "external:chapter" : "chapter", seriesName: "My Series", series: { name: "My Series", coverUrl: "/media/series.webp" }, author: { id: "writer", displayName: "Writer", profileUrl: "https://example.com/writer" } });
    const entry = groupScriptsIntoGalleryEntries([script])[0];
    if (entry.type !== "series") throw new Error("Expected series");
    entry.summary = "Series summary";
    const card = projectRecommendation(external ? { kind: "external-series", entry } : { kind: "gallery", entry }, policies);
    expect(card).toMatchObject({ href: "/series/My%20Series", title: "My Series", coverUrl: "/media/series.webp", summary: "Series summary", chapterCount: 1 });
    expect(card.authorHref).toBe(external ? "/author/external/writer" : "/author/writer");
    expect(card.demoHref).toBe(external ? "/demos?script=external%3Achapter" : "/demos?script=internal%3Achapter");
  });
});
