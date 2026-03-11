import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useScriptTags } from "./useScriptTags";

vi.mock("../../lib/api/tags", () => ({
  createTag: vi.fn(),
  getTags: vi.fn(),
}));

import { createTag, getTags } from "../../lib/api/tags";

describe("useScriptTags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTags.mockResolvedValue([]);
    createTag.mockResolvedValue({ id: "new-1", name: "新標籤", color: "bg-gray-500" });
  });

  it("loads available tags from api", async () => {
    getTags.mockResolvedValue([{ id: "t1", name: "既有標籤" }]);
    const { result } = renderHook(() => useScriptTags());

    await act(async () => {
      await result.current.loadTags();
    });

    expect(result.current.availableTags).toEqual([{ id: "t1", name: "既有標籤" }]);
  });

  it("adds a new tag and avoids duplicate add from input", async () => {
    const { result } = renderHook(() => useScriptTags());

    await act(async () => {
      result.current.setNewTagInput("新標籤");
    });
    await act(async () => {
      await result.current.handleAddTag();
    });

    expect(createTag).toHaveBeenCalledWith("新標籤", "bg-gray-500");
    expect(result.current.currentTags).toEqual([{ id: "new-1", name: "新標籤", color: "bg-gray-500" }]);
    expect(result.current.newTagInput).toBe("");

    await act(async () => {
      result.current.setNewTagInput("新標籤");
    });
    await act(async () => {
      await result.current.handleAddTag();
    });
    expect(createTag).toHaveBeenCalledTimes(1);
    expect(result.current.currentTags).toHaveLength(1);
    expect(result.current.newTagInput).toBe("");
  });

  it("batch-adds tags with dedupe and toast summary", async () => {
    const toast = vi.fn();
    const t = vi.fn((key) => {
      if (key === "scriptMetadataDialog.tagsAddedCount") return "已新增 {count} 個";
      return key;
    });
    const { result } = renderHook(() => useScriptTags({ t, toast }));

    await act(async () => {
      result.current.setAvailableTags([{ id: "a1", name: "Existing", color: "bg-slate-400" }]);
    });
    createTag.mockResolvedValueOnce({ id: "b1", name: "NewOne", color: "bg-gray-500" });

    await act(async () => {
      await result.current.handleAddTagsBatch(["Existing", "existing", "NewOne", "newone"]);
    });

    expect(createTag).toHaveBeenCalledTimes(1);
    expect(createTag).toHaveBeenCalledWith("NewOne", "bg-gray-500");
    expect(result.current.currentTags.map((tag) => tag.name)).toEqual(["Existing", "NewOne"]);
    expect(toast).toHaveBeenCalledWith({
      title: "scriptMetadataDialog.tagsAdded",
      description: "已新增 2 個",
    });
  });

  it("removes and clears current tags", async () => {
    const { result } = renderHook(() => useScriptTags());
    await act(async () => {
      result.current.setCurrentTags([
        { id: "t1", name: "A" },
        { id: "t2", name: "B" },
      ]);
    });

    act(() => {
      result.current.handleRemoveTag("t1");
    });
    expect(result.current.currentTags).toEqual([{ id: "t2", name: "B" }]);

    act(() => {
      result.current.handleClearTags();
    });
    expect(result.current.currentTags).toEqual([]);
  });
});
