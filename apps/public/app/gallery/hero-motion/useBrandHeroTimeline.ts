/**
 * Brand hero Anime.js timeline — lazy-loaded after mount.
 * Orchestrates: page-curl loop + dialogue line stagger highlight.
 *
 * CSS keyframes (@brand-script-page-curl, @brand-script-highlight) remain as
 * the static fallback for prefers-reduced-motion and no-JS contexts.
 * When this hook runs, it suppresses the CSS animations and takes over.
 */
import { useEffect, useRef } from "react";
import { useReducedMotion } from "@/lib/motion/useReducedMotion";

export function useBrandHeroTimeline(containerRef: React.RefObject<HTMLElement | null>) {
  const reduced = useReducedMotion();
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (reduced || !containerRef.current) return;

    let cancelled = false;

    async function run() {
      const { animate, stagger } = await import("animejs");
      if (cancelled || !containerRef.current) return;

      const container = containerRef.current;

      const pageTurn = container.querySelector<HTMLElement>(".brand-script-page-turn");
      const lines = container.querySelectorAll<HTMLElement>(".brand-script-line");

      if (!pageTurn && lines.length === 0) return;

      // Suppress CSS animations now that JS takes over
      if (pageTurn) pageTurn.style.animation = "none";
      lines.forEach((l) => { l.style.animation = "none"; });

      // Page curl loop
      let curlAnim: ReturnType<typeof animate> | null = null;
      if (pageTurn) {
        curlAnim = animate(pageTurn, {
          rotateY: ["-8deg", "-24deg", "-8deg"],
          opacity: [0.22, 0.46, 0.22],
          duration: 8000,
          delay: 4000,
          easing: "easeInOutSine",
          loop: true,
        });
      }

      // Dialogue line stagger highlight — loop
      let lineAnim: ReturnType<typeof animate> | null = null;
      if (lines.length > 0) {
        lineAnim = animate(lines, {
          opacity: [0.42, 0.82, 0.5, 0.42],
          translateX: [0, -4, 0, 0],
          duration: 5600,
          delay: stagger(900),
          easing: "easeInOutSine",
          loop: true,
        });
      }

      cleanupRef.current = () => {
        curlAnim?.pause();
        lineAnim?.pause();
        // Restore CSS animations on cleanup so static fallback works again
        if (pageTurn) pageTurn.style.animation = "";
        lines.forEach((l) => { l.style.animation = ""; });
      };
    }

    run();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cleanupRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);
}
