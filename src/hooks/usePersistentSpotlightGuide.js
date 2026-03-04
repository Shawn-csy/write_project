import { useCallback, useEffect, useState } from "react";

export function usePersistentSpotlightGuide({
  steps,
  storageKey,
  resolveTarget,
  onStepEnter,
  onFinish,
  autoStart = true,
  autoStartEnabled = true,
  refreshDeps = [],
}) {
  const [showGuide, setShowGuide] = useState(false);
  const [guideIndex, setGuideIndex] = useState(0);
  const [guideSpotlightRect, setGuideSpotlightRect] = useState(null);

  const currentGuide = showGuide ? steps[guideIndex] : null;

  const refreshGuideSpotlight = useCallback(() => {
    if (!showGuide) {
      setGuideSpotlightRect(null);
      return;
    }
    const target = currentGuide ? resolveTarget(currentGuide, guideIndex) : null;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    const pad = 10;
    setGuideSpotlightRect({
      top: Math.max(8, rect.top - pad),
      left: Math.max(8, rect.left - pad),
      width: Math.max(64, rect.width + pad * 2),
      height: Math.max(48, rect.height + pad * 2),
    });
  }, [currentGuide, guideIndex, resolveTarget, showGuide]);

  const jumpGuide = useCallback(
    (index) => {
      const next = steps[index];
      if (!next) return;
      if (onStepEnter) onStepEnter(next, index);
      setGuideIndex(index);
      setShowGuide(true);
    },
    [onStepEnter, steps]
  );

  const finishGuide = useCallback(() => {
    setShowGuide(false);
    setGuideIndex(0);
    setGuideSpotlightRect(null);
    if (onFinish) onFinish();
    try {
      localStorage.setItem(storageKey, "1");
    } catch (error) {
      console.error("Failed to persist guide state", error);
    }
  }, [onFinish, storageKey]);

  const startGuide = useCallback(() => {
    jumpGuide(0);
  }, [jumpGuide]);

  const handleGuideNext = useCallback(() => {
    if (guideIndex >= steps.length - 1) {
      finishGuide();
      return;
    }
    jumpGuide(guideIndex + 1);
  }, [finishGuide, guideIndex, jumpGuide, steps.length]);

  const handleGuidePrev = useCallback(() => {
    if (guideIndex <= 0) return;
    jumpGuide(guideIndex - 1);
  }, [guideIndex, jumpGuide]);

  useEffect(() => {
    if (!autoStart || !autoStartEnabled) return;
    try {
      const seen = localStorage.getItem(storageKey) === "1";
      if (!seen) {
        jumpGuide(0);
        localStorage.setItem(storageKey, "1");
      }
    } catch (error) {
      console.error("Failed to read guide state", error);
    }
  }, [autoStart, autoStartEnabled, jumpGuide, storageKey]);

  useEffect(() => {
    if (!showGuide) return;
    const raf = window.requestAnimationFrame(refreshGuideSpotlight);
    window.addEventListener("resize", refreshGuideSpotlight);
    window.addEventListener("scroll", refreshGuideSpotlight, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", refreshGuideSpotlight);
      window.removeEventListener("scroll", refreshGuideSpotlight, true);
    };
  }, [showGuide, guideIndex, refreshGuideSpotlight, ...refreshDeps]);

  return {
    showGuide,
    setShowGuide,
    guideIndex,
    setGuideIndex,
    guideSpotlightRect,
    currentGuide,
    startGuide,
    finishGuide,
    handleGuideNext,
    handleGuidePrev,
  };
}
