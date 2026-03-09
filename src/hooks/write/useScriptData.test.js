import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useScriptData } from "./useScriptData";

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../lib/api/scripts", () => ({
  getUserScripts: vi.fn(),
}));

import { useAuth } from "../../contexts/AuthContext";
import { getUserScripts } from "../../lib/api/scripts";

describe("useScriptData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, "", "/");
    window.sessionStorage.clear();
  });

  it("deduplicates folders by path/title and keeps newer one", async () => {
    useAuth.mockReturnValue({ currentUser: { uid: "u1" } });
    getUserScripts.mockResolvedValue([
      { id: "f-old", type: "folder", folder: "/", title: "Pack", lastModified: 1 },
      { id: "f-new", type: "folder", folder: "/", title: "Pack", lastModified: 100 },
      { id: "s1", type: "script", folder: "/Pack", title: "Scene" },
    ]);

    const { result } = renderHook(() => useScriptData());

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.scripts.map((s) => s.id)).toEqual(["f-new", "s1"]);
  });

  it("navigates and goes up with URL sync", async () => {
    useAuth.mockReturnValue({ currentUser: { uid: "u1" } });
    getUserScripts.mockResolvedValue([]);

    const { result } = renderHook(() => useScriptData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => {
      result.current.navigateTo("/a/b");
    });
    expect(result.current.currentPath).toBe("/a/b");
    expect(new URL(window.location.href).searchParams.get("folder")).toBe("/a/b");

    act(() => {
      result.current.goUp();
    });
    expect(result.current.currentPath).toBe("/a");
    expect(new URL(window.location.href).searchParams.get("folder")).toBe("/a");
  });

  it("builds visible flat list based on expanded folder state", async () => {
    useAuth.mockReturnValue({ currentUser: { uid: "u1" } });
    getUserScripts.mockResolvedValue([
      { id: "f1", type: "folder", folder: "/", title: "A", sortOrder: 0, lastModified: 1 },
      { id: "s-root", type: "script", folder: "/", title: "root-script", sortOrder: 1, lastModified: 1 },
      { id: "s1", type: "script", folder: "/A", title: "in-a", sortOrder: 0, lastModified: 1 },
    ]);

    const { result } = renderHook(() => useScriptData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.visibleItems.map((x) => x.id)).toEqual(["f1", "s-root"]);

    act(() => {
      result.current.toggleExpand("/A");
    });

    expect(result.current.visibleItems.map((x) => x.id)).toEqual(["f1", "s1", "s-root"]);
    const child = result.current.visibleItems.find((x) => x.id === "s1");
    expect(child.depth).toBe(1);
  });

  it("restores currentPath and expandedPaths from return state", async () => {
    useAuth.mockReturnValue({ currentUser: { uid: "u1" } });
    getUserScripts.mockResolvedValue([]);
    window.sessionStorage.setItem(
      "write_tab_return_state_v1",
      JSON.stringify({ currentPath: "/restored", expandedPaths: ["/restored/A"] }),
    );

    const { result } = renderHook(() => useScriptData());
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.currentPath).toBe("/restored");
    expect(result.current.expandedPaths.has("/restored/A")).toBe(true);
    expect(window.sessionStorage.getItem("write_tab_return_state_v1")).toBe(null);
  });

  it("does not fetch scripts without currentUser", async () => {
    useAuth.mockReturnValue({ currentUser: null });
    getUserScripts.mockResolvedValue([{ id: "should-not-load" }]);

    renderHook(() => useScriptData());
    await new Promise((r) => setTimeout(r, 0));

    expect(getUserScripts).not.toHaveBeenCalled();
  });
});
