import { useCallback, useEffect, useMemo, useRef } from "react";
import { usePersistentSpotlightGuide } from "../usePersistentSpotlightGuide";

const SCRIPT_METADATA_GUIDE_STORAGE_KEY = "script-metadata-guide-seen-v2";

const SECTION_IDS = ["basic", "publish", "exposure", "activity", "demo", "advanced"];

function getChecklistTarget(key) {
  if (key === "title") return { section: "basic", fieldId: "metadata-title" };
  if (key === "identity") return { section: "basic", fieldId: "metadata-identity-trigger" };
  if (key === "audience") return { section: "publish", fieldId: "metadata-audience" };
  if (key === "rating") return { section: "publish", fieldId: "metadata-rating" };
  if (key === "license") return { section: "publish", fieldId: "license-commercial" };
  if (key === "cover") return { section: "exposure", fieldId: "metadata-cover-url" };
  if (key === "synopsis") return { section: "basic", fieldId: "metadata-synopsis" };
  if (key === "tags") return { section: "exposure", fieldId: "metadata-new-tag" };
  return { section: "basic", fieldId: null };
}

export function useScriptMetadataGuide({
  t,
  open,
  isInitializing,
  activeTab,
  setActiveTab,
  contentScrollRef,
}) {
  const autoScrollLockUntilRef = useRef(0);

  const guideSteps = useMemo(
    () => ([
      {
        title: t("scriptMetadataDialog.guideChecklistTitle"),
        description: t("scriptMetadataDialog.guideChecklistDesc"),
        targetId: "metadata-guide-checklist",
        section: "basic",
      },
      {
        title: t("scriptMetadataDialog.guideBasicTitle"),
        description: t("scriptMetadataDialog.guideBasicDesc"),
        targetId: "metadata-section-basic",
        section: "basic",
      },
      {
        title: t("scriptMetadataDialog.guideStatusTitle"),
        description: t("scriptMetadataDialog.guideStatusDesc"),
        targetId: "metadata-status-badge",
        section: "basic",
      },
      {
        title: t("scriptMetadataDialog.guidePublishTitle"),
        description: t("scriptMetadataDialog.guidePublishDesc"),
        targetId: "metadata-section-publish",
        section: "publish",
      },
      {
        title: t("scriptMetadataDialog.guideExposureTitle"),
        description: t("scriptMetadataDialog.guideExposureDesc"),
        targetId: "metadata-section-exposure",
        section: "exposure",
      },
      {
        title: t("scriptMetadataDialog.guideAdvancedTitle"),
        description: t("scriptMetadataDialog.guideAdvancedDesc"),
        targetId: "metadata-section-advanced",
        section: "advanced",
      },
    ]),
    [t]
  );

  const scrollToSection = useCallback((section, behavior = "smooth") => {
    const el = document.getElementById(`metadata-section-${section}`);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ block: "start", behavior });
    }
  }, []);

  const focusSection = useCallback(
    (section) => {
      autoScrollLockUntilRef.current = Date.now() + 900;
      setActiveTab(section);
      scrollToSection(section);
    },
    [scrollToSection, setActiveTab]
  );

  const {
    showGuide,
    setShowGuide,
    guideIndex,
    guideSpotlightRect,
    currentGuide,
    startGuide,
    handleGuideNext,
    handleGuidePrev,
    finishGuide: baseFinishGuide,
  } = usePersistentSpotlightGuide({
    steps: guideSteps,
    storageKey: SCRIPT_METADATA_GUIDE_STORAGE_KEY,
    resolveTarget: (step) => (step?.targetId ? document.getElementById(step.targetId) : null),
    onStepEnter: (step) => {
      if (step?.section) focusSection(step.section);
    },
    onFinish: () => {
      focusSection("basic");
    },
    autoStartEnabled: Boolean(open),
    refreshDeps: [activeTab, open],
  });

  const jumpToChecklistItem = useCallback(
    (key) => {
      const target = getChecklistTarget(key);
      focusSection(target.section);
      window.setTimeout(() => {
        if (!target.fieldId) return;
        const el = document.getElementById(target.fieldId);
        if (el && typeof el.focus === "function") {
          el.focus();
          if (typeof el.scrollIntoView === "function") {
            el.scrollIntoView({ block: "center", behavior: "smooth" });
          }
        }
      }, 80);
    },
    [focusSection]
  );

  useEffect(() => {
    if (!open || isInitializing) return;
    const rootEl = contentScrollRef.current;
    if (!rootEl) return;
    let rafId = null;
    const updateActiveSection = () => {
      if (Date.now() < autoScrollLockUntilRef.current) return;
      const rootRect = rootEl.getBoundingClientRect();
      const threshold = rootRect.top + 120;
      let next = "basic";
      for (const id of SECTION_IDS) {
        const el = document.getElementById(`metadata-section-${id}`);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= threshold) next = id;
      }
      setActiveTab((prev) => (prev === next ? prev : next));
    };
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateActiveSection();
      });
    };
    rootEl.addEventListener("scroll", onScroll, { passive: true });
    updateActiveSection();
    return () => {
      rootEl.removeEventListener("scroll", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [contentScrollRef, isInitializing, open, setActiveTab]);

  const finishGuide = useCallback(() => {
    baseFinishGuide();
  }, [baseFinishGuide]);

  return {
    showGuide,
    setShowGuide,
    guideIndex,
    guideSteps,
    guideSpotlightRect,
    currentGuide,
    focusSection,
    jumpToChecklistItem,
    startGuide,
    handleGuideNext,
    handleGuidePrev,
    finishGuide,
  };
}
