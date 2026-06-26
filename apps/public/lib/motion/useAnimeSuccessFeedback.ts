import { useCallback, useRef } from "react";
import { useReducedMotion } from "./useReducedMotion";
import { PUBLIC_MOTION } from "./motionTokens";
import { getAnimate } from "./animeLoader";

/**
 * Returns a `trigger` function that plays a pop-scale success animation on
 * the attached ref element. Lazy-loads Anime.js on first call.
 *
 * Usage:
 *   const { ref, trigger } = useAnimeSuccessFeedback<HTMLButtonElement>();
 *   <button ref={ref} onClick={async () => { await doAction(); trigger(); }}>...</button>
 */
export function useAnimeSuccessFeedback<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const reduced = useReducedMotion();

  const trigger = useCallback(async () => {
    if (reduced || !ref.current) return;
    const { animate } = await getAnimate();
    const el = ref.current;
    if (!el) return;
    animate(el, {
      scale: [1, PUBLIC_MOTION.scale.pop, 1],
      duration: PUBLIC_MOTION.duration.success,
      easing: PUBLIC_MOTION.easing.pop,
    });
  }, [reduced]);

  return { ref, trigger };
}
