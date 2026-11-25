"use client";

import { useEffect, useRef, useState, type FocusEvent } from "react";

const SCROLL_SETTLE_MS = 150;

function wrap(position: number, width: number) {
  return ((position % width) + width) % width;
}

/** A continuous marquee on a native scroller, so the same track supports touch and keyboard navigation. */
export function useLoopingScroll(count: number, resetKey: string, pixelsPerSecond: number) {
  const trackRef = useRef<HTMLDivElement>(null);
  const geometry = useRef({ stride: 0, cycle: 0, base: 0 });
  const autoLeft = useRef<number | null>(null);
  const floatingLeft = useRef(0);
  const resumeAt = useRef(0);
  const [paddingCycles, setPaddingCycles] = useState(1);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [inView, setInView] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [paused, setPaused] = useState(false);
  const looping = count > 1;

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const motion = () => setReducedMotion(preference.matches);
    const visibility = () => setHidden(document.visibilityState === "hidden");
    const release = () => setDragging(false);
    motion();
    visibility();
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

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !looping) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    observer.observe(track);
    return () => observer.disconnect();
  }, [looping]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    if (!looping) {
      track.scrollLeft = 0;
      return;
    }
    let settleTimer: number;
    const hasScrollEnd = "onscrollend" in track;

    const measure = (reset = false) => {
      const first = track.children[0] as HTMLElement | undefined;
      const second = track.children[1] as HTMLElement | undefined;
      const nextCycle = track.children[count] as HTMLElement | undefined;
      if (!first || !second || !nextCycle) return;
      const stride = second.offsetLeft - first.offsetLeft;
      const cycle = nextCycle.offsetLeft - first.offsetLeft;
      if (stride <= 0 || cycle <= 0) return;
      // The final replica has no trailing gap, so leave room for it at the seam.
      const gap = Number.parseFloat(getComputedStyle(track).columnGap) || 0;
      const needed = Math.max(1, Math.ceil((track.clientWidth + gap) / cycle));
      if (needed !== paddingCycles) setPaddingCycles(needed);
      const base = cycle * paddingCycles;
      const previous = geometry.current;
      if (!reset && previous.cycle === cycle && previous.base === base) return;
      const progress = !reset && previous.cycle
        ? wrap(track.scrollLeft - previous.base, previous.cycle) / previous.cycle
        : 0;
      geometry.current = { stride, cycle, base };
      track.scrollLeft = base + progress * cycle;
      autoLeft.current = track.scrollLeft;
      floatingLeft.current = track.scrollLeft;
    };

    const settle = () => {
      const { base, cycle } = geometry.current;
      if (!cycle || track.scrollLeft === autoLeft.current) return;
      const next = base + wrap(track.scrollLeft - base, cycle);
      if (Math.abs(next - track.scrollLeft) >= 1) track.scrollLeft = next;
      autoLeft.current = track.scrollLeft;
      floatingLeft.current = track.scrollLeft;
    };
    const onScroll = () => {
      if (track.scrollLeft === autoLeft.current) return;
      resumeAt.current = performance.now() + SCROLL_SETTLE_MS;
      if (!hasScrollEnd) {
        window.clearTimeout(settleTimer);
        settleTimer = window.setTimeout(settle, SCROLL_SETTLE_MS);
      }
    };
    const resize = () => measure();
    measure(true);
    track.addEventListener("scroll", onScroll, { passive: true });
    if (hasScrollEnd) track.addEventListener("scrollend", settle);
    window.addEventListener("resize", resize);
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(resize);
    observer?.observe(track);
    return () => {
      observer?.disconnect();
      window.clearTimeout(settleTimer);
      track.removeEventListener("scroll", onScroll);
      track.removeEventListener("scrollend", settle);
      window.removeEventListener("resize", resize);
    };
  }, [count, looping, paddingCycles, resetKey]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !looping || !inView || hovered || focused || dragging || hidden || reducedMotion || paused) return;
    let frame: number;
    let previousTime: number | undefined;
    floatingLeft.current = track.scrollLeft;

    const tick = (time: number) => {
      const elapsed = previousTime === undefined ? 0 : Math.min(time - previousTime, 50);
      previousTime = time;
      const { base, cycle } = geometry.current;
      if (cycle && time >= resumeAt.current && elapsed > 0) {
        if (track.scrollLeft !== autoLeft.current) floatingLeft.current = track.scrollLeft;
        const position = base + wrap(floatingLeft.current - base + elapsed * pixelsPerSecond / 1000, cycle);
        floatingLeft.current = position;
        track.scrollLeft = position;
        autoLeft.current = track.scrollLeft;
      } else {
        floatingLeft.current = track.scrollLeft;
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [looping, inView, hovered, focused, dragging, hidden, reducedMotion, paused, pixelsPerSecond, resetKey]);

  return {
    trackRef, looping, paused, reducedMotion,
    togglePaused: () => setPaused((value) => !value),
    move: (direction: -1 | 1) => {
      resumeAt.current = performance.now() + SCROLL_SETTLE_MS;
      trackRef.current?.scrollBy({ left: direction * geometry.current.stride, behavior: reducedMotion ? "auto" : "smooth" });
    },
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
