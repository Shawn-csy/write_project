/**
 * Motion hook tests — behaviour without a real DOM/anime.js.
 * Covers reduced-motion bypass, stale-ref guard, and cleanup.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ── helpers ──────────────────────────────────────────────────────────────────

/** Fake matchMedia — reduced=true returns a matching media query. */
function mockMatchMedia(reduced: boolean) {
  return vi.fn().mockImplementation((query: string) => ({
    matches: reduced && query.includes("reduce"),
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
}

// ── useReducedMotion ──────────────────────────────────────────────────────────

describe("useReducedMotion", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns false when prefers-reduced-motion does not match", async () => {
    Object.defineProperty(window, "matchMedia", { writable: true, value: mockMatchMedia(false) });
    const { useReducedMotion } = await import("../useReducedMotion");
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it("returns true when prefers-reduced-motion matches", async () => {
    Object.defineProperty(window, "matchMedia", { writable: true, value: mockMatchMedia(true) });
    const { useReducedMotion } = await import("../useReducedMotion");
    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });
});

// ── useAnimePressFeedback ─────────────────────────────────────────────────────

// Mock animejs at module level — vi.mock is hoisted so all hooks pick it up.
// The shared animeLoader.ts re-exports this same module, so one mock covers all three hooks.
const animeMock = { animate: vi.fn(), stagger: vi.fn().mockReturnValue(0) };
vi.mock("animejs", () => animeMock);

describe("useAnimePressFeedback", () => {
  beforeEach(() => animeMock.animate.mockClear());
  afterEach(() => vi.restoreAllMocks());

  it("does not call animate when reduced motion is active", async () => {
    Object.defineProperty(window, "matchMedia", { writable: true, value: mockMatchMedia(true) });
    const { useAnimePressFeedback } = await import("../useAnimePressFeedback");
    const { result } = renderHook(() => useAnimePressFeedback<HTMLButtonElement>());

    await act(async () => { await result.current.handlers.onPointerDown(); });
    await act(async () => { await result.current.handlers.onPointerUp(); });

    expect(animeMock.animate).not.toHaveBeenCalled();
  });

  it("does not throw when ref is null after async import", async () => {
    Object.defineProperty(window, "matchMedia", { writable: true, value: mockMatchMedia(false) });
    const { useAnimePressFeedback } = await import("../useAnimePressFeedback");
    const { result } = renderHook(() => useAnimePressFeedback<HTMLButtonElement>());
    // ref.current is null (no DOM element attached) — stale-ref guard must catch this
    await expect(act(async () => { await result.current.handlers.onPointerDown(); })).resolves.not.toThrow();
  });
});

// ── useAnimeSuccessFeedback ───────────────────────────────────────────────────

describe("useAnimeSuccessFeedback", () => {
  beforeEach(() => animeMock.animate.mockClear());
  afterEach(() => vi.restoreAllMocks());

  it("does not call animate when reduced motion is active", async () => {
    Object.defineProperty(window, "matchMedia", { writable: true, value: mockMatchMedia(true) });
    const { useAnimeSuccessFeedback } = await import("../useAnimeSuccessFeedback");
    const { result } = renderHook(() => useAnimeSuccessFeedback<HTMLButtonElement>());

    await act(async () => { await result.current.trigger(); });

    expect(animeMock.animate).not.toHaveBeenCalled();
  });

  it("does not throw when ref is null after async import", async () => {
    Object.defineProperty(window, "matchMedia", { writable: true, value: mockMatchMedia(false) });
    const { useAnimeSuccessFeedback } = await import("../useAnimeSuccessFeedback");
    const { result } = renderHook(() => useAnimeSuccessFeedback<HTMLButtonElement>());
    await expect(act(async () => { await result.current.trigger(); })).resolves.not.toThrow();
  });
});

// ── useAnimePrewarm ───────────────────────────────────────────────────────────
//
// These tests check scheduling behaviour only — not the animejs import itself,
// since animejs is already mocked at module scope above and getAnimate() shares
// the same cached promise across all tests in this file.

describe("useAnimePrewarm", () => {
  afterEach(() => vi.restoreAllMocks());

  it("schedules requestIdleCallback when motion is not reduced", async () => {
    Object.defineProperty(window, "matchMedia", { writable: true, value: mockMatchMedia(false) });

    const ricSpy = vi.fn().mockReturnValue(1);
    vi.stubGlobal("requestIdleCallback", ricSpy);
    vi.stubGlobal("cancelIdleCallback", vi.fn());

    const { useAnimePrewarm } = await import("../useAnimePrewarm");
    renderHook(() => useAnimePrewarm());

    expect(ricSpy).toHaveBeenCalledWith(expect.any(Function));
  });

  it("does not schedule requestIdleCallback when prefers-reduced-motion is active", async () => {
    Object.defineProperty(window, "matchMedia", { writable: true, value: mockMatchMedia(true) });

    const ricSpy = vi.fn().mockReturnValue(1);
    vi.stubGlobal("requestIdleCallback", ricSpy);

    const { useAnimePrewarm } = await import("../useAnimePrewarm");
    renderHook(() => useAnimePrewarm());

    expect(ricSpy).not.toHaveBeenCalled();
  });

  it("cancels idle callback on unmount", async () => {
    Object.defineProperty(window, "matchMedia", { writable: true, value: mockMatchMedia(false) });

    const cancelRic = vi.fn();
    vi.stubGlobal("requestIdleCallback", () => 42);
    vi.stubGlobal("cancelIdleCallback", cancelRic);

    const { useAnimePrewarm } = await import("../useAnimePrewarm");
    const { unmount } = renderHook(() => useAnimePrewarm());
    unmount();

    expect(cancelRic).toHaveBeenCalledWith(42);
  });

  it("falls back to setTimeout with FALLBACK_PREWARM_DELAY_MS when requestIdleCallback is absent", async () => {
    Object.defineProperty(window, "matchMedia", { writable: true, value: mockMatchMedia(false) });

    const originalRic = (window as unknown as Record<string, unknown>).requestIdleCallback;
    delete (window as unknown as Record<string, unknown>).requestIdleCallback;

    const setTimeoutSpy = vi.spyOn(window, "setTimeout");

    try {
      const { useAnimePrewarm, FALLBACK_PREWARM_DELAY_MS } = await import("../useAnimePrewarm");
      renderHook(() => useAnimePrewarm());
      expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), FALLBACK_PREWARM_DELAY_MS);
    } finally {
      if (originalRic !== undefined) {
        (window as unknown as Record<string, unknown>).requestIdleCallback = originalRic;
      }
    }
  });
});

