"use client";

/**
 * Hero brand entrance animation — lazy Anime.js, one mount timeline.
 *
 * Static-first: wrappers are visible by default (no CSS opacity set).
 * data-hero-motion="entering" is set only after getAnimate() resolves
 * successfully, immediately before animate() runs. This means:
 * - Slow Anime chunk: scene stays visible until ready, then entrance plays.
 * - Failed import: try/catch/finally clears the attribute and inline styles —
 *   scene stays visible statically.
 * - JS absent: scene visible, no attribute ever set.
 *
 * Animates entrance wrapper nodes ([data-script-page-enter]) only.
 * Inner nodes keep their static
 * composition transforms (rotate, translateX/Y for stack depth) untouched.
 *
 * No infinite loops — idle motion is CSS-only keyframes.
 */
import { useEffect, useRef } from "react";
import { useReducedMotion } from "./useReducedMotion";
import { getAnimate } from "./animeLoader";

type AnimeInstance = { pause: () => void };

function resetEnterWrappers(container: HTMLElement) {
  container.querySelectorAll<HTMLElement>("[data-script-page-enter]")
    .forEach((el) => { el.style.opacity = ""; el.style.transform = ""; });
}

function useShouldSkipAnimation(): boolean {
  if (typeof window === "undefined") return true;
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    window.matchMedia("(max-width: 639px)").matches
  );
}

export function useHeroBrandAnimation(
  containerRef: React.RefObject<HTMLElement | null>
) {
  const reduced = useReducedMotion();
  const skipMotion = useShouldSkipAnimation();
  const instancesRef = useRef<AnimeInstance[]>([]);

  useEffect(() => {
    if (reduced || skipMotion || !containerRef.current) return;

    const container = containerRef.current;
    let cancelled = false;

    async function run() {
      let animate: Awaited<ReturnType<typeof getAnimate>>["animate"];
      let stagger: Awaited<ReturnType<typeof getAnimate>>["stagger"];

      try {
        ({ animate, stagger } = await getAnimate());
      } catch {
        // Import failed — scene stays visible statically, nothing to clean up
        return;
      }

      if (cancelled || !containerRef.current) return;

      // Set entering state only after Anime is ready — slow or failed load never hides the scene
      container.setAttribute("data-hero-motion", "entering");

      try {
        const pageEnters = container.querySelectorAll<HTMLElement>("[data-script-page-enter]");
        const sweep = container.querySelector<HTMLElement>("[data-light-sweep]");

        const instances: AnimeInstance[] = [];

        // Page stack entrance — wrapper translateY/opacity; inner keeps static rotate+translate
        if (pageEnters.length > 0) {
          instances.push(animate(pageEnters, {
            translateY: ["12px", "0px"],
            opacity: [0, 1],
            duration: 700,
            delay: stagger(80),
            easing: "cubicBezier(0.22, 1, 0.36, 1)",
          }));
        }

        // Light sweep — one-shot opacity pulse
        if (sweep) {
          instances.push(animate(sweep, {
            opacity: [0, 0.18, 0],
            duration: 900,
            delay: 300,
            easing: "easeInOutSine",
          }));
        }

        // Anime has taken over opacity via inline style — attribute no longer needed
        container.removeAttribute("data-hero-motion");
        instancesRef.current = instances;
      } catch {
        // animate() threw — restore static visibility
        container.removeAttribute("data-hero-motion");
        resetEnterWrappers(container);
      }
    }

    run();

    return () => {
      cancelled = true;
      instancesRef.current.forEach((a) => a.pause());
      instancesRef.current = [];
      container.removeAttribute("data-hero-motion");
      resetEnterWrappers(container);
    };
  }, [reduced, skipMotion]); // eslint-disable-line react-hooks/exhaustive-deps
}
