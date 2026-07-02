import React from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGalleryUrlState } from "./useGalleryUrlState";
import { DEFAULT_URL_STATE } from "@write/public-ui";

describe("useGalleryUrlState", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    window.history.replaceState(null, "", "/");
  });

  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("updates segment with native history.pushState, not App Router navigation", () => {
    const pushSpy = vi.spyOn(window.history, "pushState");
    const replaceSpy = vi.spyOn(window.history, "replaceState");
    const { result } = renderHook(() => useGalleryUrlState(DEFAULT_URL_STATE));

    act(() => result.current.actions.setSegment("female"));

    expect(pushSpy).toHaveBeenCalledWith(null, "", "/?segment=female");
    expect(replaceSpy).not.toHaveBeenCalledWith(null, "", "/?segment=female");
  });

  it("updates search with native history.replaceState so typing does not create history entries", () => {
    const pushSpy = vi.spyOn(window.history, "pushState");
    const replaceSpy = vi.spyOn(window.history, "replaceState");
    const { result } = renderHook(() => useGalleryUrlState(DEFAULT_URL_STATE));

    act(() => result.current.actions.setQ("hello"));

    expect(replaceSpy).toHaveBeenCalledWith(null, "", "/?q=hello");
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it("does not write duplicate history entries for the current URL", () => {
    window.history.replaceState(null, "", "/?segment=female");
    const pushSpy = vi.spyOn(window.history, "pushState");
    const { result } = renderHook(() => useGalleryUrlState({ ...DEFAULT_URL_STATE, segment: "female" }));

    act(() => result.current.actions.setSegment("female"));

    expect(pushSpy).not.toHaveBeenCalled();
  });

  it("merges rapid consecutive updates against the latest intended URL", () => {
    const pushSpy = vi.spyOn(window.history, "pushState");
    const { result } = renderHook(() => useGalleryUrlState(DEFAULT_URL_STATE));

    act(() => {
      result.current.actions.setSegment("female");
      result.current.actions.setUsage("commercial");
    });

    expect(pushSpy).toHaveBeenLastCalledWith(null, "", "/?usage=commercial&segment=female");
  });
});
