import { useCallback, useEffect, useState } from "react";
import type React from "react";

interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface UsePersistentSpotlightGuideProps<TStep> {
  steps: TStep[];
  storageKey: string;
  resolveTarget: (step: TStep, index: number) => Element | null;
  onStepEnter?: (step: TStep, index: number) => void;
  onFinish?: () => void;
  autoStart?: boolean;
  autoStartEnabled?: boolean;
  refreshDeps?: ReadonlyArray<unknown>;
}

interface UsePersistentSpotlightGuideResult<TStep> {
  showGuide: boolean;
  setShowGuide: React.Dispatch<React.SetStateAction<boolean>>;
  guideIndex: number;
  setGuideIndex: React.Dispatch<React.SetStateAction<number>>;
  guideSpotlightRect: SpotlightRect | null;
  currentGuide: TStep | null;
  startGuide: () => void;
  finishGuide: () => void;
  handleGuideNext: () => void;
  handleGuidePrev: () => void;
}

export function usePersistentSpotlightGuide<TStep>({
  steps,
  storageKey,
  resolveTarget,
  onStepEnter,
  onFinish,
  autoStart = true,
  autoStartEnabled = true,
  refreshDeps = [],
}: UsePersistentSpotlightGuideProps<TStep>): UsePersistentSpotlightGuideResult<TStep> {
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [guideIndex, setGuideIndex] = useState<number>(0);
  const [guideSpotlightRect, setGuideSpotlightRect] = useState<SpotlightRect | null>(null);

  const currentGuide = showGuide ? steps[guideIndex] : null;

  const refreshGuideSpotlight = useCallback(() => {
    if (!showGuide) {
      setGuideSpotlightRect(null);
      return;
    }
    const target = currentGuide ? resolveTarget(currentGuide, guideIndex) : null;
    if (!target) {
      setGuideSpotlightRect(null);
      return;
    }
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
    (index: number) => {
      const next = steps[index];
      if (!next) return;
      if (onStepEnter) onStepEnter(next, index);
      setGuideIndex(index);
      setShowGuide(true);
      // Keep guided target visible even when it sits outside current viewport
      // (e.g. switching tabs or long scrolling panels).
      let attempts = 0;
      const maxAttempts = 12;
      const tryScroll = () => {
        const target = resolveTarget(next, index);
        if (target && typeof target.scrollIntoView === "function") {
          target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
          return;
        }
        attempts += 1;
        if (attempts >= maxAttempts) return;
        setTimeout(tryScroll, 80);
      };
      tryScroll();
    },
    [onStepEnter, resolveTarget, steps]
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
