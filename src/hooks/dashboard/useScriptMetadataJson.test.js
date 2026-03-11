import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  parseTagCandidates,
  sanitizeCustomJsonFields,
  resolveTagSourceFromParsedJson,
  useScriptMetadataJson,
} from "./useScriptMetadataJson";

vi.mock("../../lib/api/tags", () => ({
  createTag: vi.fn(),
}));

import { createTag } from "../../lib/api/tags";

const setter = () => vi.fn();

const buildProps = (overrides = {}) => ({
  jsonText: "{}",
  t: (value) => value,
  availableTags: [],
  setJsonError: setter(),
  setTitle: setter(),
  setAuthor: setter(),
  setAuthorDisplayMode: setter(),
  setDate: setter(),
  setSynopsis: setter(),
  setOutline: setter(),
  setRoleSetting: setter(),
  setBackgroundInfo: setter(),
  setPerformanceInstruction: setter(),
  setOpeningIntro: setter(),
  setChapterSettings: setter(),
  setActivityName: setter(),
  setActivityBannerUrl: setter(),
  setActivityContent: setter(),
  setActivityDemoLinks: setter(),
  setActivityWorkUrl: setter(),
  setContact: setter(),
  setContactFields: setter(),
  setLicenseCommercial: setter(),
  setLicenseDerivative: setter(),
  setLicenseNotify: setter(),
  setLicenseSpecialTerms: setter(),
  setCopyright: setter(),
  setSeriesName: setter(),
  setSeriesId: setter(),
  setSeriesOrder: setter(),
  setCoverUrl: setter(),
  setStatus: setter(),
  setIdentity: setter(),
  setSelectedOrgId: setter(),
  setCustomFields: setter(),
  setCurrentTags: setter(),
  ...overrides,
});

describe("useScriptMetadataJson helpers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves legacy tags source from custom fields object", () => {
    const parsed = { custom: { Tags: "懸疑, 戀愛" } };
    expect(resolveTagSourceFromParsedJson(parsed)).toBe("懸疑, 戀愛");
  });

  it("removes tag-like keys from custom json fields", () => {
    const input = { Tags: "A,B", Notes: "hello" };
    expect(sanitizeCustomJsonFields(input)).toEqual({ Notes: "hello" });
  });

  it("parses tag candidates from csv text", () => {
    expect(parseTagCandidates("A, B，C")).toEqual([{ name: "A" }, { name: "B" }, { name: "C" }]);
  });
});

describe("useScriptMetadataJson", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("applies parsed json fields and creates missing tags", async () => {
    createTag.mockResolvedValue({ id: "tag-2", name: "NewTag", color: "bg-slate-500" });
    const props = buildProps({
      jsonText: JSON.stringify({
        title: "新標題",
        authors: "作者乙",
        authorDisplayMode: "OVERRIDE",
        description: "作品簡介",
        activityDemoUrl: "https://example.com/demo",
        contact: { Email: "a@example.com" },
        licenseSpecialTerms: "[\"條款A\"]",
        publishAs: "persona:p-1",
        orgId: "org-1",
        custom: { Tags: "OldTag", Note: "keep" },
        tags: ["KnownTag", "NewTag"],
      }),
      availableTags: [{ id: "tag-1", name: "KnownTag", color: "bg-slate-400" }],
    });

    const { result } = renderHook(() => useScriptMetadataJson(props));
    await act(async () => {
      await result.current();
    });

    expect(props.setJsonError).toHaveBeenCalledWith("");
    expect(props.setTitle).toHaveBeenCalledWith("新標題");
    expect(props.setAuthor).toHaveBeenCalledWith("作者乙");
    expect(props.setAuthorDisplayMode).toHaveBeenCalledWith("override");
    expect(props.setSynopsis).toHaveBeenCalledWith("作品簡介");
    expect(props.setIdentity).toHaveBeenCalledWith("persona:p-1");
    expect(props.setSelectedOrgId).toHaveBeenCalledWith("org-1");
    expect(props.setActivityDemoLinks).toHaveBeenCalledWith([
      { id: "demo-1", name: "", url: "https://example.com/demo", cast: "", description: "" },
    ]);
    expect(props.setContactFields).toHaveBeenCalledWith([
      { id: "ct-1", key: "Email", value: "a@example.com" },
    ]);
    expect(props.setLicenseSpecialTerms).toHaveBeenCalledWith(["條款A"]);
    expect(props.setCustomFields).toHaveBeenCalledWith([
      { id: "cf-1", key: "Note", value: "keep" },
    ]);
    expect(createTag).toHaveBeenCalledWith("NewTag", "bg-slate-500");
    expect(props.setCurrentTags).toHaveBeenCalledWith([
      { id: "tag-1", name: "KnownTag", color: "bg-slate-400" },
      { id: "tag-2", name: "NewTag", color: "bg-slate-500" },
    ]);
  });

  it("reports json error when input is invalid", async () => {
    const props = buildProps({
      jsonText: "{invalid json",
      t: (value) => value,
    });

    const { result } = renderHook(() => useScriptMetadataJson(props));
    await act(async () => {
      await result.current();
    });

    expect(props.setJsonError).toHaveBeenCalledWith("scriptMetadataDialog.jsonError");
    expect(createTag).not.toHaveBeenCalled();
    expect(props.setTitle).not.toHaveBeenCalled();
  });
});
