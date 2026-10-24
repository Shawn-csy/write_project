import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import React from "react";
import { INITIAL_RENDERED_CARDS, useProgressiveLimit } from "./GalleryScriptResults";

describe("useProgressiveLimit", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("starts at the SSR limit so the first client render matches the server HTML", () => {
    const { result } = renderHook(() => useProgressiveLimit(INITIAL_RENDERED_CARDS));
    expect(result.current).toBe(INITIAL_RENDERED_CARDS);
  });

  it("uses the same limit during server rendering", () => {
    function Probe() {
      return <span data-limit={useProgressiveLimit(INITIAL_RENDERED_CARDS)} />;
    }
    expect(renderToString(<Probe />)).toContain(`data-limit="${INITIAL_RENDERED_CARDS}"`);
  });

  it("lifts the limit after hydration so every card eventually renders", () => {
    const { result } = renderHook(() => useProgressiveLimit(INITIAL_RENDERED_CARDS));
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(result.current).toBe(Number.POSITIVE_INFINITY);
  });
});
