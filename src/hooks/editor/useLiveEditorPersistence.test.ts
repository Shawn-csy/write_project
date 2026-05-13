import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useLiveEditorPersistence } from "./useLiveEditorPersistence";

vi.mock("../../lib/api/scripts", () => ({
  getScript: vi.fn(),
  updateScript: vi.fn(),
}));

import { updateScript } from "../../lib/api/scripts";

const setter = () => vi.fn();

const baseProps = (overrides = {}) => ({
  scriptId: "s-1",
  initialData: { id: "s-1", content: "原始內容", title: "原標題", lastModified: "2026-03-10T10:00:00Z" },
  readOnly: false,
  content: "原始內容",
  title: "原標題",
  onClose: vi.fn(),
  onTitleName: vi.fn(),
  t: (key, fallback) => fallback || key,
  setContent: setter(),
  setTitle: setter(),
  setLoading: setter(),
  setSaveStatus: setter(),
  setLastSaved: setter(),
  lastSavedContentRef: { current: "原始內容" },
  lastSavedTitleRef: { current: "原標題" },
  ...overrides,
});

describe("useLiveEditorPersistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    localStorage.clear();
    updateScript.mockResolvedValue({});
  });

  it("loads newer local draft over initial data", () => {
    localStorage.setItem(
      "draft_script_s-1",
      JSON.stringify({
        content: "本地草稿內容",
        title: "本地草稿標題",
        mtime: new Date("2026-03-10T11:00:00Z").getTime(),
      })
    );
    const props = baseProps();
    renderHook(() => useLiveEditorPersistence(props));

    expect(props.setSaveStatus).toHaveBeenCalledWith("local-saved");
    expect(props.setContent).toHaveBeenCalledWith("本地草稿內容");
    expect(props.setTitle).toHaveBeenCalledWith("本地草稿標題");
    expect(props.setLoading).toHaveBeenCalledWith(false);
    expect(props.lastSavedContentRef.current).toBe("本地草稿內容");
    expect(props.lastSavedTitleRef.current).toBe("本地草稿標題");
  });

  it("persists local draft after debounced change", () => {
    const props = baseProps();
    const { result } = renderHook(() => useLiveEditorPersistence(props));

    act(() => {
      result.current.handleChange("新內容");
    });

    expect(props.setContent).toHaveBeenCalledWith("新內容");
    expect(localStorage.getItem("draft_script_s-1")).toBeNull();

    act(() => {
      vi.advanceTimersByTime(801);
    });

    const draft = JSON.parse(localStorage.getItem("draft_script_s-1"));
    expect(draft.content).toBe("新內容");
    expect(draft.title).toBe("原標題");
  });

  it("flushes local draft and performs cloud save on back when content changed", async () => {
    const props = baseProps({
      content: "已修改內容",
      title: "已修改標題",
    });
    const { result } = renderHook(() => useLiveEditorPersistence(props));

    await act(async () => {
      result.current.handleChange("已修改內容");
      await result.current.handleBack();
    });

    const draft = JSON.parse(localStorage.getItem("draft_script_s-1"));
    expect(draft.content).toBe("已修改內容");
    expect(draft.title).toBe("已修改標題");
    expect(updateScript).toHaveBeenCalledWith("s-1", {
      content: "已修改內容",
      title: "已修改標題",
    });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });
});
