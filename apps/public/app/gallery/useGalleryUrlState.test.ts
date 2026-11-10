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

  it("re-syncs state on browser back/forward so the next click on that view is not a no-op", () => {
    const { result } = renderHook(() => useGalleryUrlState(DEFAULT_URL_STATE));

    act(() => result.current.actions.setView("authors"));
    act(() => result.current.actions.setView("scripts"));
    expect(result.current.state.view).toBe("scripts");

    // Browser "back": the URL returns to the authors entry without calling nav().
    act(() => {
      window.history.replaceState(null, "", "/authors");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current.state.view).toBe("authors");

    act(() => result.current.actions.setView("scripts"));
    expect(result.current.state.view).toBe("scripts");
    expect(window.location.search).toBe("");
  });

  it("keeps author filters on the author route", () => {
    window.history.replaceState(null, "", "/authors");
    const { result } = renderHook(() => useGalleryUrlState({ ...DEFAULT_URL_STATE, view: "authors" }));

    act(() => result.current.actions.toggleAuthorTag("劇情"));

    expect(window.location.pathname).toBe("/authors");
    expect(window.location.search).toBe("?authorTag=%E5%8A%87%E6%83%85");
    expect(result.current.state.view).toBe("authors");
  });

  it("canonicalizes legacy author links to the author route", () => {
    window.history.replaceState(null, "", "/?view=authors&authorTag=劇情");
    const { result } = renderHook(() => useGalleryUrlState(DEFAULT_URL_STATE));

    expect(window.location.pathname).toBe("/authors");
    expect(result.current.state.view).toBe("authors");
    expect(result.current.state.authorTags).toEqual(["劇情"]);
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
