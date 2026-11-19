/**
 * Tests for useScriptMetadataMediaHandlers — overlay target guard.
 *
 * Covers:
 *   - openCoverCropFromUrl passes coverCrop as initialCropRef
 *   - openCoverCropFromUrl does not trigger upload
 *   - applyCoverCropRef calls setCoverCrop only (no upload)
 *   - cropTarget is set to "cover" by openCoverCropFromUrl (guard in overlay)
 *   - activity banner upload sets cropTarget != "cover" (so overlay won't write coverCrop)
 */

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useScriptMetadataMediaHandlers } from "./useScriptMetadataMediaHandlers";

vi.mock("../../lib/mediaLibrary", () => ({
  optimizeImageForUpload: vi.fn(),
}));
vi.mock("../../lib/api/media", () => ({
  uploadMediaObject: vi.fn(),
}));

import { uploadMediaObject } from "../../lib/api/media";

function makeHandlers(overrides: Partial<Parameters<typeof useScriptMetadataMediaHandlers>[0]> = {}) {
  const defaults = {
    setCoverUrl: vi.fn(),
    setCoverCrop: vi.fn(),
    setCoverPreviewFailed: vi.fn(),
    setCoverUploadError: vi.fn(),
    setCoverUploadWarning: vi.fn(),
    setActivityBannerUrl: vi.fn(),
    setActivityBannerPreviewFailed: vi.fn(),
    setActivityBannerUploadError: vi.fn(),
    setActivityBannerUploadWarning: vi.fn(),
    setIsMediaPickerOpen: vi.fn(),
    setMediaPickerTarget: vi.fn(),
    mediaPickerTarget: "cover",
    setCropSource: vi.fn(),
    setCropTarget: vi.fn(),
    setCropPurpose: vi.fn(),
    setCropOpen: vi.fn(),
    coverUrl: "https://example.com/cover.jpg",
    coverCrop: { cx: 0.5, cy: -0.3, zoom: 1.2 },
    ...overrides,
  };
  return defaults;
}

describe("useScriptMetadataMediaHandlers — cropRef", () => {
  beforeEach(() => vi.clearAllMocks());

  it("openCoverCropFromUrl sets cropTarget='cover'", () => {
    const args = makeHandlers();
    const { result } = renderHook(() => useScriptMetadataMediaHandlers(args));

    act(() => { result.current.openCoverCropFromUrl(); });

    expect(args.setCropTarget).toHaveBeenCalledWith("cover");
  });

  it("openCoverCropFromUrl passes current coverCrop as initialCropRef in cropSource", () => {
    const args = makeHandlers();
    const { result } = renderHook(() => useScriptMetadataMediaHandlers(args));

    act(() => { result.current.openCoverCropFromUrl(); });

    expect(args.setCropSource).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://example.com/cover.jpg",
        initialCropRef: { cx: 0.5, cy: -0.3, zoom: 1.2 },
      })
    );
  });

  it("openCoverCropFromUrl does not call upload", () => {
    const args = makeHandlers();
    const { result } = renderHook(() => useScriptMetadataMediaHandlers(args));

    act(() => { result.current.openCoverCropFromUrl(); });

    expect(uploadMediaObject).not.toHaveBeenCalled();
  });

  it("applyCoverCropRef calls setCoverCrop without upload", () => {
    const args = makeHandlers();
    const { result } = renderHook(() => useScriptMetadataMediaHandlers(args));
    const crop = { cx: 0.1, cy: 0.2, zoom: 1 };

    act(() => { result.current.applyCoverCropRef(crop); });

    expect(args.setCoverCrop).toHaveBeenCalledWith(crop);
    expect(uploadMediaObject).not.toHaveBeenCalled();
  });

  it("handleActivityBannerUpload sets cropTarget='activityBanner', not 'cover'", async () => {
    const args = makeHandlers();
    const { result } = renderHook(() => useScriptMetadataMediaHandlers(args));
    const file = new File(["data"], "banner.jpg", { type: "image/jpeg" });
    const fakeEvent = {
      target: { files: [file], value: "" },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    await act(async () => { await result.current.handleActivityBannerUpload(fakeEvent); });

    expect(args.setCropTarget).toHaveBeenCalledWith("activityBanner");
    expect(args.setCropTarget).not.toHaveBeenCalledWith("cover");
  });
});
