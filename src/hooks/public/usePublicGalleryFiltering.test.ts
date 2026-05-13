import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePublicGalleryFiltering } from "./usePublicGalleryFiltering";

const baseProps = {
  scripts: [],
  authors: [],
  orgs: [],
  searchNeedle: "",
  selectedTags: [],
  selectedAuthorTags: [],
  selectedOrgTags: [],
  segmentFilter: "all",
  usageFilter: "all",
  featuredLaneMode: false,
};

const makeScript = (overrides = {}) => ({
  id: "s1",
  title: "Test Script",
  customMetadata: [],
  licenseCommercial: "",
  licenseDerivative: "",
  licenseNotify: "",
  persona: null,
  tags: [],
  views: 0,
  isPublic: 1,
  status: "Public",
  lastModified: Date.now(),
  ...overrides,
});

describe("usePublicGalleryFiltering – persona license fallback", () => {
  it("falls back to persona default when script has no license", () => {
    const scripts = [
      makeScript({
        persona: {
          defaultLicenseCommercial: "allow",
          defaultLicenseDerivative: "disallow",
          defaultLicenseNotify: "required",
        },
      }),
    ];
    const { result } = renderHook(() =>
      usePublicGalleryFiltering({ ...baseProps, scripts })
    );

    const enriched = result.current.scriptsWithMeta[0];
    expect(enriched._allowCommercial).toBe(true);
    expect(enriched._derivedLicenseTags).toContain("授權:可商用");
    expect(enriched._derivedLicenseTags).toContain("授權:不可改作");
  });

  it("prefers customMetadata license over persona default", () => {
    const scripts = [
      makeScript({
        customMetadata: [{ key: "LicenseCommercial", value: "disallow", type: "text" }],
        persona: {
          defaultLicenseCommercial: "allow",
        },
      }),
    ];
    const { result } = renderHook(() =>
      usePublicGalleryFiltering({ ...baseProps, scripts })
    );

    expect(result.current.scriptsWithMeta[0]._allowCommercial).toBe(false);
  });

  it("prefers top-level licenseCommercial over persona default", () => {
    const scripts = [
      makeScript({
        licenseCommercial: "disallow",
        persona: {
          defaultLicenseCommercial: "allow",
        },
      }),
    ];
    const { result } = renderHook(() =>
      usePublicGalleryFiltering({ ...baseProps, scripts })
    );

    expect(result.current.scriptsWithMeta[0]._allowCommercial).toBe(false);
  });

  it("uses script top-level license when persona is null", () => {
    const scripts = [makeScript({ licenseCommercial: "allow", persona: null })];
    const { result } = renderHook(() =>
      usePublicGalleryFiltering({ ...baseProps, scripts })
    );

    expect(result.current.scriptsWithMeta[0]._allowCommercial).toBe(true);
  });

  it("_allowCommercial is false when script and persona both have no license", () => {
    const scripts = [makeScript({ persona: null })];
    const { result } = renderHook(() =>
      usePublicGalleryFiltering({ ...baseProps, scripts })
    );

    expect(result.current.scriptsWithMeta[0]._allowCommercial).toBe(false);
  });

  it("includes persona-derived license tags in search text", () => {
    const scripts = [
      makeScript({
        persona: {
          defaultLicenseCommercial: "allow",
          defaultLicenseDerivative: "disallow",
          defaultLicenseNotify: "required",
        },
      }),
    ];
    const { result } = renderHook(() =>
      usePublicGalleryFiltering({ ...baseProps, scripts })
    );

    const enriched = result.current.scriptsWithMeta[0];
    expect(enriched._searchLicenseText).toContain("授權:可商用");
    expect(enriched._searchLicenseText).toContain("授權:不可改作");
    expect(enriched._searchLicenseText).toContain("授權:修改需告知");
  });

  it("persona license tags appear in licenseTagShortcuts", () => {
    const scripts = [
      makeScript({
        persona: { defaultLicenseCommercial: "allow" },
      }),
    ];
    const { result } = renderHook(() =>
      usePublicGalleryFiltering({ ...baseProps, scripts })
    );

    expect(result.current.licenseTagShortcuts).toContain("授權:可商用");
  });

  it("usageFilter=commercial only includes scripts with _allowCommercial", () => {
    const scripts = [
      makeScript({ id: "s1", licenseCommercial: "allow" }),
      makeScript({ id: "s2", licenseCommercial: "disallow" }),
      makeScript({
        id: "s3",
        persona: { defaultLicenseCommercial: "allow" },
      }),
    ];
    const { result } = renderHook(() =>
      usePublicGalleryFiltering({ ...baseProps, scripts, usageFilter: "commercial" })
    );

    const ids = result.current.filteredScripts.map((s) => s.id);
    expect(ids).toContain("s1");
    expect(ids).not.toContain("s2");
    expect(ids).toContain("s3");
  });
});
