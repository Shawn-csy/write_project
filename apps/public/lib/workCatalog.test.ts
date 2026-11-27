import { describe, expect, it } from "vitest";
import { buildWorkCatalog, cardsForPersona } from "./workCatalog";
import type { PublicAudioWork, PublicPersona, PublicWorkParticipation } from "./types";

describe("public work cards", () => {
  const work = (id: string): PublicAudioWork => ({ id, title: "同名作品", url: `https://example.com/${id}` });
  it("groups only confirmed editions, keeping each platform and the free excerpt", () => {
    const paid = work("ab1beed0-1359-4b1c-94aa-a61f44795023");
    const free = work("84de9b5e-4827-4b76-8476-f3705349a5cb");
    const separate = work("another-recording");
    const catalog = buildWorkCatalog({ audioWorks: [free, separate, paid] });
    expect(catalog.get(`audio-${paid.id}`)?.links).toEqual([
      { href: paid.url, label: "example.com" }, { href: free.url, label: "example.com · 免費版（前半部）" },
    ]);
    expect(catalog.get(`audio-${separate.id}`)?.links).toHaveLength(1);
  });

  it("reuses a card referenced by URL without publishing a missing card or guessing an identity", () => {
    const participation = (id: string, url: string): PublicWorkParticipation => ({ id, url, title: "舊標題", creditedAs: "署名", creditRole: "post_production", coverUrl: "" });
    const person: PublicPersona = { id: "person", displayName: "署名", workParticipations: [
      participation("found", "https://open-scripts.shawnup.com/works/audio-recording"),
      participation("missing", "https://open-scripts.shawnup.com/works/audio-withdrawn"),
    ] };
    const catalog = buildWorkCatalog({ audioWorks: [work("recording")], personas: [person, { id: "namesake", displayName: "署名" }] });
    expect(cardsForPersona(catalog, person.id).map(card => [card.id,card.title])).toEqual([["audio-recording", "同名作品"]]);
    expect(cardsForPersona(catalog, "namesake")).toEqual([]);
  });

  it("keeps soundtrack credits on the soundtrack and links the published Steam parent", () => {
    const catalog = buildWorkCatalog({});
    expect(catalog.get("steam-3033250")?.kind).toBe("soundtrack");
    expect(catalog.get("steam-3033250")?.links).toContainEqual({ label: "本篇遊戲", href: "/games/2976870" });
  });
});
