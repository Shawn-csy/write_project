import { useState, useCallback, useMemo, useEffect } from "react";
import type React from "react";

type TFunc = (key: string) => string;
type SpotlightRect = { top: number; left: number; width: number; height: number } | null;
type GuideTarget = "header" | "editor" | "preview" | "actions";

interface GuideRefs {
  headerRef: React.RefObject<HTMLElement | null>;
  editorPaneRef: React.RefObject<HTMLElement | null>;
  previewRef: React.RefObject<HTMLElement | null>;
  moreActionsButtonRef: React.RefObject<HTMLElement | null>;
}

export function useEditorGuide({
  readOnly,
  isMobile,
  t,
  crossModeGuideActive,
  crossModeGuideStep,
  refs,
}: {
  readOnly: boolean;
  isMobile: boolean;
  t: TFunc;
  crossModeGuideActive: boolean;
  crossModeGuideStep: string | null;
  refs: GuideRefs;
}) {
  const { headerRef, editorPaneRef, previewRef, moreActionsButtonRef } = refs;

  const [showGuide, setShowGuide] = useState(false);
  const [guideIndex, setGuideIndex] = useState(0);
  const [guideSpotlightRect, setGuideSpotlightRect] = useState<SpotlightRect>(null);
  const [crossGuideSpotlightRect, setCrossGuideSpotlightRect] = useState<SpotlightRect>(null);

  const guideSteps = useMemo<Array<{ title: string; description: string; target: GuideTarget }>>(() => ([
    { title: t("liveEditor.guideEditScriptTitle"), description: t("liveEditor.guideEditScriptDesc"), target: "header" },
    {
      title: isMobile ? t("liveEditor.guideEditorTitleMobile") : t("liveEditor.guideEditorTitle"),
      description: isMobile ? t("liveEditor.guideEditorDescMobile") : t("liveEditor.guideEditorDesc"),
      target: "editor",
    },
    {
      title: isMobile ? t("liveEditor.guidePreviewTitleMobile") : t("liveEditor.guidePreviewTitle"),
      description: isMobile ? t("liveEditor.guidePreviewDescMobile") : t("liveEditor.guidePreviewDesc"),
      target: "preview",
    },
    { title: t("liveEditor.guideActionsTitle"), description: isMobile ? t("liveEditor.guideActionsDescMobile") : t("liveEditor.guideActionsDesc"), target: "actions" },
  ]), [t, isMobile]);

  const currentGuide = showGuide ? guideSteps[guideIndex] : null;

  const showCrossModeEditGuide = !readOnly && crossModeGuideActive && (
    crossModeGuideStep === "editIntro" ||
    crossModeGuideStep === "editPreview" ||
    crossModeGuideStep === "editActions"
  );

  const crossGuideTitle = (() => {
    if (crossModeGuideStep === "editPreview") return t("liveEditor.crossGuideEditPreviewTitle");
    if (crossModeGuideStep === "editActions") return t("liveEditor.crossGuideEditActionsTitle");
    return t("liveEditor.crossGuideEditIntroTitle");
  })();

  const crossGuideDesc = (() => {
    if (crossModeGuideStep === "editPreview") return t("liveEditor.crossGuideEditPreviewDesc");
    if (crossModeGuideStep === "editActions") return t("liveEditor.crossGuideEditActionsDesc");
    return t("liveEditor.crossGuideEditIntroDesc");
  })();

  const crossGuideTarget = (() => {
    if (crossModeGuideStep === "editPreview") return "preview";
    if (crossModeGuideStep === "editActions") return "actions";
    return "editor";
  })();

  const getGuideTargetElement = useCallback((target: GuideTarget): HTMLElement | null => {
    switch (target) {
      case "header": {
        const el = headerRef.current;
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        if (rect.width && rect.height) return el;
        return (el.firstElementChild as HTMLElement | null) || el;
      }
      case "editor": return editorPaneRef.current;
      case "preview": return previewRef.current;
      case "actions": return moreActionsButtonRef.current;
      default: return null;
    }
  }, [headerRef, editorPaneRef, previewRef, moreActionsButtonRef]);

  const updateGuideSpotlight = useCallback(() => {
    if (!showGuide) { setGuideSpotlightRect(null); return; }
    const step = guideSteps[guideIndex];
    const element = step ? getGuideTargetElement(step.target) : null;
    if (!element) { setGuideSpotlightRect(null); return; }
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) { setGuideSpotlightRect(null); return; }
    const padding = 8;
    setGuideSpotlightRect({
      top: Math.max(0, rect.top - padding),
      left: Math.max(0, rect.left - padding),
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });
  }, [showGuide, guideSteps, guideIndex, getGuideTargetElement]);

  const updateCrossGuideSpotlight = useCallback(() => {
    if (!showCrossModeEditGuide) { setCrossGuideSpotlightRect(null); return; }
    const element = getGuideTargetElement(crossGuideTarget);
    if (!element) { setCrossGuideSpotlightRect(null); return; }
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) { setCrossGuideSpotlightRect(null); return; }
    const padding = 8;
    setCrossGuideSpotlightRect({
      top: Math.max(0, rect.top - padding),
      left: Math.max(0, rect.left - padding),
      width: rect.width + padding * 2,
      height: rect.height + padding * 2,
    });
  }, [crossGuideTarget, getGuideTargetElement, showCrossModeEditGuide]);

  useEffect(() => {
    if (!showGuide) return undefined;
    updateGuideSpotlight();
    const onLayout = () => updateGuideSpotlight();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    return () => {
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [showGuide, guideIndex, updateGuideSpotlight]);

  useEffect(() => {
    if (!showCrossModeEditGuide) { setCrossGuideSpotlightRect(null); return undefined; }
    updateCrossGuideSpotlight();
    const onLayout = () => updateCrossGuideSpotlight();
    window.addEventListener("resize", onLayout);
    window.addEventListener("scroll", onLayout, true);
    return () => {
      window.removeEventListener("resize", onLayout);
      window.removeEventListener("scroll", onLayout, true);
    };
  }, [showCrossModeEditGuide, crossModeGuideStep, updateCrossGuideSpotlight]);

  const startGuide = useCallback(() => { setGuideIndex(0); setShowGuide(true); }, []);
  const finishGuide = useCallback(() => { setShowGuide(false); setGuideSpotlightRect(null); }, []);
  const handleGuidePrev = useCallback(() => setGuideIndex((prev) => Math.max(0, prev - 1)), []);
  const handleGuideNext = useCallback(() => {
    if (guideIndex >= guideSteps.length - 1) { finishGuide(); return; }
    setGuideIndex((prev) => Math.min(guideSteps.length - 1, prev + 1));
  }, [finishGuide, guideIndex, guideSteps.length]);

  return {
    showGuide, guideSpotlightRect, currentGuide, guideSteps, guideIndex,
    crossGuideSpotlightRect, showCrossModeEditGuide, crossGuideTitle, crossGuideDesc,
    startGuide, finishGuide, handleGuidePrev, handleGuideNext,
  };
}
