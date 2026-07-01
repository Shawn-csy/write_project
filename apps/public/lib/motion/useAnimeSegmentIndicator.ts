import { useRef, useEffect, useCallback } from "react";
import { useReducedMotion } from "./useReducedMotion";
import { getAnimate } from "./animeLoader";

/**
 * Drives a floating pill indicator inside a segmented control using only
 * transform: translateX + scaleY (compositor properties — no layout animation).
 *
 * Width is set synchronously via style before the animation starts so that
 * Anime.js never tweens a layout property.
 */
export function useAnimeSegmentIndicator<T extends string>(activeValue: T) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const pillRef = useRef<HTMLDivElement | null>(null);
  const btnRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const isFirstRender = useRef(true);
  const reduced = useReducedMotion();

  const movePill = useCallback(
    async (targetValue: T, animate: boolean) => {
      const track = trackRef.current;
      const pill = pillRef.current;
      const btn = btnRefs.current[targetValue];
      if (!track || !pill || !btn) return;

      const trackRect = track.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      const tx = btnRect.left - trackRect.left;
      const targetWidth = btnRect.width;

      // Width is always set synchronously — never animated (avoids layout thrash).
      pill.style.width = `${targetWidth}px`;
      pill.style.opacity = "1";

      if (!animate || reduced) {
        pill.style.transform = `translateX(${tx}px)`;
        return;
      }

      const { animate: animeAnimate } = await getAnimate();
      // Re-check after async gap
      const pillEl = pillRef.current;
      if (!pillEl) return;

      // Only transform properties — no layout.
      animeAnimate(pillEl, {
        translateX: tx,
        duration: 240,
        easing: "cubicBezier(0.22, 1, 0.36, 1)",
      });
      animeAnimate(pillEl, {
        scaleY: [1, 1.06, 1],
        duration: 300,
        easing: "cubicBezier(0.22, 1, 0.36, 1)",
      });
    },
    [reduced],
  );

  // Initial snap (no animation) — wait one frame for layout
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      movePill(activeValue, false);
      isFirstRender.current = false;
    });
    return () => cancelAnimationFrame(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Animate on value change
  useEffect(() => {
    if (isFirstRender.current) return;
    movePill(activeValue, true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeValue, movePill]);

  const setBtnRef = useCallback((value: T) => (el: HTMLButtonElement | null) => {
    btnRefs.current[value] = el;
  }, []);

  return { trackRef, pillRef, setBtnRef };
}
