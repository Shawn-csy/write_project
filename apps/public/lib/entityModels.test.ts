import { describe, expect, it } from "vitest";
import { buildTagData, findExternalAuthorModel, findExternalOrgModel, publishedExternalScripts } from "./entityModels";
import type { ExternalPublicScript, PublicScript } from "./types";

const script = (id: string, tags: string[]): PublicScript => ({ id, title: id, tags: tags.map((name) => ({ name })) });
const external = (id: string, extra: Partial<ExternalPublicScript>): ExternalPublicScript =>
  ({ id, sourceUrl: `https://example.com/${id}`, title: id, status: "published", ...extra }) as ExternalPublicScript;

describe("publishedExternalScripts", () => {
  it("drops anything that is not published", () => {
    const bundle = { externalPublicScripts: [external("a", {}), external("b", { status: "hidden" as never })] };
    expect(publishedExternalScripts(bundle).map((item) => item.id)).toEqual(["a"]);
  });
});

describe("buildTagData", () => {
  it("collects local and published external works under the tag", () => {
    const data = buildTagData(
      {
        scripts: [script("s1", ["病嬌"]), script("s2", ["其他"])],
        externalPublicScripts: [external("e1", { categories: ["病嬌"] }), external("e2", { categories: ["病嬌"], status: "hidden" as never })],
      },
      "病嬌",
    );
    expect(data.scripts.map((s) => s.id)).toEqual(["s1"]);
    expect(data.externalScripts.map((s) => s.id)).toEqual(["e1"]);
  });

  it("is empty for a tag nothing uses, so the page can show a 404", () => {
    const data = buildTagData({ scripts: [script("s1", ["a"])], externalPublicScripts: [] }, "missing");
    expect(data.scripts).toHaveLength(0);
    expect(data.externalScripts).toHaveLength(0);
  });
});

describe("external author / organization models", () => {
  const items = [
    external("e1", { authorName: "Alice", authorBio: "bio", authorUrl: "https://x.com/alice", organizationName: "Studio" }),
    external("e2", { authorName: "alice", organizationName: "Studio", organizationBio: "org bio" }),
    external("e3", { authorName: "Bob" }),
  ];

  it("groups an author's works case-insensitively and takes profile data from any of them", () => {
    const model = findExternalAuthorModel(items, "Alice");
    expect(model?.items.map((item) => item.id)).toEqual(["e1", "e2"]);
    expect(model?.bio).toBe("bio");
    expect(model?.profileUrl).toBe("https://x.com/alice");
  });

  it("returns null for an unknown author or organization", () => {
    expect(findExternalAuthorModel(items, "nobody")).toBeNull();
    expect(findExternalOrgModel(items, "nobody")).toBeNull();
  });

  it("builds the organization model", () => {
    const model = findExternalOrgModel(items, "Studio");
    expect(model?.items).toHaveLength(2);
    expect(model?.bio).toBe("org bio");
  });
});
