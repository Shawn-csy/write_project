import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockSetters = {
  setActivityDemoLinks: vi.fn(),
};

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

vi.mock("../ui/dialog", () => ({
  Dialog: ({ children }) => <div>{children}</div>,
  DialogContent: ({ children, onInteractOutside: _onInteractOutside, onEscapeKeyDown: _onEscapeKeyDown, ...props }) => (
    <div {...props}>{children}</div>
  ),
  DialogHeader: ({ children }) => <div>{children}</div>,
  DialogTitle: ({ children }) => <h2>{children}</h2>,
  DialogFooter: ({ children }) => <div>{children}</div>,
}));

vi.mock("../../contexts/I18nContext", () => ({
  useI18n: () => ({
    t: (key, fallback) => fallback || key,
  }),
}));

vi.mock("../ui/toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({
    currentUser: { uid: "u-1" },
    profile: {},
  }),
}));

vi.mock("@dnd-kit/core", () => ({
  MouseSensor: function MouseSensor() {},
  TouchSensor: function TouchSensor() {},
  useSensor: () => ({}),
  useSensors: () => [],
}));

vi.mock("./metadata/ScriptMetadataBasicSection", () => ({
  ScriptMetadataBasicSection: () => <div>basic-section</div>,
}));
vi.mock("./metadata/ScriptMetadataPublishSection", () => ({
  ScriptMetadataPublishSection: () => <div>publish-section</div>,
}));
vi.mock("./metadata/ScriptMetadataExposureSection", () => ({
  ScriptMetadataExposureSection: () => <div>exposure-section</div>,
}));
vi.mock("./metadata/ScriptMetadataActivitySection", () => ({
  ScriptMetadataActivitySection: () => <div>activity-section</div>,
}));
vi.mock("./metadata/ScriptMetadataAdvancedSection", () => ({
  ScriptMetadataAdvancedSection: () => <div>advanced-section</div>,
}));

vi.mock("./metadata/ScriptMetadataChecklistHeader", () => ({
  ScriptMetadataChecklistHeader: ({ focusSection }) => (
    <button type="button" onClick={() => focusSection("demo")}>
      jump-demo
    </button>
  ),
}));

vi.mock("../../hooks/dashboard/useScriptMetadataSupplementalState", () => ({
  useScriptMetadataSupplementalState: () => ({
    coverUrl: "",
    setCoverUrl: vi.fn(),
    author: "",
    setAuthor: vi.fn(),
    authorDisplayMode: "badge",
    setAuthorDisplayMode: vi.fn(),
    date: "",
    setDate: vi.fn(),
    contact: "",
    setContact: vi.fn(),
    contactFields: [],
    setContactFields: vi.fn(),
    licenseCommercial: "",
    setLicenseCommercial: vi.fn(),
    licenseDerivative: "",
    setLicenseDerivative: vi.fn(),
    licenseNotify: "",
    setLicenseNotify: vi.fn(),
    licenseSpecialTerms: [],
    setLicenseSpecialTerms: vi.fn(),
    copyright: "",
    setCopyright: vi.fn(),
    synopsis: "",
    setSynopsis: vi.fn(),
    outline: "",
    setOutline: vi.fn(),
    roleSetting: "",
    setRoleSetting: vi.fn(),
    backgroundInfo: "",
    setBackgroundInfo: vi.fn(),
    performanceInstruction: "",
    setPerformanceInstruction: vi.fn(),
    openingIntro: "",
    setOpeningIntro: vi.fn(),
    chapterSettings: "",
    setChapterSettings: vi.fn(),
    activityName: "",
    setActivityName: vi.fn(),
    activityBannerUrl: "",
    setActivityBannerUrl: vi.fn(),
    activityContent: "",
    setActivityContent: vi.fn(),
    activityDemoLinks: [],
    setActivityDemoLinks: mockSetters.setActivityDemoLinks,
    activityWorkUrl: "",
    setActivityWorkUrl: vi.fn(),
    seriesName: "",
    setSeriesName: vi.fn(),
    seriesId: "",
    setSeriesId: vi.fn(),
    seriesOrder: "",
    setSeriesOrder: vi.fn(),
    seriesExpanded: false,
    setSeriesExpanded: vi.fn(),
    showSeriesQuickCreate: false,
    setShowSeriesQuickCreate: vi.fn(),
    quickSeriesName: "",
    setQuickSeriesName: vi.fn(),
    isCreatingSeries: false,
    setIsCreatingSeries: vi.fn(),
    customFields: [],
    setCustomFields: vi.fn(),
    jsonMode: false,
    setJsonMode: vi.fn(),
    jsonText: "",
    setJsonText: vi.fn(),
    jsonError: "",
    setJsonError: vi.fn(),
    publishNewTerm: "",
    setPublishNewTerm: vi.fn(),
    isMediaPickerOpen: false,
    setIsMediaPickerOpen: vi.fn(),
    coverPreviewFailed: false,
    setCoverPreviewFailed: vi.fn(),
    coverUploadError: "",
    setCoverUploadError: vi.fn(),
    coverUploadWarning: "",
    setCoverUploadWarning: vi.fn(),
    targetAudience: "",
    setTargetAudience: vi.fn(),
    contentRating: "",
    setContentRating: vi.fn(),
    markerThemes: [],
    setMarkerThemes: vi.fn(),
    markerThemeId: "default",
    setMarkerThemeId: vi.fn(),
    showMarkerLegend: false,
    setShowMarkerLegend: vi.fn(),
    disableCopy: false,
    setDisableCopy: vi.fn(),
    dragDisabled: false,
    setDragDisabled: vi.fn(),
  }),
}));

