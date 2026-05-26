import { describe, expect, it, vi } from "vitest";
import { parseImportTagNames, syncImportedTagsToScript } from "./tagSync";

describe("tagSync", () => {
  it("parses tags from metadata and custom metadata with dedupe", () => {
    const tags = parseImportTagNames({
      metadata: { Tags: "ASMR、療癒, 雙胞胎" },
      customMetadata: [{ key: "Tags", value: "療癒, 日常" }],
    });
    expect(tags).toEqual(["ASMR", "療癒", "雙胞胎", "日常"]);
  });

  it("binds existing tags and creates missing tags", async () => {
    const getTagsFn = vi.fn().mockResolvedValue([{ id: 1, name: "ASMR" }]);
    const createTagFn = vi.fn().mockResolvedValue({ id: 2, name: "療癒" });
    const addTagToScriptFn = vi.fn().mockResolvedValue({});

    const attached = await syncImportedTagsToScript({
      scriptId: "s1",
      tagNames: ["ASMR", "療癒"],
      getTagsFn,
      createTagFn,
      addTagToScriptFn,
    });

    expect(attached).toBe(2);
    expect(createTagFn).toHaveBeenCalledTimes(1);
    expect(addTagToScriptFn).toHaveBeenNthCalledWith(1, "s1", 1);
    expect(addTagToScriptFn).toHaveBeenNthCalledWith(2, "s1", 2);
  });

  it("falls back to refreshed tags list when createTag fails", async () => {
    const getTagsFn = vi
      .fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 9, name: "懸疑" }]);
    const createTagFn = vi.fn().mockRejectedValue(new Error("duplicate"));
    const addTagToScriptFn = vi.fn().mockResolvedValue({});

    const attached = await syncImportedTagsToScript({
      scriptId: "s1",
      tagNames: ["懸疑"],
      getTagsFn,
      createTagFn,
      addTagToScriptFn,
    });

    expect(attached).toBe(1);
    expect(addTagToScriptFn).toHaveBeenCalledWith("s1", 9);
  });
});
