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
const animeMock = { animate: vi.fn() };
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
        { initialProps: { v: "a" as const } },
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
