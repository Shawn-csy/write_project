import { describe, expect, it } from "vitest";
import { fromApiToDraft, fromDraftToPayload, emptyDraft } from "./scriptMetadataAdapter";

// ---------------------------------------------------------------------------
// fromApiToDraft — structured field priority (PR-E2)
// ---------------------------------------------------------------------------

describe("fromApiToDraft — structured content fields", () => {
  it("reads synopsis/outline/activityName/activityBannerUrl from structured fields", () => {
    const draft = fromApiToDraft({
      id: "s-1",
      title: "T",
      synopsis: "結構化簡介",
      outline: "結構化大綱",
      activityName: "結構化活動名",
      activityBannerUrl: "https://example.com/banner.jpg",
      customMetadata: [],
      tags: [],
    });
    expect(draft.synopsis).toBe("結構化簡介");
    expect(draft.outline).toBe("結構化大綱");
    expect(draft.activityName).toBe("結構化活動名");
    expect(draft.activityBannerUrl).toBe("https://example.com/banner.jpg");
  });

  it("ignores custom Synopsis/Outline/ActivityName/ActivityBanner — structured fields only (E5-1)", () => {
    // Legacy custom fallback removed in E5-1. Custom keys are no longer read for these 4 fields.
    const draft = fromApiToDraft({
      id: "s-2",
      title: "T",
      customMetadata: [
        { key: "Synopsis", value: "legacy 簡介" },
        { key: "Outline", value: "legacy 大綱" },
        { key: "ActivityName", value: "legacy 活動名" },
        { key: "ActivityBanner", value: "https://example.com/legacy-banner.jpg" },
      ],
      tags: [],
    });
    expect(draft.synopsis).toBe("");
    expect(draft.outline).toBe("");
    expect(draft.activityName).toBe("");
    expect(draft.activityBannerUrl).toBe("");
  });

  it("structured field wins over custom key when both present", () => {
    const draft = fromApiToDraft({
      id: "s-3",
      title: "T",
      synopsis: "新簡介",
      activityName: "新活動",
      customMetadata: [
        { key: "Synopsis", value: "舊 custom 簡介" },
        { key: "ActivityName", value: "舊 custom 活動名" },
      ],
      tags: [],
    });
    expect(draft.synopsis).toBe("新簡介");
    expect(draft.activityName).toBe("新活動");
  });

  it("reads public metadata from canonical fields and ignores legacy customMetadata", () => {
    const draft = fromApiToDraft({
      id: "s-public-1",
      title: "T",
      author: "Badge Author",
      authorDisplayMode: "override",
      authorOverrideName: "Canonical Author",
      targetAudience: "全性向",
      contentRating: "全年齡向",
      licenseSpecialTerms: JSON.stringify(["canonical term"]),
      customMetadata: [
        { key: "Author", value: "legacy author" },
        { key: "AuthorDisplayMode", value: "badge" },
        { key: "TargetAudience", value: "男性向" },
        { key: "ContentRating", value: "成人向" },
        { key: "LicenseSpecialTerms", value: JSON.stringify(["legacy term"]) },
      ],
      tags: [{ id: "tag-1", name: "成人向" }],
    });

    expect(draft.author).toBe("Canonical Author");
    expect(draft.authorDisplayMode).toBe("override");
    expect(draft.targetAudience).toBe("全性向");
    expect(draft.contentRating).toBe("全年齡向");
    expect(draft.licenseSpecialTerms).toEqual(["canonical term"]);
  });

  it("does not hydrate public metadata from tags or legacy customMetadata when canonical fields are empty", () => {
    const draft = fromApiToDraft({
      id: "s-public-2",
      title: "T",
      customMetadata: [
        { key: "Author", value: "legacy author" },
        { key: "AuthorDisplayMode", value: "override" },
        { key: "LicenseSpecialTerms", value: JSON.stringify(["legacy term"]) },
      ],
      tags: [
        { id: "tag-1", name: "成人向" },
        { id: "tag-2", name: "女性向" },
      ],
    });

    expect(draft.author).toBe("");
    expect(draft.authorDisplayMode).toBe("badge");
    expect(draft.targetAudience).toBe("");
    expect(draft.contentRating).toBe("");
    expect(draft.licenseSpecialTerms).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// fromApiToDraft — E6 structured fields (activityContent/WorkUrl/DemoLinks)
// ---------------------------------------------------------------------------

describe("fromApiToDraft — E6 activity structured fields", () => {
  it("reads activityContent/activityWorkUrl from structured fields", () => {
    const draft = fromApiToDraft({
      id: "s-e6-1",
      title: "T",
      activityContent: "活動說明",
      activityWorkUrl: "https://example.com/work",
      customMetadata: [
        { key: "ActivityContent", value: "舊 custom content" },
        { key: "ActivityWorkUrl", value: "https://old-work" },
      ],
      tags: [],
    });
    expect(draft.activityContent).toBe("活動說明");
    expect(draft.activityWorkUrl).toBe("https://example.com/work");
  });

  it("reads activityDemoLinks from structured JSON field", () => {
    const links = [{ name: "Demo A", url: "https://example.com/a", cast: "", description: "" }];
    const draft = fromApiToDraft({
      id: "s-e6-2",
      title: "T",
      activityDemoLinks: JSON.stringify(links),
      customMetadata: [],
      tags: [],
    });
    expect(Array.isArray(draft.activityDemoLinks)).toBe(true);
    expect((draft.activityDemoLinks as Array<{ url: string }>)[0]?.url).toBe("https://example.com/a");
  });

  it("ignores custom ActivityContent/ActivityWorkUrl/ActivityDemoLinks when structured fields absent (E6)", () => {
    const draft = fromApiToDraft({
      id: "s-e6-3",
      title: "T",
      customMetadata: [
        { key: "ActivityContent", value: "legacy content" },
        { key: "ActivityWorkUrl", value: "https://legacy-work" },
        { key: "ActivityDemoLinks", value: JSON.stringify([{ name: "x", url: "https://x" }]) },
      ],
      tags: [],
    });
    expect(draft.activityContent).toBe("");
    expect(draft.activityWorkUrl).toBe("");
    expect(draft.activityDemoLinks).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// fromDraftToPayload — structured field output (PR-E2)
// ---------------------------------------------------------------------------

describe("fromDraftToPayload — structured content fields in payload", () => {
  it("includes synopsis/outline/activityName/activityBannerUrl as top-level payload fields", () => {
    const draft = {
      ...emptyDraft(),
      title: "T",
      personaId: "p-1",
      synopsis: "簡介",
      outline: "大綱",
      activityName: "活動名",
      activityBannerUrl: "https://example.com/banner.jpg",
    };
    const payload = fromDraftToPayload(draft);
    expect(payload.synopsis).toBe("簡介");
    expect(payload.outline).toBe("大綱");
    expect(payload.activityName).toBe("活動名");
    expect(payload.activityBannerUrl).toBe("https://example.com/banner.jpg");
  });

  it("omits Synopsis/Outline/ActivityName/ActivityBanner from customMetadata", () => {
    const draft = {
      ...emptyDraft(),
      title: "T",
      personaId: "p-1",
      synopsis: "簡介",
      outline: "大綱",
      activityName: "活動名",
      activityBannerUrl: "https://example.com/banner.jpg",
    };
    const payload = fromDraftToPayload(draft);
    const metaKeys = (payload.customMetadata || []).map((e) => String(e.key || "").toLowerCase());
    expect(metaKeys).not.toContain("synopsis");
    expect(metaKeys).not.toContain("outline");
    expect(metaKeys).not.toContain("activityname");
    expect(metaKeys).not.toContain("activitybanner");
  });

  it("sets payload synopsis/outline/activityName/activityBannerUrl to null when draft fields are empty", () => {
    const draft = { ...emptyDraft(), title: "T", personaId: "p-1" };
    const payload = fromDraftToPayload(draft);
    expect(payload.synopsis).toBeNull();
    expect(payload.outline).toBeNull();
    expect(payload.activityName).toBeNull();
    expect(payload.activityBannerUrl).toBeNull();
    expect(payload.activityContent).toBeNull();
    expect(payload.activityWorkUrl).toBeNull();
    expect(payload.activityDemoLinks).toBeNull();
  });

  it("includes activityContent/activityWorkUrl/activityDemoLinks as top-level payload fields (E6)", () => {
    const draft = {
      ...emptyDraft(),
      title: "T",
      personaId: "p-1",
      activityContent: "活動說明",
      activityWorkUrl: "https://example.com/work",
      activityDemoLinks: [{ id: "1", name: "Demo A", url: "https://example.com/a", cast: "", description: "" }],
    };
    const payload = fromDraftToPayload(draft);
    expect(payload.activityContent).toBe("活動說明");
    expect(payload.activityWorkUrl).toBe("https://example.com/work");
    expect(typeof payload.activityDemoLinks).toBe("string");
    expect(JSON.parse(payload.activityDemoLinks as string)[0].url).toBe("https://example.com/a");
  });

  it("includes public metadata as top-level canonical payload fields", () => {
    const draft = {
      ...emptyDraft(),
      title: "T",
      author: "公開筆名",
      authorDisplayMode: "override",
      targetAudience: "全性向",
      contentRating: "全年齡向",
      licenseSpecialTerms: ["署名", "非商用"],
    };
    const payload = fromDraftToPayload(draft);
    expect(payload.author).toBe("公開筆名");
    expect(payload.authorDisplayMode).toBe("override");
    expect(payload.authorOverrideName).toBe("公開筆名");
    expect(payload.targetAudience).toBe("全性向");
    expect(payload.contentRating).toBe("全年齡向");
    expect(payload.licenseSpecialTerms).toBe(JSON.stringify(["署名", "非商用"]));
  });

  it("omits public metadata legacy keys from customMetadata", () => {
    const draft = {
      ...emptyDraft(),
      title: "T",
      author: "公開筆名",
      authorDisplayMode: "override",
      targetAudience: "全性向",
      contentRating: "全年齡向",
      licenseSpecialTerms: ["署名"],
    };
    const payload = fromDraftToPayload(draft);
    const metaKeys = (payload.customMetadata || []).map((e) => String(e.key || "").toLowerCase());
    expect(metaKeys).not.toContain("author");
    expect(metaKeys).not.toContain("authors");
    expect(metaKeys).not.toContain("authordisplaymode");
    expect(metaKeys).not.toContain("targetaudience");
    expect(metaKeys).not.toContain("contentrating");
    expect(metaKeys).not.toContain("licensespecialterms");
  });

  it("omits ActivityContent/ActivityDemoLinks/ActivityDemoUrl/ActivityWorkUrl from customMetadata (E6)", () => {
    const draft = {
      ...emptyDraft(),
      title: "T",
      personaId: "p-1",
      activityContent: "活動說明",
      activityWorkUrl: "https://example.com/work",
      activityDemoLinks: [{ id: "1", name: "Demo A", url: "https://example.com/a", cast: "", description: "" }],
    };
    const payload = fromDraftToPayload(draft);
    const metaKeys = (payload.customMetadata || []).map((e) => String(e.key || "").toLowerCase());
    expect(metaKeys).not.toContain("activitycontent");
    expect(metaKeys).not.toContain("activitydemolinks");
    expect(metaKeys).not.toContain("activitydemourl");
    expect(metaKeys).not.toContain("activityworkurl");
  });
});
