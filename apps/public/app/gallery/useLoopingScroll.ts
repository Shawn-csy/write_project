"use client";

import { useEffect, useRef, useState, type FocusEvent } from "react";

/** Native scroll loop using the banner's settle strategy; callers own their cards. */
export function useLoopingScroll(count: number, resetKey: string, intervalMs: number) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [paddingCycles, setPaddingCycles] = useState(1);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const looping = count > 1;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReducedMotion(preference.matches);
    const visibility = () => setHidden(document.visibilityState === "hidden");
    const release = () => setDragging(false);
    motion(); visibility();
    preference.addEventListener("change", motion);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      preference.removeEventListener("change", motion);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, []);

  const stride = () => {
    const track = trackRef.current;
    const first = track?.children[0] as HTMLElement | undefined;
    const second = track?.children[1] as HTMLElement | undefined;
    return first && second && second.offsetLeft > first.offsetLeft ? second.offsetLeft - first.offsetLeft : 0;
  };
  const move = (direction: number) => {
    trackRef.current?.scrollBy({ left: direction * stride(), behavior: reducedMotion ? "auto" : "smooth" });
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (!looping) { track.scrollLeft = 0; return; }
    let settleTimer: number;
    const base = () => stride() * count * paddingCycles;
    const reset = () => {
      const cycle = stride() * count;
      if (cycle > 0) setPaddingCycles(Math.max(1, Math.ceil(track.clientWidth / cycle)));
      track.scrollLeft = base();
    };
    const normalize = () => {
      const cycle = stride() * count;
      if (!cycle) return;
      const phase = ((track.scrollLeft - base()) % cycle + cycle) % cycle;
      track.scrollLeft = base() + (Math.abs(phase - cycle) < 1 ? 0 : phase);
    };
    const scroll = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(normalize, 150);
    };
    reset();
    track.addEventListener("scroll", scroll, { passive: true });
    track.addEventListener("scrollend", normalize);
    window.addEventListener("resize", reset);
    return () => {
      window.clearTimeout(settleTimer);
      track.removeEventListener("scroll", scroll);
      track.removeEventListener("scrollend", normalize);
      window.removeEventListener("resize", reset);
    };
  }, [count, looping, paddingCycles, resetKey]);

  useEffect(() => {
    if (!looping || hovered || focused || dragging || hidden || reducedMotion) return;
    const timer = window.setInterval(() => move(1), intervalMs);
    return () => window.clearInterval(timer);
  }, [looping, hovered, focused, dragging, hidden, reducedMotion, intervalMs, resetKey]);

  return {
    trackRef, move, looping,
    cycles: looping
      ? Array.from({ length: paddingCycles * 2 + 1 }, (_, index) => index === paddingCycles ? "original" : `copy-${index}`)
      : ["original"],
    interactionProps: {
      onMouseEnter: () => setHovered(true),
      onMouseLeave: () => setHovered(false),
      onFocusCapture: () => setFocused(true),
      onBlurCapture: (event: FocusEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false);
      },
      onPointerDown: () => setDragging(true),
    },
  };
}
