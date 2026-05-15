import { describe, expect, it } from "vitest";
import { applyPreservedAuthorEntries, buildCustomMetadataEntries, buildJsonPreviewPayload } from "./scriptMetadataPayload";

const baseFields = {
  title: "T",
  author: "Alice",
  authorDisplayMode: "override",
  date: "2026-01-01",
  synopsis: "syn",
  outline: "out",
  roleSetting: "",
  backgroundInfo: "",
  performanceInstruction: "",
  openingIntro: "",
  chapterSettings: "",
  activityName: "Act",
  activityBannerUrl: "",
  activityContent: "",
  activityDemoLinks: [{ id: "1", name: "Demo", url: "https://demo", cast: "", description: "" }],
  activityWorkUrl: "",
  contact: "",
  contactFields: [],
  seriesName: "",
  seriesId: "s1",
  seriesOrder: "2",
  coverUrl: "",
  status: "Private",
  licenseCommercial: "allow",
  licenseDerivative: "allow",
  licenseNotify: "required",
  licenseSpecialTerms: [],
  copyright: "",
  identity: "persona:1",
  selectedOrgId: null,
  currentTags: [{ id: "1", name: "t", color: "bg-red-500" }],
  customFields: [],
};

describe("scriptMetadataPayload", () => {
  it("buildCustomMetadataEntries resolves series name from seriesOptions", () => {
    const entries = buildCustomMetadataEntries(baseFields, {
      seriesOptions: [{ id: "s1", name: "Series A" }],
    });
    expect(entries.find((entry) => entry.key === "Series")?.value).toBe("Series A");
    expect(entries.find((entry) => entry.key === "Author")?.value).toBe("Alice");
  });

  it("preserveAuthor option skips new author entries", () => {
    const entries = buildCustomMetadataEntries(baseFields, {
      preserveAuthor: true,
    });
    expect(entries.find((entry) => entry.key === "Author")).toBeUndefined();
    expect(entries.find((entry) => entry.key === "AuthorDisplayMode")).toBeUndefined();
  });

  it("applyPreservedAuthorEntries replaces author-related entries", () => {
    const entries = buildCustomMetadataEntries(baseFields);
    const merged = applyPreservedAuthorEntries(entries, [
      { key: "Author", value: "Preserved" },
      { key: "AuthorDisplayMode", value: "badge" },
    ]);
    expect(merged.find((entry) => entry.key === "Author")?.value).toBe("Preserved");
    expect(merged.find((entry) => entry.key === "AuthorDisplayMode")?.value).toBe("badge");
  });

  it("buildJsonPreviewPayload keeps normalized demo links and tag structure", () => {
    const payload = buildJsonPreviewPayload(baseFields) as {
      activityDemoLinks?: Array<{ name?: string; url?: string }>;
      tags?: Array<{ name?: string; color?: string }>;
    };
    expect(payload.activityDemoLinks?.[0]?.name).toBe("Demo");
    expect(payload.activityDemoLinks?.[0]?.url).toBe("https://demo");
    expect(payload.tags?.[0]).toEqual({ name: "t", color: "bg-red-500" });
  });
});
