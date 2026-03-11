import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useScriptMetadataSeriesActions } from "./useScriptMetadataSeriesActions";

vi.mock("../../lib/api/series", () => ({
  createSeries: vi.fn(),
}));

import { createSeries } from "../../lib/api/series";

const setter = () => vi.fn();

const buildProps = (overrides = {}) => ({
  quickSeriesName: "",
  isCreatingSeries: false,
  seriesOptions: [],
  onSeriesCreated: vi.fn(),
  setIsCreatingSeries: setter(),
  setSeriesId: setter(),
  setSeriesName: setter(),
  setQuickSeriesName: setter(),
  toast: vi.fn(),
  ...overrides,
});

describe("useScriptMetadataSeriesActions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("selects existing series when name matches", async () => {
    const props = buildProps({
      quickSeriesName: "  已有系列 ",
      seriesOptions: [{ id: "s1", name: "已有系列" }],
    });
    const { result } = renderHook(() => useScriptMetadataSeriesActions(props));

    await act(async () => {
      await result.current.handleQuickCreateSeries();
    });

    expect(createSeries).not.toHaveBeenCalled();
    expect(props.setSeriesId).toHaveBeenCalledWith("s1");
    expect(props.setSeriesName).toHaveBeenCalledWith("已有系列");
    expect(props.setQuickSeriesName).toHaveBeenCalledWith("");
    expect(props.toast).toHaveBeenCalledWith({ title: "已選取既有系列" });
  });

  it("creates new series and syncs state on success", async () => {
    createSeries.mockResolvedValue({ id: "s2", name: "新系列" });
    const props = buildProps({
      quickSeriesName: "新系列",
    });
    const { result } = renderHook(() => useScriptMetadataSeriesActions(props));

    await act(async () => {
      await result.current.handleQuickCreateSeries();
    });

    expect(props.setIsCreatingSeries).toHaveBeenNthCalledWith(1, true);
    expect(createSeries).toHaveBeenCalledWith({ name: "新系列", summary: "", coverUrl: "" });
    expect(props.setSeriesId).toHaveBeenCalledWith("s2");
    expect(props.setSeriesName).toHaveBeenCalledWith("新系列");
    expect(props.setQuickSeriesName).toHaveBeenCalledWith("");
    expect(props.onSeriesCreated).toHaveBeenCalledWith({ id: "s2", name: "新系列" });
    expect(props.toast).toHaveBeenCalledWith({ title: "已建立系列" });
    expect(props.setIsCreatingSeries).toHaveBeenLastCalledWith(false);
  });

  it("shows destructive toast when create series fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    createSeries.mockRejectedValue(new Error("create failed"));
    const props = buildProps({
      quickSeriesName: "壞系列",
    });
    const { result } = renderHook(() => useScriptMetadataSeriesActions(props));

    await act(async () => {
      await result.current.handleQuickCreateSeries();
    });

    expect(props.toast).toHaveBeenCalledWith({ title: "建立系列失敗", variant: "destructive" });
    expect(props.setIsCreatingSeries).toHaveBeenLastCalledWith(false);
    errorSpy.mockRestore();
  });

  it("focuses metadata series input via delayed callback", async () => {
    vi.useFakeTimers();
    const props = buildProps();
    const focus = vi.fn();
    const input = document.createElement("input");
    input.id = "metadata-series-name";
    input.focus = focus;
    document.body.appendChild(input);

    const { result } = renderHook(() => useScriptMetadataSeriesActions(props));

    act(() => {
      result.current.focusSeriesSelect();
      vi.advanceTimersByTime(60);
    });

    expect(focus).toHaveBeenCalledTimes(1);
    document.body.removeChild(input);
    vi.useRealTimers();
  });
});
