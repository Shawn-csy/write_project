/**
 * Metadata Contract Tests (E7)
 *
 * Verifies the single-track metadata invariants:
 *   1. STRUCTURED_FIELDS — every structured field is read from api, never from customMetadata
 *   2. RESERVED_CUSTOM_KEYS — none of these may appear in a save payload's customMetadata
 *   3. fromDraftToPayload — structured fields land at top-level, not in customMetadata
 *   4. Pollution guard — customMetadata containing reserved keys must not affect structured fields
 *
 * This suite is the canonical regression gate for the boundary defined in
 * docs/refactor/metadata-boundary.md.
 */

import { describe, expect, it } from "vitest";
import { fromApiToDraft, fromDraftToPayload, emptyDraft } from "./scriptMetadataAdapter";
import { RESERVED_CUSTOM_KEYS, normalizeMetaKey } from "./metadataBoundary";

// ---------------------------------------------------------------------------
// Contract matrix — every structured field and its forbidden custom alias
// ---------------------------------------------------------------------------

const STRUCTURED_FIELDS: Array<{
  apiField: keyof typeof EMPTY_API;
  draftField: string;
  forbiddenCustomKeys: string[];
}> = [
  {
    apiField: "synopsis",
    draftField: "synopsis",
    forbiddenCustomKeys: ["Synopsis", "synopsis", "Summary", "summary", "Description", "Notes"],
  },
  {
    apiField: "outline",
    draftField: "outline",
    forbiddenCustomKeys: ["Outline", "outline"],
  },
  {
    apiField: "activityName",
    draftField: "activityName",
    forbiddenCustomKeys: ["ActivityName", "activityname", "EventName", "eventname"],
  },
  {
    apiField: "activityBannerUrl",
    draftField: "activityBannerUrl",
    forbiddenCustomKeys: ["ActivityBanner", "activitybanner", "EventBanner", "eventbanner"],
  },
  {
    apiField: "activityContent",
    draftField: "activityContent",
    forbiddenCustomKeys: ["ActivityContent", "activitycontent", "EventContent", "eventcontent"],
  },
  {
    apiField: "activityWorkUrl",
    draftField: "activityWorkUrl",
    forbiddenCustomKeys: ["ActivityWorkUrl", "activityworkurl", "EventWorkLink", "eventworklink"],
  },
];

const EMPTY_API = {
  id: "s-contract",
  title: "Contract",
  tags: [] as Array<{ name: string }>,
  customMetadata: [] as Array<{ key: string; value: string }>,
  synopsis: undefined as string | null | undefined,
  outline: undefined as string | null | undefined,
  activityName: undefined as string | null | undefined,
  activityBannerUrl: undefined as string | null | undefined,
  activityContent: undefined as string | null | undefined,
  activityWorkUrl: undefined as string | null | undefined,
  activityDemoLinks: undefined as string | null | undefined,
};

// ---------------------------------------------------------------------------
// 1. Structured fields are read from API, not from customMetadata
// ---------------------------------------------------------------------------

