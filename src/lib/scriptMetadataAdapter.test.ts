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

  it("falls back to custom Synopsis/Outline/ActivityName/ActivityBanner when structured fields absent", () => {
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
    expect(draft.synopsis).toBe("legacy 簡介");
    expect(draft.outline).toBe("legacy 大綱");
    expect(draft.activityName).toBe("legacy 活動名");
    expect(draft.activityBannerUrl).toBe("https://example.com/legacy-banner.jpg");
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
  });
});
