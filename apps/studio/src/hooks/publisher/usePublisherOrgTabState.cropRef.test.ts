/**
 * Tests for usePublisherOrgTabState — cropRef contract.
 *
 * Covers:
 *   - openCropFromUrl("logoUrl", url) passes logoCrop as initialCropRef
 *   - openCropFromUrl("bannerUrl", url) passes bannerCrop as initialCropRef
 *   - applyCropRef writes to the correct crop field without upload
 *   - file upload sets cropSource.file, not .url (so onApplyCropRef stays undefined)
 */

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { usePublisherOrgTabState } from "./usePublisherOrgTabState";

vi.mock("../../lib/mediaLibrary", () => ({
  optimizeImageForUpload: vi.fn(),
  getImageUploadGuide: vi.fn(() => ({ supported: "", recommended: "" })),
}));
vi.mock("../../lib/api/media", () => ({
  uploadMediaObject: vi.fn(),
}));
vi.mock("./usePublisherOrgGuide", () => ({
  usePublisherOrgGuide: vi.fn(() => ({})),
}));
vi.mock("../../contexts/I18nContext", () => ({
  useI18n: vi.fn(() => ({ t: (k: string, fb = k) => fb })),
}));

import { uploadMediaObject } from "../../lib/api/media";

function makeOrgDraft(overrides = {}) {
  return {
    id: "org1",
    name: "Test Org",
    description: "",
    website: "",
    logoUrl: "https://example.com/logo.png",
    logoCrop: { cx: 0.2, cy: 0.1, zoom: 1.1 },
    bannerUrl: "https://example.com/banner.jpg",
    bannerCrop: { cx: -0.4, cy: 0.3, zoom: 1.5 },
    tags: [],
    ...overrides,
  };
}

function makeProps(orgDraftOverrides = {}) {
  const orgDraft = makeOrgDraft(orgDraftOverrides);
  const setOrgDraft = vi.fn();
  return {
    orgs: [],
    selectedOrgId: "org1",
    setSelectedOrgId: vi.fn(),
    orgDraft,
    setOrgDraft,
    orgTagInput: "",
    tagOptions: [],
    canManageOrgMembers: true,
  };
}

describe("usePublisherOrgTabState — cropRef", () => {
  beforeEach(() => vi.clearAllMocks());

  it("openCropFromUrl('logoUrl') passes logoCrop as initialCropRef", () => {
    const props = makeProps();
    const { result } = renderHook(() => usePublisherOrgTabState(props));

    act(() => { result.current.openCropFromUrl("logoUrl", "https://example.com/logo.png"); });

    expect(result.current.cropSource).toMatchObject({
      url: "https://example.com/logo.png",
      initialCropRef: { cx: 0.2, cy: 0.1, zoom: 1.1 },
    });
    expect(result.current.cropSource?.file).toBeUndefined();
  });

  it("openCropFromUrl('bannerUrl') passes bannerCrop as initialCropRef", () => {
    const props = makeProps();
    const { result } = renderHook(() => usePublisherOrgTabState(props));

    act(() => { result.current.openCropFromUrl("bannerUrl", "https://example.com/banner.jpg"); });

    expect(result.current.cropSource).toMatchObject({
      url: "https://example.com/banner.jpg",
      initialCropRef: { cx: -0.4, cy: 0.3, zoom: 1.5 },
    });
  });

  it("applyCropRef('logoUrl') updates logoCrop without upload", () => {
    const props = makeProps();
    const { result } = renderHook(() => usePublisherOrgTabState(props));
    const newCrop = { cx: 0.0, cy: 0.0, zoom: 1.0 };

    act(() => { result.current.applyCropRef("logoUrl", newCrop); });

    expect(props.setOrgDraft).toHaveBeenCalledWith(expect.any(Function));
    // Invoke the updater to verify the crop field is correct
    const updater = (props.setOrgDraft as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const prev = makeOrgDraft();
    expect(updater(prev)).toMatchObject({ logoCrop: newCrop });
    expect(uploadMediaObject).not.toHaveBeenCalled();
  });

  it("applyCropRef('bannerUrl') updates bannerCrop without upload", () => {
    const props = makeProps();
    const { result } = renderHook(() => usePublisherOrgTabState(props));
    const newCrop = { cx: 0.5, cy: -0.5, zoom: 2 };

    act(() => { result.current.applyCropRef("bannerUrl", newCrop); });

    const updater = (props.setOrgDraft as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const prev = makeOrgDraft();
    expect(updater(prev)).toMatchObject({ bannerCrop: newCrop });
    expect(uploadMediaObject).not.toHaveBeenCalled();
  });

  it("file upload sets cropSource.file, cropSource.url is absent", async () => {
    const props = makeProps();
    const { result } = renderHook(() => usePublisherOrgTabState(props));
    const file = new File(["data"], "logo.jpg", { type: "image/jpeg" });
    const fakeEvent = {
      target: { files: [file], value: "" },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => { await result.current.handleImageUpload("logoUrl")(fakeEvent); });

    expect(result.current.cropSource?.file).toBe(file);
    expect(result.current.cropSource?.url).toBeUndefined();
  });
});