describe("Contract: structured fields read from API only", () => {
  for (const { apiField, draftField, forbiddenCustomKeys } of STRUCTURED_FIELDS) {
    it(`${apiField}: structured value taken, custom key ignored`, () => {
      const api = {
        ...EMPTY_API,
        [apiField]: "structured-value",
        customMetadata: forbiddenCustomKeys.map((k) => ({ key: k, value: "custom-value" })),
      };
      const draft = fromApiToDraft(api);
      expect((draft as Record<string, unknown>)[draftField]).toBe("structured-value");
    });

    it(`${apiField}: custom key ignored when structured field absent`, () => {
      const api = {
        ...EMPTY_API,
        [apiField]: undefined,
        customMetadata: forbiddenCustomKeys.map((k) => ({ key: k, value: "should-be-ignored" })),
      };
      const draft = fromApiToDraft(api);
      expect((draft as Record<string, unknown>)[draftField]).toBe("");
    });
  }

  it("activityDemoLinks: structured JSON field parsed, custom key ignored", () => {
    const links = [{ name: "D", url: "https://example.com/d", cast: "", description: "" }];
    const api = {
      ...EMPTY_API,
      activityDemoLinks: JSON.stringify(links),
      customMetadata: [
        { key: "ActivityDemoLinks", value: JSON.stringify([{ url: "https://legacy" }]) },
        { key: "ActivityDemoUrl", value: "https://legacy-url" },
        { key: "EventDemoLinks", value: "[]" },
        { key: "EventDemoLink", value: "https://event-legacy" },
      ],
    };
    const draft = fromApiToDraft(api);
    const demoLinks = draft.activityDemoLinks as Array<{ url: string }>;
    expect(demoLinks.length).toBe(1);
    expect(demoLinks[0].url).toBe("https://example.com/d");
  });

  it("activityDemoLinks: empty when structured absent and custom keys present", () => {
    const api = {
      ...EMPTY_API,
      activityDemoLinks: undefined,
      customMetadata: [
        { key: "ActivityDemoLinks", value: JSON.stringify([{ url: "https://legacy" }]) },
        { key: "ActivityDemoUrl", value: "https://legacy-url" },
      ],
    };
    const draft = fromApiToDraft(api);
    expect(draft.activityDemoLinks).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// 2. RESERVED_CUSTOM_KEYS covers all structured field aliases
// ---------------------------------------------------------------------------

describe("Contract: RESERVED_CUSTOM_KEYS is complete", () => {
  const REQUIRED_RESERVED = [
    // E1-E5 fields
    "synopsis", "outline", "activityname", "activitybanner",
    // E6 fields
    "activitycontent", "activityworkurl", "activitydemolinks", "activitydemourl",
    // Event aliases
    "eventname", "eventbanner", "eventcontent", "eventworklink", "eventdemolinks", "eventdemolink",
    // Auth / license / series
    "author", "authordisplaymode", "licensecommercial", "licensederivative",
    "licensenotify", "licensespecialterms", "series", "seriesorder",
    "marker_legend",
  ];

  for (const key of REQUIRED_RESERVED) {
    it(`RESERVED_CUSTOM_KEYS contains "${key}"`, () => {
      expect(RESERVED_CUSTOM_KEYS.has(normalizeMetaKey(key))).toBe(true);
    });
  }
});

// ---------------------------------------------------------------------------
// 3. fromDraftToPayload: structured fields at top-level, not in customMetadata
// ---------------------------------------------------------------------------

describe("Contract: fromDraftToPayload places structured fields at top-level", () => {
  const fullDraft = {
    ...emptyDraft(),
    title: "T",
    personaId: "p-1",
    synopsis: "簡介",
    outline: "大綱",
    activityName: "活動名",
    activityBannerUrl: "https://example.com/banner.jpg",
    activityContent: "活動說明",
    activityWorkUrl: "https://example.com/work",
    activityDemoLinks: [{ id: "1", name: "Demo", url: "https://example.com/demo", cast: "", description: "" }],
  };

  it("all structured fields present at payload top-level", () => {
    const payload = fromDraftToPayload(fullDraft);
    expect(payload.synopsis).toBe("簡介");
    expect(payload.outline).toBe("大綱");
    expect(payload.activityName).toBe("活動名");
    expect(payload.activityBannerUrl).toBe("https://example.com/banner.jpg");
    expect(payload.activityContent).toBe("活動說明");
    expect(payload.activityWorkUrl).toBe("https://example.com/work");
    expect(typeof payload.activityDemoLinks).toBe("string");
  });

  it("none of the structured fields appear in customMetadata", () => {
    const payload = fromDraftToPayload(fullDraft);
    const metaKeys = (payload.customMetadata || []).map((e) =>
      normalizeMetaKey(e.key)
    );
    const blocked = [
      "synopsis", "outline", "activityname", "activitybanner",
      "activitycontent", "activityworkurl", "activitydemolinks", "activitydemourl",
      "eventname", "eventbanner", "eventcontent", "eventworklink", "eventdemolinks", "eventdemolink",
    ];
    for (const key of blocked) {
      expect(metaKeys).not.toContain(key);
    }
  });

  it("all reserved keys absent from customMetadata (pollution guard)", () => {
    const payload = fromDraftToPayload(fullDraft);
    const metaKeys = (payload.customMetadata || []).map((e) => normalizeMetaKey(e.key));
    for (const key of metaKeys) {
      expect(RESERVED_CUSTOM_KEYS.has(key)).toBe(false);
    }
  });

  it("null when draft fields empty", () => {
    const emptyPayload = fromDraftToPayload({ ...emptyDraft(), title: "T" });
    expect(emptyPayload.synopsis).toBeNull();
    expect(emptyPayload.outline).toBeNull();
    expect(emptyPayload.activityName).toBeNull();
    expect(emptyPayload.activityBannerUrl).toBeNull();
    expect(emptyPayload.activityContent).toBeNull();
    expect(emptyPayload.activityWorkUrl).toBeNull();
    expect(emptyPayload.activityDemoLinks).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 4. Pollution guard: reserved keys in customMetadata fields input don't leak
// ---------------------------------------------------------------------------

describe("Contract: reserved keys in customFields input do not leak to customMetadata payload", () => {
  it("customFields containing a reserved key name are filtered out of payload customMetadata", () => {
    // User-defined custom fields that happen to use a reserved key name
    // should NOT appear in the saved customMetadata (boundary enforcement).
    const draft = {
      ...emptyDraft(),
      title: "T",
      personaId: "p-1",
      customFields: [
        { id: "cf-1", key: "Synopsis", value: "user tries to write Synopsis", type: "text" as const },
        { id: "cf-2", key: "ActivityContent", value: "user tries to write ActivityContent", type: "text" as const },
        { id: "cf-3", key: "SafeKey", value: "this should pass", type: "text" as const },
      ],
    };
    const payload = fromDraftToPayload(draft);
    const metaKeys = (payload.customMetadata || []).map((e) => normalizeMetaKey(e.key));
    // Reserved keys must be blocked
    expect(metaKeys).not.toContain("synopsis");
    expect(metaKeys).not.toContain("activitycontent");
    // Safe key must pass through
    expect(metaKeys).toContain("safekey");
  });
});
