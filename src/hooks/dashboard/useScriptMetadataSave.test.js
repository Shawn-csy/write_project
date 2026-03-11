import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useScriptMetadataSave } from "./useScriptMetadataSave";

vi.mock("../../lib/api/scripts", () => ({
  updateScript: vi.fn(),
  addTagToScript: vi.fn(),
  removeTagFromScript: vi.fn(),
  getScript: vi.fn(),
}));

vi.mock("../../lib/api/tags", () => ({
  createTag: vi.fn(),
}));

vi.mock("../../lib/licenseRights", () => ({
  deriveSimpleLicenseTags: vi.fn(() => ["授權標籤"]),
}));

vi.mock("./tagGroupUtils", async () => {
  const actual = await vi.importActual("./tagGroupUtils");
  return {
    ...actual,
    syncGroupedTagSelection: vi.fn(async ({ currentTags }) => [...(currentTags || [])]),
  };
});

import { updateScript, addTagToScript, removeTagFromScript } from "../../lib/api/scripts";

const baseProps = () => ({
  t: (k, d) => d || k,
  toast: vi.fn(),
  script: { id: "s-1", content: "body", tags: [{ id: "tag-old", name: "舊標籤" }] },
  activeScript: { id: "s-1", content: "body", tags: [{ id: "tag-old", name: "舊標籤" }] },
  title: "新標題",
  coverUrl: "https://example.com/cover.jpg",
  status: "Private",
  author: "作者",
  authorDisplayMode: "override",
  date: "2026-03-11",
  outline: "大綱",
  roleSetting: "",
  backgroundInfo: "",
  performanceInstruction: "",
  openingIntro: "",
  chapterSettings: "",
  activityName: "",
  activityBannerUrl: "",
  activityContent: "",
  activityDemoLinks: [{ id: "d1", name: "試聽", url: "https://example.com/demo", cast: "", description: "" }],
  activityWorkUrl: "",
  licenseCommercial: "allow",
  licenseDerivative: "allow",
  licenseNotify: "required",
  licenseSpecialTerms: ["條款 A"],
  copyright: "",
  synopsis: "簡介",
  contact: "",
  contactFields: [{ id: "ct-1", key: "Email", value: "a@example.com" }],
  customFields: [{ id: "cf-1", key: "自訂", value: "內容", type: "text" }],
  seriesOptions: [],
  seriesId: "",
  seriesName: "",
  seriesOrder: "",
  currentTags: [{ id: "tag-new", name: "新標籤" }],
  setCurrentTags: vi.fn(),
  availableTags: [{ id: "tag-new", name: "新標籤" }],
  markerThemeId: "default",
  showMarkerLegend: true,
  disableCopy: false,
  identity: "persona:p-1",
  selectedOrgId: "",
  targetAudience: "",
  contentRating: "",
  publishChecklist: { missingRequired: [] },
  needsPersonaBeforePublish: false,
  hasAnyPersona: true,
  jumpToChecklistItem: vi.fn(),
  setShowValidationHints: vi.fn(),
  setShowPersonaSetupDialog: vi.fn(),
  setActiveTab: vi.fn(),
  onSave: vi.fn(),
  onOpenChange: vi.fn(),
});

describe("useScriptMetadataSave", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateScript.mockResolvedValue({});
    addTagToScript.mockResolvedValue({});
    removeTagFromScript.mockResolvedValue({});
  });

  it("blocks save and jumps to basic tab when persona is required before publishing", async () => {
    const props = baseProps();
    props.needsPersonaBeforePublish = true;
    props.status = "Public";

    const { result } = renderHook(() => useScriptMetadataSave(props));
    await act(async () => {
      await result.current.handleSave();
    });

    expect(props.setActiveTab).toHaveBeenCalledWith("basic");
    expect(updateScript).not.toHaveBeenCalled();
    expect(props.toast).toHaveBeenCalled();
  });

  it("saves metadata and syncs tag additions/removals", async () => {
    const props = baseProps();
    const { result } = renderHook(() => useScriptMetadataSave(props));

    await act(async () => {
      await result.current.handleSave();
    });

    expect(updateScript).toHaveBeenCalledTimes(1);
    const [, payload] = updateScript.mock.calls[0];
    expect(payload.title).toBe("新標題");
    expect(payload.customMetadata.some((entry) => entry.key === "ActivityDemoLinks")).toBe(true);
    expect(payload.customMetadata.some((entry) => entry.key === "ActivityDemoUrl")).toBe(true);

    expect(addTagToScript).toHaveBeenCalledWith("s-1", "tag-new");
    expect(removeTagFromScript).toHaveBeenCalledWith("s-1", "tag-old");
    expect(props.onSave).toHaveBeenCalledTimes(1);
    expect(props.setCurrentTags).toHaveBeenCalledWith([{ id: "tag-new", name: "新標籤" }]);
    expect(props.onOpenChange).toHaveBeenCalledWith(false);
  });
});
