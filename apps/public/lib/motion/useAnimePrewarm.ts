"use client";

import { useEffect } from "react";
import { getAnimate } from "./animeLoader";

const MQ = "(prefers-reduced-motion: reduce)";

/**
 * Delay for the setTimeout fallback on browsers without requestIdleCallback.
 * 1200ms gives the initial paint and hydration time to settle before the
 * dynamic import is scheduled, keeping Anime.js out of the critical path.
 */
export const FALLBACK_PREWARM_DELAY_MS = 1200;

/**
 * useAnimePrewarm — centralized Anime.js idle prewarm.
 *
 * Schedules a single getAnimate() call via requestIdleCallback (or a
 * conservative setTimeout fallback) after the shell mounts. The goal is to
 * resolve the dynamic import before the user's first press, reducing the
 * first-interaction pause on studio link, view-mode toggle, and segment
 * indicator.
 *
 * Guards:
 * - Only runs once per shell mount (empty dep array).
 * - Skips entirely when prefers-reduced-motion is true — no wasted module
 *   load for users who will never see the animation.
 * - Cancels the idle callback on unmount to prevent leaked work.
 * - Falls back to setTimeout(FALLBACK_PREWARM_DELAY_MS) — not setTimeout(0) —
 *   so the import does not race with hydration on browsers without rIC.
 */
export function useAnimePrewarm(): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia(MQ).matches) return;

    if ("requestIdleCallback" in window) {
      const id = requestIdleCallback(() => { getAnimate(); });
      return () => cancelIdleCallback(id);
    } else {
      const id = setTimeout(() => { getAnimate(); }, FALLBACK_PREWARM_DELAY_MS);
      return () => clearTimeout(id);
    }
  }, []);
}
