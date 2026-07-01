import React from "react";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useSearchParams } from "next/navigation";
import { useGalleryUrlState } from "./useGalleryUrlState";

vi.mock("next/navigation", () => ({
  useSearchParams: vi.fn(),
}));

const mockedUseSearchParams = vi.mocked(useSearchParams);

function setSearch(search: string) {
  mockedUseSearchParams.mockReturnValue(new URLSearchParams(search) as ReturnType<typeof useSearchParams>);
  window.history.replaceState(null, "", search ? `/?${search}` : "/");
}

describe("useGalleryUrlState", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setSearch("");
  });

  afterEach(() => {
    window.history.replaceState(null, "", "/");
  });

  it("updates segment with native history.pushState, not App Router navigation", () => {
    const pushSpy = vi.spyOn(window.history, "pushState");
    const replaceSpy = vi.spyOn(window.history, "replaceState");
    const { result } = renderHook(() => useGalleryUrlState());

    act(() => result.current.actions.setSegment("female"));

    expect(pushSpy).toHaveBeenCalledWith(null, "", "/?segment=female");
    expect(replaceSpy).not.toHaveBeenCalledWith(null, "", "/?segment=female");
  });

  it("updates search with native history.replaceState so typing does not create history entries", () => {
    const pushSpy = vi.spyOn(window.history, "pushState");
    const replaceSpy = vi.spyOn(window.history, "replaceState");
    const { result } = renderHook(() => useGalleryUrlState());

    act(() => result.current.actions.setQ("hello"));

    expect(replaceSpy).toHaveBeenCalledWith(null, "", "/?q=hello");
    expect(pushSpy).not.toHaveBeenCalled();
  });

  it("does not write duplicate history entries for the current URL", () => {
    setSearch("segment=female");
    const pushSpy = vi.spyOn(window.history, "pushState");
    const { result } = renderHook(() => useGalleryUrlState());

    act(() => result.current.actions.setSegment("female"));

    expect(pushSpy).not.toHaveBeenCalled();
  });

  it("merges rapid consecutive updates against the latest intended URL", () => {
    const pushSpy = vi.spyOn(window.history, "pushState");
    const { result } = renderHook(() => useGalleryUrlState());

    act(() => {
      result.current.actions.setSegment("female");
      result.current.actions.setUsage("commercial");
    });

    expect(pushSpy).toHaveBeenLastCalledWith(null, "", "/?usage=commercial&segment=female");
  });
});
