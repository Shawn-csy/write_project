import { describe, expect, it } from "vitest";
import { buildCustomMetadataEntries, buildJsonPreviewPayload } from "./scriptMetadataPayload";

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
  activityContent: "Content here",
  activityDemoLinks: [{ id: "1", name: "Demo", url: "https://demo", cast: "", description: "" }],
  activityWorkUrl: "https://work",
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
  it("buildCustomMetadataEntries does not write reserved structured keys", () => {
    const entries = buildCustomMetadataEntries(baseFields);
    // Series/SeriesOrder: now owned by structured API fields — must not appear in customMetadata
    expect(entries.find((entry) => entry.key === "Series")).toBeUndefined();
    expect(entries.find((entry) => entry.key === "SeriesOrder")).toBeUndefined();
    // Author/AuthorDisplayMode: now owned by structured api.author — must not appear in customMetadata
    expect(entries.find((entry) => entry.key === "Author")).toBeUndefined();
    expect(entries.find((entry) => entry.key === "AuthorDisplayMode")).toBeUndefined();
    // License: now owned by structured fields — must not appear in customMetadata
    expect(entries.find((entry) => entry.key === "LicenseCommercial")).toBeUndefined();
    expect(entries.find((entry) => entry.key === "LicenseDerivative")).toBeUndefined();
    expect(entries.find((entry) => entry.key === "LicenseNotify")).toBeUndefined();
    expect(entries.find((entry) => entry.key === "LicenseSpecialTerms")).toBeUndefined();
    expect(entries.find((entry) => entry.key === "LicenseTags")).toBeUndefined();
    // Content fields (PR-E2/E6): now owned by structured api fields — must not appear in customMetadata
    expect(entries.find((entry) => entry.key === "Synopsis")).toBeUndefined();
    expect(entries.find((entry) => entry.key === "Outline")).toBeUndefined();
    expect(entries.find((entry) => entry.key === "ActivityName")).toBeUndefined();
    expect(entries.find((entry) => entry.key === "ActivityBanner")).toBeUndefined();
    expect(entries.find((entry) => entry.key === "ActivityContent")).toBeUndefined();
    expect(entries.find((entry) => entry.key === "ActivityDemoLinks")).toBeUndefined();
    expect(entries.find((entry) => entry.key === "ActivityDemoUrl")).toBeUndefined();
    expect(entries.find((entry) => entry.key === "ActivityWorkUrl")).toBeUndefined();
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
