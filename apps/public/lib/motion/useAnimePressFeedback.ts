import { useCallback, useRef } from "react";
import { useReducedMotion } from "./useReducedMotion";
import { PUBLIC_MOTION } from "./motionTokens";
import { getAnimate } from "./animeLoader";

/**
 * Returns pointer event handlers that animate a ref element with a press
 * scale-down → settle sequence. Lazy-loads Anime.js on first press.
 *
 * Import is cached at module level so parallel pointerdown/pointerup calls
 * resolve from the same promise, preventing scale ordering races.
 *
 * Usage:
 *   const { ref, handlers } = useAnimePressFeedback<HTMLButtonElement>();
 *   <button ref={ref} {...handlers}>...</button>
 */
export function useAnimePressFeedback<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const reduced = useReducedMotion();

  const press = useCallback(async () => {
    if (reduced || !ref.current) return;
    const { animate } = await getAnimate();
    const el = ref.current;
    if (!el) return;
    animate(el, {
      scale: [1, PUBLIC_MOTION.scale.press],
      duration: PUBLIC_MOTION.duration.press,
      easing: PUBLIC_MOTION.easing.press,
    });
  }, [reduced]);

  const release = useCallback(async () => {
    if (reduced || !ref.current) return;
    const { animate } = await getAnimate();
    const el = ref.current;
    if (!el) return;
    animate(el, {
      scale: [PUBLIC_MOTION.scale.press, 1],
      duration: PUBLIC_MOTION.duration.settle,
      easing: PUBLIC_MOTION.easing.settle,
    });
  }, [reduced]);

  const handlers = {
    onPointerDown: press,
    onPointerUp: release,
    onPointerLeave: release,
  };

  return { ref, handlers };
}
