import { useMemo } from "react";
import { usePersistentSpotlightGuide } from "../usePersistentSpotlightGuide";

const ORG_TAB_GUIDE_STORAGE_KEY = "publisher-org-guide-seen-v1";

interface OrgGuideStep {
  title: string;
  description: string;
  targetId: string;
  fallbackId?: string;
}

interface UsePublisherOrgGuideProps {
  t: (key: string) => string;
  viewMode: string;
  selectedOrgId: string;
  canManageOrgMembers: boolean;
}

interface UsePublisherOrgGuideResult {
  showGuide: boolean;
  guideIndex: number;
  guideSteps: OrgGuideStep[];
  currentGuide: OrgGuideStep | null;
  guideSpotlightRect: { top: number; left: number; width: number; height: number } | null;
  startGuide: () => void;
  finishGuide: () => void;
  handleGuidePrev: () => void;
  handleGuideNext: () => void;
}

export function usePublisherOrgGuide({ t, viewMode, selectedOrgId, canManageOrgMembers }: UsePublisherOrgGuideProps): UsePublisherOrgGuideResult {
  const guideSteps = useMemo(
    (): OrgGuideStep[] => ([
      {
        title: t("publisherOrgTab.guideListTitle"),
        description: t("publisherOrgTab.guideListDesc"),
        targetId: "org-guide-list",
      },
      {
        title: t("publisherOrgTab.guideBasicTitle"),
        description: t("publisherOrgTab.guideBasicDesc"),
        targetId: "org-guide-basic",
      },
      {
        title: t("publisherOrgTab.guideMembersTitle"),
        description: t("publisherOrgTab.guideMembersDesc"),
        targetId: "org-guide-members",
      },
      {
        title: t("publisherOrgTab.guideInviteTitle"),
        description: t("publisherOrgTab.guideInviteDesc"),
        targetId: "org-guide-invite",
        fallbackId: "org-guide-save",
      },
    ]),
    [t]
  );
  const {
    showGuide,
    guideIndex,
    guideSpotlightRect,
    currentGuide,
    startGuide,
    finishGuide,
    handleGuidePrev,
    handleGuideNext,
  } = usePersistentSpotlightGuide({
    steps: guideSteps,
    storageKey: ORG_TAB_GUIDE_STORAGE_KEY,
    resolveTarget: (step: OrgGuideStep | null) => {
      const target = step?.targetId ? document.getElementById(step.targetId) : null;
      const fallback = step?.fallbackId ? document.getElementById(step.fallbackId) : null;
      return target || fallback || null;
    },
    refreshDeps: [viewMode, selectedOrgId, canManageOrgMembers],
  });

  return {
    showGuide,
    guideIndex,
    guideSteps,
    currentGuide,
    guideSpotlightRect,
    startGuide,
    finishGuide,
    handleGuidePrev,
    handleGuideNext,
  };
}
