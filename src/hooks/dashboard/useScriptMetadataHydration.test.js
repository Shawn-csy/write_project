import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useScriptMetadataHydration } from "./useScriptMetadataHydration";
import { ensureList } from "./scriptMetadataUtils";

vi.mock("../../lib/api/scripts", () => ({
  getScript: vi.fn(),
}));

import { getScript } from "../../lib/api/scripts";

const setter = () => vi.fn();

const buildParams = () => ({
  customFields: [],
  ensureList,
  loadPublicInfoIfNeeded: vi.fn(async () => {}),
  userEditedRef: { current: false },
  setIsInitializing: setter(),
  setTitle: setter(),
  setCoverUrl: setter(),
  setStatus: setter(),
  setCurrentTags: setter(),
  setMarkerThemeId: setter(),
  setShowMarkerLegend: setter(),
  setDisableCopy: setter(),
  setTargetAudience: setter(),
  setContentRating: setter(),
  setIdentity: setter(),
  setSelectedOrgId: setter(),
  setAuthor: setter(),
  setAuthorDisplayMode: setter(),
  setDate: setter(),
  setContact: setter(),
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
  setSeriesName: setter(),
  setSeriesId: setter(),
  setSeriesOrder: setter(),
  setLicenseCommercial: setter(),
  setLicenseDerivative: setter(),
  setLicenseNotify: setter(),
  setLicenseSpecialTerms: setter(),
  setCopyright: setter(),
  setCustomFields: setter(),
});

describe("useScriptMetadataHydration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it("hydrates from full script and maps parsed metadata fields", async () => {
    localStorage.setItem("preferredPersonaId", "persona-pref");
    getScript.mockResolvedValue({
      id: "s-1",
      title: "完整標題",
      status: "Private",
      coverUrl: "https://example.com/cover.jpg",
      markerThemeId: "theme-1",
      disableCopy: true,
      customMetadata: [
        { key: "Author", value: "作者甲" },
        { key: "AuthorDisplayMode", value: "override" },
        { key: "ActivityDemoLinks", value: JSON.stringify([{ name: "A", url: "https://example.com/a" }]) },
        { key: "marker_legend", value: "true" },
        { key: "自訂欄位", value: "自訂值" },
      ],
      tags: [{ id: "t1", name: "女性向" }, { id: "t2", name: "成人向" }],
    });

    const params = buildParams();
    const { result } = renderHook(() => useScriptMetadataHydration(params));

    await act(async () => {
      await result.current({
        id: "s-1",
        title: "",
        tags: [
          { id: "t1", name: "女性向" },
          { id: "t2", name: "成人向" },
        ],
      });
    });

    expect(params.setIdentity).toHaveBeenCalledWith("persona:persona-pref");
    expect(params.setAuthor).toHaveBeenCalledWith("作者甲");
    expect(params.setAuthorDisplayMode).toHaveBeenCalledWith("override");
    expect(params.setShowMarkerLegend).toHaveBeenCalledWith(true);
    expect(params.setActivityDemoLinks).toHaveBeenCalledWith([
      { id: "demo-1", name: "A", url: "https://example.com/a", cast: "", description: "" },
    ]);
    expect(params.setTargetAudience).toHaveBeenCalledWith("女性向");
    expect(params.setContentRating).toHaveBeenCalledWith("成人向");
    expect(params.setCustomFields).toHaveBeenCalled();
  });

  it("falls back to legacy demo url when demo links are missing", async () => {
    getScript.mockResolvedValue({
      id: "s-2",
      title: "legacy",
      customMetadata: [{ key: "ActivityDemoUrl", value: "https://example.com/legacy-demo" }],
      tags: [],
    });

    const params = buildParams();
    const { result } = renderHook(() => useScriptMetadataHydration(params));

    await act(async () => {
      await result.current({ id: "s-2", title: "legacy", tags: [] });
    });

    expect(params.setActivityDemoLinks).toHaveBeenCalledWith([
      { id: "demo-1", name: "", url: "https://example.com/legacy-demo", cast: "", description: "" },
    ]);
  });

  it("does not prefill author when disableAuthorAutofill is enabled", async () => {
    getScript.mockResolvedValue({
      id: "s-3",
      title: "admin",
      author: "既有作者",
      customMetadata: [{ key: "AuthorDisplayMode", value: "override" }],
      tags: [],
    });

    const params = buildParams();
    const { result } = renderHook(() => useScriptMetadataHydration({
      ...params,
      disableAuthorAutofill: true,
    }));

    await act(async () => {
      await result.current({ id: "s-3", title: "admin", tags: [] });
    });

    expect(params.setAuthor).toHaveBeenCalledWith("");
    expect(params.setAuthorDisplayMode).toHaveBeenCalledWith("badge");
  });

  it("does not auto-apply preferred persona when disablePersonaAutofill is enabled", async () => {
    localStorage.setItem("preferredPersonaId", "persona-pref");
    getScript.mockResolvedValue({
      id: "s-4",
      title: "admin",
      tags: [],
    });

    const params = buildParams();
    const { result } = renderHook(() => useScriptMetadataHydration({
      ...params,
      disablePersonaAutofill: true,
    }));

    await act(async () => {
      await result.current({ id: "s-4", title: "admin", tags: [] });
    });

    expect(params.setIdentity).toHaveBeenCalledWith("");
  });
});
