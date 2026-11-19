/**
 * Tests for useMetadataCoverUpload — focal-point crop contract.
 *
 * Covers:
 *   - openCropFromUrl sets cropSource.url and passes current coverCrop as initialCropRef
 *   - openCropFromUrl does NOT trigger upload
 *   - applyCoverCropRef updates coverCrop without calling upload
 *   - file upload does NOT pass onApplyCropRef (cropSource.url is absent)
 */

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { useMetadataCoverUpload } from "./useMetadataCoverUpload";

vi.mock("../../lib/mediaLibrary", () => ({
  optimizeImageForUpload: vi.fn(),
  getImageUploadGuide: vi.fn(() => ({ supported: "", recommended: "" })),
}));

vi.mock("../../lib/api/media", () => ({
  uploadMediaObject: vi.fn(),
}));

import { uploadMediaObject } from "../../lib/api/media";

describe("useMetadataCoverUpload — cropRef contract", () => {
  beforeEach(() => vi.clearAllMocks());

  it("openCropFromUrl sets cropSource.url with existing coverCrop as initialCropRef", () => {
    const setCoverUrl = vi.fn();
    const setCoverCrop = vi.fn();
    const existingCrop = { cx: 0.3, cy: -0.2, zoom: 1.5 };

    const { result } = renderHook(() =>
      useMetadataCoverUpload({ setCoverUrl, setCoverCrop, coverCrop: existingCrop })
    );

    act(() => {
      result.current.openCropFromUrl("https://example.com/img.jpg");
    });

    expect(result.current.cropSource).toMatchObject({
      url: "https://example.com/img.jpg",
      name: "cover",
      initialCropRef: existingCrop,
    });
    expect(result.current.cropSource?.file).toBeUndefined();
  });

  it("openCropFromUrl with no existing crop passes initialCropRef: null", () => {
    const { result } = renderHook(() =>
      useMetadataCoverUpload({ setCoverUrl: vi.fn(), setCoverCrop: vi.fn(), coverCrop: null })
    );

    act(() => {
      result.current.openCropFromUrl("https://example.com/img.jpg");
    });

    expect(result.current.cropSource?.initialCropRef).toBeNull();
  });

  it("openCropFromUrl does not call uploadMediaObject", () => {
    const { result } = renderHook(() =>
      useMetadataCoverUpload({ setCoverUrl: vi.fn(), setCoverCrop: vi.fn() })
    );

    act(() => {
      result.current.openCropFromUrl("https://example.com/img.jpg");
    });

    expect(uploadMediaObject).not.toHaveBeenCalled();
  });

  it("applyCoverCropRef calls setCoverCrop without upload", () => {
    const setCoverCrop = vi.fn();
    const { result } = renderHook(() =>
      useMetadataCoverUpload({ setCoverUrl: vi.fn(), setCoverCrop })
    );
    const crop = { cx: 0.1, cy: 0.2, zoom: 1.2 };

    act(() => {
      result.current.applyCoverCropRef(crop);
    });

    expect(setCoverCrop).toHaveBeenCalledWith(crop);
    expect(uploadMediaObject).not.toHaveBeenCalled();
  });

  it("file upload via handleCoverUpload sets cropSource.file, not cropSource.url", () => {
    const { result } = renderHook(() =>
      useMetadataCoverUpload({ setCoverUrl: vi.fn(), setCoverCrop: vi.fn() })
    );
    const file = new File(["data"], "cover.jpg", { type: "image/jpeg" });
    const fakeEvent = {
      target: { files: [file], value: "" },
    } as unknown as React.ChangeEvent<HTMLInputElement>;

    act(() => {
      result.current.handleCoverUpload(fakeEvent);
    });

    expect(result.current.cropSource?.file).toBe(file);
    expect(result.current.cropSource?.url).toBeUndefined();
  });
});
