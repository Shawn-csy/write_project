import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGalleryLayoutState } from "./useGalleryLayoutState";

beforeEach(() => localStorage.clear());

describe("useGalleryLayoutState", () => {
  it("defaults to expanded (false)", () => {
    const { result } = renderHook(() => useGalleryLayoutState());
    expect(result.current.sidebarCollapsed).toBe(false);
  });

  it("reads stored collapsed=true after mount", async () => {
    localStorage.setItem("public-gallery:layout", JSON.stringify({ sidebarCollapsed: true }));
    const { result } = renderHook(() => useGalleryLayoutState());
    // useEffect fires after render
    await act(async () => {});
    expect(result.current.sidebarCollapsed).toBe(true);
  });

  it("setSidebarCollapsed persists to localStorage", () => {
    const { result } = renderHook(() => useGalleryLayoutState());
    act(() => result.current.setSidebarCollapsed(true));
    expect(result.current.sidebarCollapsed).toBe(true);
    const stored = JSON.parse(localStorage.getItem("public-gallery:layout")!);
    expect(stored.sidebarCollapsed).toBe(true);
  });

  it("ignores malformed localStorage value", async () => {
    localStorage.setItem("public-gallery:layout", "not-json");
    const { result } = renderHook(() => useGalleryLayoutState());
    await act(async () => {});
    expect(result.current.sidebarCollapsed).toBe(false);
  });

  it("ignores missing sidebarCollapsed field", async () => {
    localStorage.setItem("public-gallery:layout", JSON.stringify({ other: 1 }));
    const { result } = renderHook(() => useGalleryLayoutState());
    await act(async () => {});
    expect(result.current.sidebarCollapsed).toBe(false);
  });
});
