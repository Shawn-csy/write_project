import { useCallback, useMemo } from "react";
import { usePersistentSpotlightGuide } from "../usePersistentSpotlightGuide";

const STUDIO_GUIDE_STORAGE_KEY = "studio-guide-seen-v1";

export function useStudioGuide({ t, currentUser, activeTab, handleTabChange, tabsGuideRef }) {
  const studioGuideSteps = useMemo(
    () => ([
      {
        title: t("publisher.guideTabsTitle"),
        description: t("publisher.guideTabsDesc"),
        target: "tabs",
        tab: "works",
      },
      {
        title: t("publisher.guideWorksTitle"),
        description: t("publisher.guideWorksDesc"),
        target: "works",
        tab: "works",
      },
      {
        title: t("publisher.guideWorksFiltersTitle"),
        description: t("publisher.guideWorksFiltersDesc"),
        target: "worksFilters",
        tab: "works",
      },
      {
        title: t("publisher.guideWorksEditInfoTitle"),
        description: t("publisher.guideWorksEditInfoDesc"),
        target: "worksEditInfo",
        tab: "works",
      },
      {
        title: t("publisher.guideProfileTitle"),
        description: t("publisher.guideProfileDesc"),
        target: "profile",
        tab: "profile",
      },
      {
        title: t("publisher.guideOrgTitle"),
        description: t("publisher.guideOrgDesc"),
        target: "org",
        tab: "org",
      },
    ]),
    [t]
  );
  const resolveStudioGuideTarget = useCallback(
    (step) => {
      if (!step) return null;
      if (step.target === "tabs") return tabsGuideRef.current;
      if (step.target === "works") return document.querySelector('[data-guide-id="studio-works-panel"]');
      if (step.target === "worksFilters") return document.querySelector('[data-guide-id="studio-works-filters"]');
      if (step.target === "worksEditInfo") return document.querySelector('[data-guide-id="studio-works-edit-info"]');
      if (step.target === "profile") return document.querySelector('[data-guide-id="studio-profile-panel"]');
      if (step.target === "org") return document.querySelector('[data-guide-id="studio-org-panel"]');
      return null;
    },
    [tabsGuideRef]
  );

  const {
    showGuide: showStudioGuide,
    guideIndex: studioGuideIndex,
    guideSpotlightRect: studioSpotlightRect,
    currentGuide: currentStudioGuide,
    finishGuide: finishStudioGuide,
    handleGuideNext: handleStudioGuideNext,
    handleGuidePrev: handleStudioGuidePrev,
    startGuide: handleStartStudioGuide,
  } = usePersistentSpotlightGuide({
    steps: studioGuideSteps,
    storageKey: STUDIO_GUIDE_STORAGE_KEY,
    resolveTarget: resolveStudioGuideTarget,
    onStepEnter: (step) => {
      if (step?.tab && activeTab !== step.tab) {
        handleTabChange(step.tab);
      }
    },
    onFinish: () => {
      handleTabChange("works");
    },
    autoStartEnabled: Boolean(currentUser),
    refreshDeps: [activeTab],
  });

  return {
    showStudioGuide,
    studioGuideIndex,
    studioGuideSteps,
    currentStudioGuide,
    studioSpotlightRect,
    finishStudioGuide,
    handleStudioGuideNext,
    handleStudioGuidePrev,
    handleStartStudioGuide,
  };
}
