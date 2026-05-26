import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useScriptMetadataTagHandlers } from "./useScriptMetadataTagHandlers";

vi.mock("../../lib/api/tags", () => ({
  createTag: vi.fn(),
}));

import { createTag } from "../../lib/api/tags";

describe("useScriptMetadataTagHandlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("syncs target audience grouped tags with existing available tags", async () => {
    const setCurrentTags = vi.fn();
    const setAvailableTags = vi.fn();
    const setTargetAudience = vi.fn();
    const setContentRating = vi.fn();
    const params = {
      currentTags: [{ id: "m1", name: "男性向" }, { id: "x1", name: "原標籤" }],
      availableTags: [{ id: "f1", name: "女性向" }],
      setAvailableTags,
      setCurrentTags,
      setTargetAudience,
      setContentRating,
    };
    const { result } = renderHook(() => useScriptMetadataTagHandlers(params));

    await act(async () => {
      await result.current.handleSetTargetAudience("女性向");
    });

    expect(setTargetAudience).toHaveBeenCalledWith("女性向");
    expect(createTag).not.toHaveBeenCalled();
    expect(setCurrentTags).toHaveBeenCalledWith([
      { id: "x1", name: "原標籤" },
      { id: "f1", name: "女性向" },
    ]);
  });

  it("creates missing content rating tag with expected color and updates available tags", async () => {
    createTag.mockResolvedValue({ id: "r18", name: "成人向", color: "bg-red-500" });
    const setCurrentTags = vi.fn();
    const setAvailableTags = vi.fn();
    const setTargetAudience = vi.fn();
    const setContentRating = vi.fn();
    const params = {
      currentTags: [{ id: "g1", name: "一般" }],
      availableTags: [],
      setAvailableTags,
      setCurrentTags,
      setTargetAudience,
      setContentRating,
    };
    const { result } = renderHook(() => useScriptMetadataTagHandlers(params));

    await act(async () => {
      await result.current.handleSetContentRating("成人向");
    });

    expect(setContentRating).toHaveBeenCalledWith("成人向");
    expect(createTag).toHaveBeenCalledWith("成人向", "bg-red-500");
    expect(setAvailableTags).toHaveBeenCalledTimes(1);
    const updater = setAvailableTags.mock.calls[0][0];
    expect(updater([{ id: "old", name: "舊標籤" }])).toEqual([
      { id: "old", name: "舊標籤" },
      { id: "r18", name: "成人向", color: "bg-red-500" },
    ]);
    expect(setCurrentTags).toHaveBeenCalledWith([{ id: "r18", name: "成人向", color: "bg-red-500" }]);
  });

  it("swallows create error and does not update current tags", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    createTag.mockRejectedValue(new Error("network"));
    const setCurrentTags = vi.fn();
    const setAvailableTags = vi.fn();
    const setTargetAudience = vi.fn();
    const setContentRating = vi.fn();
    const params = {
      currentTags: [],
      availableTags: [],
      setAvailableTags,
      setCurrentTags,
      setTargetAudience,
      setContentRating,
    };
    const { result } = renderHook(() => useScriptMetadataTagHandlers(params));

    await act(async () => {
      await result.current.handleSetContentRating("成人向");
    });

    expect(setContentRating).toHaveBeenCalledWith("成人向");
    expect(setCurrentTags).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