// ── useHeroBrandAnimation ─────────────────────────────────────────────────────

describe("useHeroBrandAnimation", () => {
  beforeEach(() => {
    animeMock.animate.mockClear();
    animeMock.stagger.mockClear();
    animeMock.animate.mockReturnValue({ pause: vi.fn() });
    animeMock.stagger.mockReturnValue(0);
  });
  afterEach(() => vi.restoreAllMocks());

  function makeContainer() {
    const container = document.createElement("div");

    // 3 page stack entrance wrappers (right side)
    for (let i = 0; i < 3; i++) {
      const w = document.createElement("div");
      w.setAttribute("data-script-page-enter", "");
      container.appendChild(w);
    }
    // light sweep
    const sweep = document.createElement("div");
    sweep.setAttribute("data-light-sweep", "");
    container.appendChild(sweep);

    document.body.appendChild(container);
    return container;
  }

  it("bypasses Anime.js when reduced motion is active", async () => {
    Object.defineProperty(window, "matchMedia", { writable: true, value: mockMatchMedia(true) });
    const { useHeroBrandAnimation } = await import("../useHeroBrandAnimation");
    const container = makeContainer();
    const ref = { current: container };

    await act(async () => {
      renderHook(() => useHeroBrandAnimation(ref));
      await Promise.resolve();
    });

    expect(animeMock.animate).not.toHaveBeenCalled();
    document.body.removeChild(container);
  });

  it("uses getAnimate (not direct animejs import) — animate is called via mock", async () => {
    Object.defineProperty(window, "matchMedia", { writable: true, value: mockMatchMedia(false) });

    // Warm the shared animeLoader cache so getAnimate() resolves synchronously
    const { getAnimate: warmCache } = await import("../animeLoader");
    await warmCache();

    const { useHeroBrandAnimation } = await import("../useHeroBrandAnimation");
    const container = makeContainer();
    const ref = { current: container };

    await act(async () => {
      renderHook(() => useHeroBrandAnimation(ref));
      // flush: effect → run() → await getAnimate() → animate calls
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    // getAnimate() routes through vi.mock("animejs") — animate is called.
    expect(animeMock.animate).toHaveBeenCalled();
    document.body.removeChild(container);
  });

  it("only animates wrapper nodes — never layout properties", async () => {
    Object.defineProperty(window, "matchMedia", { writable: true, value: mockMatchMedia(false) });
    animeMock.animate.mockReturnValue({ pause: vi.fn() });

    const { useHeroBrandAnimation } = await import("../useHeroBrandAnimation");
    const container = makeContainer();
    const ref = { current: container };

    await act(async () => {
      renderHook(() => useHeroBrandAnimation(ref));
      await Promise.resolve();
      await Promise.resolve();
    });

    const LAYOUT_PROPS = ["width", "height", "left", "top", "right", "bottom", "rotate", "rotateY"];
    for (const call of animeMock.animate.mock.calls) {
      const props = call[1] as Record<string, unknown>;
      for (const key of LAYOUT_PROPS) {
        expect(props, `animate() must not contain "${key}"`).not.toHaveProperty(key);
      }
    }
    document.body.removeChild(container);
  });

  it("sets data-hero-motion=entering only after Anime ready, removes it after", async () => {
    Object.defineProperty(window, "matchMedia", { writable: true, value: mockMatchMedia(false) });

    const { useHeroBrandAnimation } = await import("../useHeroBrandAnimation");
    const container = makeContainer();
    const ref = { current: container };

    let attrDuringAnimate = "";
    animeMock.animate.mockImplementation(() => {
      // Attribute must be present during animate() — set after getAnimate() resolved
      if (!attrDuringAnimate) {
        attrDuringAnimate = container.getAttribute("data-hero-motion") ?? "";
      }
      return { pause: vi.fn() };
    });

    await act(async () => {
      renderHook(() => useHeroBrandAnimation(ref));
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(attrDuringAnimate).toBe("entering");
    // Removed after Anime takes over via inline style
    expect(container.hasAttribute("data-hero-motion")).toBe(false);
    document.body.removeChild(container);
  });

  it("restores scene visibility if getAnimate() rejects", async () => {
    Object.defineProperty(window, "matchMedia", { writable: true, value: mockMatchMedia(false) });

    // Override the animeLoader to reject
    const animeLoaderMod = await import("../animeLoader");
    const originalGetAnimate = animeLoaderMod.getAnimate;
    vi.spyOn(animeLoaderMod, "getAnimate").mockRejectedValue(new Error("chunk failed"));

    const { useHeroBrandAnimation } = await import("../useHeroBrandAnimation");
    const container = makeContainer();
    const ref = { current: container };

    await act(async () => {
      renderHook(() => useHeroBrandAnimation(ref));
      await Promise.resolve();
      await Promise.resolve();
    });

    // Attribute must not be set — scene stays visible statically
    expect(container.hasAttribute("data-hero-motion")).toBe(false);
    expect(animeMock.animate).not.toHaveBeenCalled();

    vi.spyOn(animeLoaderMod, "getAnimate").mockRestore?.();
    // Restore original to not pollute other tests
    Object.defineProperty(animeLoaderMod, "getAnimate", { value: originalGetAnimate, writable: true });
    document.body.removeChild(container);
  });

  it("source: uses getAnimate(), does not import animejs directly", async () => {
    const { readFileSync } = await import("fs");
    const { join } = await import("path");
    const src = readFileSync(join(__dirname, "../useHeroBrandAnimation.ts"), "utf-8");
    expect(src).toContain("getAnimate");
    expect(src).not.toMatch(/import\(["']animejs["']\)/);
  });

  it("cleanup pauses all instances and resets wrapper visibility", async () => {
    Object.defineProperty(window, "matchMedia", { writable: true, value: mockMatchMedia(false) });
    const pauseSpy = vi.fn();
    animeMock.animate.mockReturnValue({ pause: pauseSpy });

    const { useHeroBrandAnimation } = await import("../useHeroBrandAnimation");
    const container = makeContainer();
    const ref = { current: container };

    let unmount: () => void;
    await act(async () => {
      ({ unmount } = renderHook(() => useHeroBrandAnimation(ref)));
      await Promise.resolve();
      await Promise.resolve();
    });

    // Force wrappers into mid-animation state
    container.setAttribute("data-hero-motion", "entering");
    container.querySelectorAll<HTMLElement>("[data-script-page-enter]")
      .forEach((el) => { el.style.opacity = "0.5"; });

    await act(async () => { unmount!(); });

    expect(pauseSpy).toHaveBeenCalled();
    expect(container.hasAttribute("data-hero-motion")).toBe(false);
    const wrappers = container.querySelectorAll<HTMLElement>("[data-script-page-enter]");
    wrappers.forEach((el) => {
      expect(el.style.opacity).toBe("");
    });
    document.body.removeChild(container);
  });
});

// ── useAnimeSegmentIndicator ──────────────────────────────────────────────────

describe("useAnimeSegmentIndicator", () => {
  beforeEach(() => animeMock.animate.mockClear());
  afterEach(() => vi.restoreAllMocks());

  it("returns trackRef, pillRef, setBtnRef", async () => {
    Object.defineProperty(window, "matchMedia", { writable: true, value: mockMatchMedia(false) });
    const { useAnimeSegmentIndicator } = await import("../useAnimeSegmentIndicator");
    const { result } = renderHook(() => useAnimeSegmentIndicator("a"));
    expect(result.current.trackRef).toBeDefined();
    expect(result.current.pillRef).toBeDefined();
    expect(typeof result.current.setBtnRef).toBe("function");
  });

  it("does not throw when pill/track refs are null (reduced motion)", async () => {
    Object.defineProperty(window, "matchMedia", { writable: true, value: mockMatchMedia(true) });
    const { useAnimeSegmentIndicator } = await import("../useAnimeSegmentIndicator");
    expect(() => renderHook(() => useAnimeSegmentIndicator("a"))).not.toThrow();
  });

  it("animate payload never contains layout properties (width/left/top/height)", async () => {
    Object.defineProperty(window, "matchMedia", { writable: true, value: mockMatchMedia(false) });

    // Stub rAF to invoke the callback synchronously so isFirstRender is cleared
    // without needing real fake-timer infrastructure.
    const rafSpy = vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(0);
      return 0;
    });

    try {
      const { useAnimeSegmentIndicator } = await import("../useAnimeSegmentIndicator");

      const makeEl = (left: number, width: number) => ({
        getBoundingClientRect: () => ({ left, width, top: 0, height: 32, right: left + width, bottom: 32 }),
        style: {} as CSSStyleDeclaration,
      });

      const trackEl = makeEl(0, 240);
      const pillEl = makeEl(0, 120);
      const btnA = makeEl(0, 120);
      const btnB = makeEl(120, 120);

      // Single renderHook instance.
      const { result, rerender } = renderHook(
        ({ v }: { v: "a" | "b" }) => useAnimeSegmentIndicator(v),
        { initialProps: { v: "a" as "a" | "b" } },
      );

      // Attach refs to the hook's own ref objects.
      (result.current.trackRef as React.MutableRefObject<unknown>).current = trackEl;
      (result.current.pillRef as React.MutableRefObject<unknown>).current = pillEl;
      (result.current.setBtnRef("a") as (el: unknown) => void)(btnA);
      (result.current.setBtnRef("b") as (el: unknown) => void)(btnB);

      // Warm the shared animeLoader cache so the upcoming movePill(_, true) resolves
      // synchronously inside act() rather than scheduling a new dynamic import.
      const { getAnimate: warmCache } = await import("../animeLoader");
      await warmCache();

      // Allow any initial movePill(activeValue, false) calls to settle.
      await act(async () => {});
      // Verify refs are actually wired before clearing the mock.
      expect(result.current.trackRef.current).toBeTruthy();
      expect(result.current.pillRef.current).toBeTruthy();
      animeMock.animate.mockClear();

      // Trigger animate-on-change effect (animate=true path).
      // Cache is warm so await getAnimate() resolves in one microtask tick.
      await act(async () => { rerender({ v: "b" }); });
      await act(async () => { await Promise.resolve(); });

      // Guard: if animate wasn't called the payload check below is vacuously true.
      expect(animeMock.animate).toHaveBeenCalled();

      const LAYOUT_PROPS = ["width", "height", "left", "top", "right", "bottom", "margin", "padding"];
      for (const call of animeMock.animate.mock.calls) {
        const props = call[1] as Record<string, unknown>;
        for (const key of LAYOUT_PROPS) {
          expect(props, `animate() must not contain layout property "${key}"`).not.toHaveProperty(key);
        }
      }
    } finally {
      rafSpy.mockRestore();
    }
  });
});
