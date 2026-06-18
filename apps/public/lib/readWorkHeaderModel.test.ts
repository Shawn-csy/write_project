import { describe, it, expect } from "vitest";
import { buildReadWorkHeaderModel } from "./readWorkHeaderModel";
import type { PublicScript } from "./types";
import type { ReadWorkHeaderStatsInput } from "./readWorkHeaderModel";

const BASE_STATS: ReadWorkHeaderStatsInput = {
  views: 10,
  likes: 3,
  liked: false,
  canDownload: false,
};

function baseScript(overrides: Partial<PublicScript> = {}): PublicScript {
  return { id: "s1", title: "Test Script", ...overrides };
}

describe("buildReadWorkHeaderModel — identity", () => {
  it("maps title and synopsis", () => {
    const model = buildReadWorkHeaderModel(
      baseScript({ synopsis: "A synopsis" }),
      BASE_STATS,
    );
    expect(model.title).toBe("Test Script");
    expect(model.synopsis).toBe("A synopsis");
  });

  it("no synopsis → undefined", () => {
    const model = buildReadWorkHeaderModel(baseScript(), BASE_STATS);
    expect(model.synopsis).toBeUndefined();
  });
});

describe("buildReadWorkHeaderModel — author", () => {
  it("persona takes priority over owner", () => {
    const model = buildReadWorkHeaderModel(
      baseScript({
        persona: { displayName: "PersonaName", id: "p1" },
        owner: { displayName: "OwnerName", id: "o1" },
      }),
      BASE_STATS,
    );
    expect(model.author?.displayName).toBe("PersonaName");
    expect(model.author?.href).toBe("/author/p1");
    expect(model.author?.isClickable).toBe(true);
  });

  it("owner used when no persona", () => {
    const model = buildReadWorkHeaderModel(
      baseScript({ owner: { displayName: "OwnerName" } }),
      BASE_STATS,
    );
    expect(model.author?.displayName).toBe("OwnerName");
    expect(model.author?.isClickable).toBe(false);
  });

  it("no author → null", () => {
    expect(buildReadWorkHeaderModel(baseScript(), BASE_STATS).author).toBeNull();
  });

  it("owner id is not treated as author href", () => {
    const model = buildReadWorkHeaderModel(
      baseScript({ owner: { id: "owner1", displayName: "OwnerName" } }),
      BASE_STATS,
    );
    expect(model.author?.displayName).toBe("OwnerName");
    expect(model.author?.isClickable).toBe(false);
    expect(model.author?.href).toBeUndefined();
    expect(model.author?.id).toBeUndefined();
  });

  it("non-linkable sentinel ids produce isClickable=false", () => {
    const model = buildReadWorkHeaderModel(
      baseScript({ persona: { displayName: "Ghost", id: "override-author" } }),
      BASE_STATS,
    );
    expect(model.author?.isClickable).toBe(false);
    expect(model.author?.href).toBeUndefined();
  });
});

describe("buildReadWorkHeaderModel — organization", () => {
  it("org with id gets href", () => {
    const model = buildReadWorkHeaderModel(
      baseScript({ organization: { id: "org1", name: "OrgName" } }),
      BASE_STATS,
    );
    expect(model.organization?.name).toBe("OrgName");
    expect(model.organization?.href).toBe("/org/org1");
  });

  it("org without id → no href", () => {
    const model = buildReadWorkHeaderModel(
      baseScript({ organization: { name: "OrgName" } }),
      BASE_STATS,
    );
    expect(model.organization?.href).toBeUndefined();
  });

  it("no org → null", () => {
    expect(buildReadWorkHeaderModel(baseScript(), BASE_STATS).organization).toBeNull();
  });
});

describe("buildReadWorkHeaderModel — series", () => {
  it("series with order", () => {
    const model = buildReadWorkHeaderModel(
      baseScript({ series: { name: "黑夜系列" }, seriesOrder: 2 }),
      BASE_STATS,
    );
    expect(model.series?.name).toBe("黑夜系列");
    expect(model.series?.order).toBe(2);
    expect(model.series?.href).toBe("/series/%E9%BB%91%E5%A4%9C%E7%B3%BB%E5%88%97");
  });

  it("no series → null", () => {
    expect(buildReadWorkHeaderModel(baseScript(), BASE_STATS).series).toBeNull();
  });
});

describe("buildReadWorkHeaderModel — stats", () => {
  it("maps stats from input", () => {
    const model = buildReadWorkHeaderModel(baseScript(), {
      views: 100,
      likes: 5,
      liked: true,
      canDownload: true,
    });
    expect(model.views).toBe(100);
    expect(model.likes).toBe(5);
    expect(model.isLiked).toBe(true);
    expect(model.canDownload).toBe(true);
  });
});

describe("buildReadWorkHeaderModel — duration estimate", () => {
  it("contentLength drives duration", () => {
    const model = buildReadWorkHeaderModel(
      baseScript({ contentLength: 4000 }),
      BASE_STATS,
    );
    expect(model.durationMinutes).toBe(10);
    expect(model.dialogueChars).toBe(2000);
  });

  it("no content → undefined", () => {
    const model = buildReadWorkHeaderModel(baseScript(), BASE_STATS);
    expect(model.durationMinutes).toBeUndefined();
    expect(model.dialogueChars).toBeUndefined();
  });
});

describe("buildReadWorkHeaderModel — tags", () => {
  it("maps tag names", () => {
    const model = buildReadWorkHeaderModel(
      baseScript({ tags: [{ name: "配音" }, { name: "奇幻" }] }),
      BASE_STATS,
    );
    expect(model.tags).toEqual(["配音", "奇幻"]);
  });
});
