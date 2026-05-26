import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useScriptActions } from "./useScriptActions";

vi.mock("../../lib/api/scripts", () => ({
  createScript: vi.fn(),
  updateScript: vi.fn(),
  deleteScript: vi.fn(),
}));

import { createScript, updateScript, deleteScript } from "../../lib/api/scripts";

describe("useScriptActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("confirm", vi.fn(() => true));
  });

  it("creates script and triggers callbacks", async () => {
    createScript.mockResolvedValue("s-new");
    const fetchScripts = vi.fn();
    const onScriptCreated = vi.fn();
    const setScripts = vi.fn();

    const { result } = renderHook(() =>
      useScriptActions({
        scripts: [],
        setScripts,
        currentPath: "/demo",
        fetchScripts,
        onScriptCreated,
      }),
    );

    act(() => {
      result.current.setNewTitle("New Script");
      result.current.setNewType("script");
    });

    await act(async () => {
      await result.current.handleCreate();
    });

    expect(createScript).toHaveBeenCalledWith("New Script", "script", "/demo");
    expect(fetchScripts).toHaveBeenCalledTimes(1);
    expect(onScriptCreated).toHaveBeenCalledWith(
      expect.objectContaining({ id: "s-new", title: "New Script", folder: "/demo" }),
    );
    expect(result.current.isCreateOpen).toBe(false);
    expect(result.current.newTitle).toBe("");
  });

  it("renames folder and updates descendants", async () => {
    updateScript.mockResolvedValue({});
    const fetchScripts = vi.fn();
    const setScripts = vi.fn();
    const scripts = [
      { id: "f1", type: "folder", title: "Old", folder: "/" },
      { id: "s1", type: "script", title: "A", folder: "/Old" },
      { id: "s2", type: "script", title: "B", folder: "/Old/Sub" },
      { id: "s3", type: "script", title: "C", folder: "/Else" },
    ];

    const { result } = renderHook(() =>
      useScriptActions({
        scripts,
        setScripts,
        currentPath: "/",
        fetchScripts,
      }),
    );

    act(() => {
      result.current.openRenameDialog(scripts[0]);
      result.current.setRenameTitle("New");
    });

    await act(async () => {
      await result.current.handleRename();
    });

    expect(updateScript).toHaveBeenCalledWith("f1", { title: "New" });
    expect(updateScript).toHaveBeenCalledWith("s1", { folder: "/New" });
    expect(updateScript).toHaveBeenCalledWith("s2", { folder: "/New/Sub" });
    expect(fetchScripts).toHaveBeenCalledTimes(1);
    expect(setScripts).toHaveBeenCalledTimes(1);
  });

  it("deletes folder and filters descendant items from state", async () => {
    deleteScript.mockResolvedValue({});
    const setScripts = vi.fn();
    const scripts = [
      { id: "f1", type: "folder", title: "Root", folder: "/" },
      { id: "s1", type: "script", title: "A", folder: "/Root" },
      { id: "s2", type: "script", title: "B", folder: "/Root/Sub" },
      { id: "s3", type: "script", title: "C", folder: "/Else" },
    ];

    const { result } = renderHook(() =>
      useScriptActions({
        scripts,
        setScripts,
        currentPath: "/",
        fetchScripts: vi.fn(),
      }),
    );

    act(() => {
      result.current.openDeleteDialog(scripts[0]);
    });
    await act(async () => {
      await result.current.handleDeleteConfirm();
    });

    expect(deleteScript).toHaveBeenCalledWith("f1");
    const updater = setScripts.mock.calls[0][0];
    const next = updater(scripts);
    expect(next.map((x) => x.id)).toEqual(["s3"]);
  });

  it("closes move dialog without API call when target is unchanged", async () => {
    const setScripts = vi.fn();
    const item = { id: "s1", type: "script", folder: "/A", title: "T" };

    const { result } = renderHook(() =>
      useScriptActions({
        scripts: [item],
        setScripts,
        currentPath: "/",
        fetchScripts: vi.fn(),
      }),
    );

    act(() => {
      result.current.openMoveDialog(item);
      result.current.setMoveTargetFolder("/A");
    });

    await act(async () => {
      await result.current.handleMoveConfirm();
    });

    expect(updateScript).not.toHaveBeenCalled();
    expect(result.current.isMoveOpen).toBe(false);
    expect(result.current.moveItem).toBe(null);
  });

  it("toggle public on folder updates folder and children", async () => {
    updateScript.mockResolvedValue({});
    const setScripts = vi.fn();
    const folder = { id: "f1", type: "folder", folder: "/", title: "Pack", isPublic: false };
    const scripts = [
      folder,
      { id: "s1", type: "script", folder: "/Pack", title: "a", isPublic: false },
      { id: "s2", type: "script", folder: "/Pack/Sub", title: "b", isPublic: false },
      { id: "s3", type: "script", folder: "/Else", title: "c", isPublic: false },
    ];

    const { result } = renderHook(() =>
      useScriptActions({
        scripts,
        setScripts,
        currentPath: "/",
        fetchScripts: vi.fn(),
      }),
    );

    await act(async () => {
      await result.current.handleTogglePublic({ stopPropagation: vi.fn() }, folder);
    });

    expect(updateScript).toHaveBeenCalledWith("f1", { isPublic: true });
    expect(updateScript).toHaveBeenCalledWith("s1", { isPublic: true });
    expect(updateScript).toHaveBeenCalledWith("s2", { isPublic: true });
    expect(setScripts).toHaveBeenCalledTimes(1);
  });
});
