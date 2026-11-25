import { describe, expect, it } from "vitest";
import { buildDemoCatalog } from "../demoCatalog";

describe("buildDemoCatalog", () => {
  it("retains playable details, searchable posting targets, and linked voice identities", () => {
    const catalog = buildDemoCatalog({
      scripts: [
        {
          id: "with-demo",
          title: "Already recorded",
          content: "Reader-only content",
          activityDemoLinks: JSON.stringify([{ name: "Recording", url: "https://example.com/demo", voiceActorIds: ["linked"] }]),
        },
        { id: "without-demo", title: "Available to record" },
      ],
      externalPublicScripts: [
        { id: "published", title: "Public external script", sourceUrl: "https://example.com/script", status: "published" },
        { id: "pending", title: "Pending script", sourceUrl: "https://example.com/pending", status: "draft" },
      ],
      personas: [
        { id: "linked", displayName: "Linked voice", avatar: "/media/avatar.jpg" },
        { id: "unused", displayName: "Other profile", bio: "Irrelevant profile details" },
      ],
    });

    expect(catalog.groups).toHaveLength(1);
    expect(catalog.groups[0]).toMatchObject({
      key: "internal:with-demo",
      demos: [{ name: "Recording", url: "https://example.com/demo", voiceActorIds: ["linked"] }],
    });
    expect(catalog.submissionTargets.map(({ value }) => value)).toEqual([
      "internal:with-demo", "internal:without-demo", "external:published",
    ]);
    expect(catalog.voiceActorIds).toEqual(["linked"]);
    expect(catalog.personas.map(({ id }) => id)).toEqual(["linked"]);
    expect(JSON.stringify(catalog)).not.toContain("Reader-only content");
  });
});
