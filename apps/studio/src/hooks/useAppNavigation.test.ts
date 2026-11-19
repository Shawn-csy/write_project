import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useAppNavigation } from "./useAppNavigation";

describe("useAppNavigation", () => {
  it("toggles settings and closes other overlays", () => {
    const { result } = renderHook(() => useAppNavigation());

    act(() => result.current.openAbout());
    expect(result.current.aboutOpen).toBe(true);
    expect(result.current.settingsOpen).toBe(false);

    act(() => result.current.openSettings());
    expect(result.current.settingsOpen).toBe(true);
    expect(result.current.aboutOpen).toBe(false);
    expect(result.current.homeOpen).toBe(false);

    act(() => result.current.openSettings());
    expect(result.current.settingsOpen).toBe(false);
  });

  it("opens home and resets overlays", () => {
    const { result } = renderHook(() => useAppNavigation());

    act(() => {
      result.current.openAbout();
      result.current.openSettings();
    });

    act(() => result.current.openHome());
    expect(result.current.homeOpen).toBe(true);
    expect(result.current.aboutOpen).toBe(false);
    expect(result.current.settingsOpen).toBe(false);
  });

  it("setSidebarOpen uses desktop sidebar on large screens", () => {
    const { result } = renderHook(() => useAppNavigation());
    const widthGetter = vi.spyOn(window, "innerWidth", "get").mockReturnValue(1280);

    act(() => result.current.setSidebarOpen(false));
    expect(result.current.isDesktopSidebarOpen).toBe(false);
    expect(result.current.isMobileDrawerOpen).toBe(false);

    widthGetter.mockRestore();
  });

  it("setSidebarOpen uses mobile drawer on small screens", () => {
    const { result } = renderHook(() => useAppNavigation());
    const widthGetter = vi.spyOn(window, "innerWidth", "get").mockReturnValue(375);

    act(() => result.current.setSidebarOpen(true));
    expect(result.current.isMobileDrawerOpen).toBe(true);

    widthGetter.mockRestore();
  });

  it("openSettings can target a specific tab", () => {
    const { result } = renderHook(() => useAppNavigation());

    act(() => result.current.openSettings("media"));
    expect(result.current.settingsOpen).toBe(true);
    expect(result.current.settingsTab).toBe("media");
  });
});
