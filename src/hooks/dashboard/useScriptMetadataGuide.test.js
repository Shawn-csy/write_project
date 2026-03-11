import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useScriptMetadataGuide } from "./useScriptMetadataGuide";

vi.mock("../usePersistentSpotlightGuide", () => ({
  usePersistentSpotlightGuide: vi.fn(() => ({
    showGuide: false,
    setShowGuide: vi.fn(),
    guideIndex: 0,
    guideSpotlightRect: null,
    currentGuide: null,
    startGuide: vi.fn(),
    handleGuideNext: vi.fn(),
    handleGuidePrev: vi.fn(),
    finishGuide: vi.fn(),
  })),
}));

describe("useScriptMetadataGuide", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
  });

  it("tracks activity/demo sections while syncing active tab from scroll", () => {
    const root = document.createElement("div");
    root.getBoundingClientRect = vi.fn(() => ({ top: 0 }));
    root.addEventListener = vi.fn();
    root.removeEventListener = vi.fn();
    document.body.appendChild(root);

    const sectionTops = {
      basic: 0,
      publish: 10,
      exposure: 20,
      activity: 30,
      demo: 40,
      advanced: 300,
    };

    Object.entries(sectionTops).forEach(([key, top]) => {
      const el = document.createElement("section");
      el.id = `metadata-section-${key}`;
      el.getBoundingClientRect = vi.fn(() => ({ top }));
      document.body.appendChild(el);
    });

    const setActiveTab = vi.fn();
    const contentScrollRef = { current: root };

    renderHook(() =>
      useScriptMetadataGuide({
        t: (v) => v,
        open: true,
        isInitializing: false,
        activeTab: "basic",
        setActiveTab,
        contentScrollRef,
      })
    );

    expect(setActiveTab).toHaveBeenCalled();
    const updater = setActiveTab.mock.calls[0][0];
    expect(typeof updater).toBe("function");
    expect(updater("basic")).toBe("demo");
  });
});