vi.mock("../../hooks/dashboard/usePublishChecklist", () => ({
  buildPublishChecklist: vi.fn(),
  usePublishChecklist: () => ({ missingRequired: [], missingRecommended: [] }),
}));

vi.mock("../../hooks/dashboard/useScriptTags", () => ({
  useScriptTags: () => ({
    currentTags: [],
    setCurrentTags: vi.fn(),
    availableTags: [],
    setAvailableTags: vi.fn(),
    newTagInput: "",
    setNewTagInput: vi.fn(),
    loadTags: vi.fn(),
    handleAddTag: vi.fn(),
    handleAddTagsBatch: vi.fn(),
    handleRemoveTag: vi.fn(),
    handleClearTags: vi.fn(),
  }),
}));

vi.mock("../../hooks/dashboard/useScriptMetadataJson", () => ({
  useScriptMetadataJson: () => vi.fn(),
}));
vi.mock("../../hooks/dashboard/useScriptMetadataBootstrap", () => ({
  useScriptMetadataBootstrap: () => {},
}));
vi.mock("../../hooks/dashboard/useScriptMetadataHydration", () => ({
  useScriptMetadataHydration: () => vi.fn(),
}));
vi.mock("../../hooks/dashboard/useScriptMetadataLifecycle", () => ({
  useScriptMetadataLifecycle: () => {},
}));
vi.mock("../../hooks/dashboard/useScriptMetadataPersonaSync", () => ({
  useScriptMetadataPersonaSync: () => {},
}));
vi.mock("../../hooks/dashboard/useScriptMetadataSeriesSync", () => ({
  useScriptMetadataSeriesSync: () => {},
}));
vi.mock("../../hooks/dashboard/useScriptMetadataJsonPreview", () => ({
  useScriptMetadataJsonPreview: () => {},
}));
vi.mock("../../hooks/dashboard/useScriptMetadataSeriesActions", () => ({
  useScriptMetadataSeriesActions: () => ({
    handleQuickCreateSeries: vi.fn(),
    focusSeriesSelect: vi.fn(),
  }),
}));
vi.mock("../../hooks/dashboard/useScriptMetadataSave", () => ({
  useScriptMetadataSave: () => ({
    isSaving: false,
    handleSave: vi.fn(),
  }),
}));
vi.mock("../../hooks/dashboard/useScriptMetadataChecklistUI", () => ({
  useScriptMetadataChecklistUI: () => ({
    requiredErrorMap: {},
    recommendedErrorMap: {},
    completedChecklistItems: 0,
    totalChecklistItems: 0,
    completionPercent: 0,
    hasBlockingIssues: false,
    checklistChipItems: [],
    maxVisibleChecklistChips: 4,
    hiddenChecklistChipCount: 0,
    visibleChecklistChipItems: [],
    missingRequiredMap: {},
    getRowLabelClass: () => "",
    renderRowLabel: () => null,
  }),
}));
vi.mock("../../hooks/dashboard/useScriptMetadataDetailsProps", () => ({
  useScriptMetadataDetailsProps: () => ({}),
}));
vi.mock("../../hooks/dashboard/useScriptMetadataTagHandlers", () => ({
  useScriptMetadataTagHandlers: () => ({
    handleSetTargetAudience: vi.fn(),
    handleSetContentRating: vi.fn(),
  }),
}));
vi.mock("../../hooks/dashboard/useScriptMetadataGuide", () => ({
  useScriptMetadataGuide: ({ setActiveTab }) => ({
    showGuide: false,
    setShowGuide: vi.fn(),
    guideIndex: 0,
    guideSteps: [],
    guideSpotlightRect: null,
    currentGuide: null,
    focusSection: (section) => setActiveTab(section),
    jumpToChecklistItem: vi.fn(),
    startGuide: vi.fn(),
    handleGuideNext: vi.fn(),
    handleGuidePrev: vi.fn(),
    finishGuide: vi.fn(),
  }),
}));

vi.mock("../common/SpotlightGuideOverlay", () => ({
  SpotlightGuideOverlay: () => null,
}));
vi.mock("./metadata/PersonaSetupDialog", () => ({
  PersonaSetupDialog: () => null,
}));
vi.mock("../ui/MediaPicker", () => ({
  MediaPicker: () => null,
}));
vi.mock("../ui/ImageCropDialog", () => ({
  ImageCropDialog: () => null,
}));

import { ScriptMetadataDialog } from "./ScriptMetadataDialog";

describe("ScriptMetadataDialog behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps demo section collapsed by default and can expand to add demo items", async () => {
    render(
      <ScriptMetadataDialog
        open
        script={{ id: "s-1", title: "demo" }}
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
      />
    );

    const demoToggle = screen.getByRole("button", { name: "試聽範例" });
    expect(demoToggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(demoToggle);
    expect(demoToggle).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(screen.getByRole("button", { name: "新增試聽範例" }));
    expect(mockSetters.setActivityDemoLinks).toHaveBeenCalledTimes(1);
    expect(typeof mockSetters.setActivityDemoLinks.mock.calls[0][0]).toBe("function");
  });

  it("expands demo section when checklist jump focuses demo tab", async () => {
    render(
      <ScriptMetadataDialog
        open
        script={{ id: "s-2", title: "demo" }}
        onOpenChange={vi.fn()}
        onSave={vi.fn()}
      />
    );

    const demoToggle = screen.getByRole("button", { name: "試聽範例" });
    expect(demoToggle).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(screen.getByRole("button", { name: "jump-demo" }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "試聽範例" })).toHaveAttribute("aria-expanded", "true");
    });
  });
});
