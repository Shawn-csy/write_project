import { renderHook } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getAnimate so we can track whether it was called
vi.mock("@/lib/motion/animeLoader", () => ({
  getAnimate: vi.fn(),
}));

import { getAnimate } from "@/lib/motion/animeLoader";
import { useHeroBrandAnimation } from "./useHeroBrandAnimation";

function makeRef(el: HTMLElement | null) {
  return { current: el };
}

function setMatchMedia({
  coarse = false,
  reducedMotion = false,
  mobileViewport = false,
}: { coarse?: boolean; reducedMotion?: boolean; mobileViewport?: boolean } = {}) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches:
      (query === "(pointer: coarse)" && coarse) ||
      (query === "(prefers-reduced-motion: reduce)" && reducedMotion) ||
      (query === "(max-width: 639px)" && mobileViewport),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

describe("useHeroBrandAnimation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setMatchMedia();
  });

  it("does not call getAnimate when pointer is coarse", () => {
    setMatchMedia({ coarse: true });
    const el = document.createElement("div");
    renderHook(() => useHeroBrandAnimation(makeRef(el)));
    expect(getAnimate).not.toHaveBeenCalled();
  });

  it("does not call getAnimate when reduced-motion is set", () => {
    setMatchMedia({ reducedMotion: true });
    const el = document.createElement("div");
    renderHook(() => useHeroBrandAnimation(makeRef(el)));
    expect(getAnimate).not.toHaveBeenCalled();
  });

  it("does not call getAnimate on mobile viewport (max-width:639px)", () => {
    setMatchMedia({ mobileViewport: true });
    const el = document.createElement("div");
    renderHook(() => useHeroBrandAnimation(makeRef(el)));
    expect(getAnimate).not.toHaveBeenCalled();
  });

  it("calls getAnimate when pointer is fine, no reduced-motion, desktop viewport", () => {
    setMatchMedia();
    const mockAnimate = vi.fn().mockReturnValue({ pause: vi.fn() });
    (getAnimate as ReturnType<typeof vi.fn>).mockResolvedValue({
      animate: mockAnimate,
      stagger: vi.fn().mockReturnValue(0),
    });
    const el = document.createElement("div");
    renderHook(() => useHeroBrandAnimation(makeRef(el)));
    expect(getAnimate).toHaveBeenCalledTimes(1);
  });
});
