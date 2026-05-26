import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useScriptMetadataHydration } from "./useScriptMetadataHydration";
import { ensureList } from "./scriptMetadataUtils";

const setter = () => vi.fn();

const buildParams = () => ({
  customFields: [],
  ensureList,
  userEditedRef: { current: false },
  setIsInitializing: setter(),
  setTitle: setter(),
  setCoverUrl: setter(),
  setCoverCrop: setter(),
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

    const params = buildParams();
    const { result } = renderHook(() => useScriptMetadataHydration(params));

    await act(async () => {
      await result.current({
        id: "s-1",
        title: "完整標題",
        status: "Private",
        coverUrl: "https://example.com/cover.jpg",
        markerThemeId: "theme-1",
        disableCopy: true,
        activityDemoLinks: JSON.stringify([{ name: "A", url: "https://example.com/a" }]),
        customMetadata: [
          { key: "Author", value: "作者甲" },
          { key: "AuthorDisplayMode", value: "override" },
          { key: "marker_legend", value: "true" },
          { key: "自訂欄位", value: "自訂值" },
        ],
        tags: [{ id: "t1", name: "女性向" }, { id: "t2", name: "成人向" }],
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

  it("reads activityDemoLinks from structured field (E6)", async () => {
    // Legacy ActivityDemoUrl/ActivityDemoLinks custom keys no longer read (E6).
    // Structured activityDemoLinks field is now the source.
    const params = buildParams();
    const { result } = renderHook(() => useScriptMetadataHydration(params));

    await act(async () => {
      await result.current({
        id: "s-2",
        title: "structured-demo",
        activityDemoLinks: JSON.stringify([{ name: "", url: "https://example.com/demo" }]),
        customMetadata: [],
        tags: [],
      });
    });

    expect(params.setActivityDemoLinks).toHaveBeenCalledWith([
      { id: "demo-1", name: "", url: "https://example.com/demo", cast: "", description: "" },
    ]);
  });

  it("does not prefill author when disableAuthorAutofill is enabled", async () => {
    const params = buildParams();
    const { result } = renderHook(() => useScriptMetadataHydration({
      ...params,
      disableAuthorAutofill: true,
    }));

    await act(async () => {
      await result.current({
        id: "s-3",
        title: "admin",
        author: "既有作者",
        customMetadata: [{ key: "AuthorDisplayMode", value: "override" }],
        tags: [],
      });
    });

    expect(params.setAuthor).toHaveBeenCalledWith("");
    expect(params.setAuthorDisplayMode).toHaveBeenCalledWith("badge");
  });

  it("does not auto-apply preferred persona when disablePersonaAutofill is enabled", async () => {
    localStorage.setItem("preferredPersonaId", "persona-pref");

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

  it("prefers structured synopsis/outline/activityName/activityBannerUrl over custom keys", async () => {
    const params = buildParams();
    const { result } = renderHook(() => useScriptMetadataHydration(params));

    await act(async () => {
      await result.current({
        id: "s-5",
        title: "structured",
        synopsis: "結構化簡介",
        outline: "結構化大綱",
        activityName: "結構化活動名",
        activityBannerUrl: "https://example.com/banner.jpg",
        customMetadata: [
          { key: "Synopsis", value: "舊 custom 簡介" },
          { key: "Outline", value: "舊 custom 大綱" },
          { key: "ActivityName", value: "舊 custom 活動名" },
          { key: "ActivityBanner", value: "https://example.com/old-banner.jpg" },
        ],
        tags: [],
      });
    });

    expect(params.setSynopsis).toHaveBeenCalledWith("結構化簡介");
    expect(params.setOutline).toHaveBeenCalledWith("結構化大綱");
    expect(params.setActivityName).toHaveBeenCalledWith("結構化活動名");
    expect(params.setActivityBannerUrl).toHaveBeenCalledWith("https://example.com/banner.jpg");
  });

  it("ignores custom synopsis/outline/activityName/activityBannerUrl — structured fields only (E5-1)", async () => {
    // Legacy custom fallback removed in E5-1. Custom keys are no longer read for these 4 fields.
    const params = buildParams();
    const { result } = renderHook(() => useScriptMetadataHydration(params));

    await act(async () => {
      await result.current({
        id: "s-6",
        title: "legacy",
        customMetadata: [
          { key: "Synopsis", value: "legacy 簡介" },
          { key: "Outline", value: "legacy 大綱" },
          { key: "ActivityName", value: "legacy 活動名" },
          { key: "ActivityBanner", value: "https://example.com/legacy-banner.jpg" },
        ],
        tags: [],
      });
    });

    expect(params.setSynopsis).toHaveBeenCalledWith("");
    expect(params.setOutline).toHaveBeenCalledWith("");
    expect(params.setActivityName).toHaveBeenCalledWith("");
    expect(params.setActivityBannerUrl).toHaveBeenCalledWith("");
  });
});
