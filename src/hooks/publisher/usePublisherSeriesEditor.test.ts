import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePublisherSeriesEditor } from "./usePublisherSeriesEditor";
import type { BaseScriptApi } from "../../types/api";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("../../lib/api/series", () => ({
  createSeries: vi.fn(),
  updateSeries: vi.fn(),
  deleteSeries: vi.fn(),
}));

vi.mock("../../lib/api/scripts", () => ({
  updateScript: vi.fn(),
}));

import * as seriesApi from "../../lib/api/series";
import * as scriptsApi from "../../lib/api/scripts";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeScript(overrides: Partial<BaseScriptApi> & { id: string }): BaseScriptApi {
  return { title: "Script", status: "private", ...overrides } as BaseScriptApi;
}

const SERIES_A = { id: "s1", name: "Series A", scriptCount: 1 };
const SERIES_B = { id: "s2", name: "Series B", scriptCount: 0 };

// ─── Helper ───────────────────────────────────────────────────────────────────

function setup(initialScripts: BaseScriptApi[] = []) {
  const setScripts = vi.fn();
  const toast = vi.fn();

  const { result, rerender } = renderHook(() =>
    usePublisherSeriesEditor({ scripts: initialScripts, setScripts, toast })
  );

  return { result, rerender, setScripts, toast };
}

// ─── derived state ────────────────────────────────────────────────────────────

describe("derived state", () => {
  it("selectedSeriesScripts returns matching scripts after setSelectedSeriesId", () => {
    const scripts = [
      makeScript({ id: "sc1", seriesId: "s1" }),
      makeScript({ id: "sc2", seriesId: "s1" }),
      makeScript({ id: "sc3", seriesId: "s2" }),
    ];
    const { result } = renderHook(() =>
      usePublisherSeriesEditor({ scripts, setScripts: vi.fn(), toast: vi.fn() })
    );

    act(() => {
      result.current.setSelectedSeriesId("s1");
    });

    expect(result.current.selectedSeriesScripts).toHaveLength(2);
    expect(result.current.selectedSeriesScripts.map((s) => s.id)).toEqual(["sc1", "sc2"]);
  });

  it("selectedSeriesScripts is empty when no series selected", () => {
    const scripts = [makeScript({ id: "sc1", seriesId: "s1" })];
    const { result } = setup(scripts);
    expect(result.current.selectedSeriesScripts).toHaveLength(0);
  });

  it("attachableScripts returns only scripts with no seriesId", () => {
    const scripts = [
      makeScript({ id: "sc1", seriesId: "s1" }),
      makeScript({ id: "sc2" }),
      makeScript({ id: "sc3" }),
    ];
    const { result } = setup(scripts);
    expect(result.current.attachableScripts).toHaveLength(2);
    expect(result.current.attachableScripts.map((s) => s.id)).toEqual(["sc2", "sc3"]);
  });
});

// ─── handleAttachScriptToSeries ───────────────────────────────────────────────

describe("handleAttachScriptToSeries", () => {
  beforeEach(() => {
    vi.mocked(scriptsApi.updateScript).mockResolvedValue({} as BaseScriptApi);
  });

  it("calls updateScript with attach payload", async () => {
    const { result } = setup([makeScript({ id: "sc1" })]);
    await act(async () => {
      await result.current.handleAttachScriptToSeries("sc1", "s1", 2);
    });
    expect(scriptsApi.updateScript).toHaveBeenCalledWith("sc1", {
      seriesId: "s1",
      seriesOrder: 2,
    });
  });

  it("updates script seriesId and seriesOrder via setScripts", async () => {
    const script = makeScript({ id: "sc1" });
    const { result, setScripts } = setup([script]);
    await act(async () => {
      await result.current.handleAttachScriptToSeries("sc1", "s1", 3);
    });
    expect(setScripts).toHaveBeenCalled();
    const updater = vi.mocked(setScripts).mock.calls[0][0] as (p: BaseScriptApi[]) => BaseScriptApi[];
    const updated = updater([script]);
    expect(updated[0].seriesId).toBe("s1");
    expect(updated[0].seriesOrder).toBe(3);
  });

  it("increments target series scriptCount", async () => {
    const { result } = setup();
    act(() => { result.current.setSeriesList([SERIES_A, SERIES_B]); });
    await act(async () => {
      await result.current.handleAttachScriptToSeries("sc1", "s2", null);
    });
    expect(result.current.seriesList.find((s) => s.id === "s2")?.scriptCount).toBe(1);
  });

  it("does not call setScripts on API failure", async () => {
    vi.mocked(scriptsApi.updateScript).mockRejectedValue(new Error("fail"));
    const { result, setScripts, toast } = setup([makeScript({ id: "sc1" })]);
    await act(async () => {
      await result.current.handleAttachScriptToSeries("sc1", "s1", 1);
    });
    expect(setScripts).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }));
  });
});

// ─── handleDetachScriptFromSeries ─────────────────────────────────────────────

describe("handleDetachScriptFromSeries", () => {
  beforeEach(() => {
    vi.mocked(scriptsApi.updateScript).mockResolvedValue({} as BaseScriptApi);
  });

  it("calls updateScript with detach payload", async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.handleDetachScriptFromSeries("sc1", "s1");
    });
    expect(scriptsApi.updateScript).toHaveBeenCalledWith("sc1", {
      seriesId: null,
      seriesOrder: null,
    });
  });

  it("clears seriesId, seriesOrder, series from script via setScripts", async () => {
    const script = makeScript({ id: "sc1", seriesId: "s1", seriesOrder: 2 });
    const { result, setScripts } = setup([script]);
    await act(async () => {
      await result.current.handleDetachScriptFromSeries("sc1", "s1");
    });
    const updater = vi.mocked(setScripts).mock.calls[0][0] as (p: BaseScriptApi[]) => BaseScriptApi[];
    const updated = updater([script]);
    expect(updated[0].seriesId).toBeUndefined();
    expect(updated[0].seriesOrder).toBeUndefined();
    expect(updated[0].series).toBeUndefined();
  });

  it("decrements series scriptCount", async () => {
    const { result } = setup();
    act(() => { result.current.setSeriesList([SERIES_A]); });
    await act(async () => {
      await result.current.handleDetachScriptFromSeries("sc1", "s1");
    });
    expect(result.current.seriesList.find((s) => s.id === "s1")?.scriptCount).toBe(0);
  });

  it("does not go below 0 for scriptCount", async () => {
    const { result } = setup();
    act(() => { result.current.setSeriesList([{ ...SERIES_A, scriptCount: 0 }]); });
    await act(async () => {
      await result.current.handleDetachScriptFromSeries("sc1", "s1");
    });
    expect(result.current.seriesList.find((s) => s.id === "s1")?.scriptCount).toBe(0);
  });

  it("does not call setScripts on API failure", async () => {
    vi.mocked(scriptsApi.updateScript).mockRejectedValue(new Error("fail"));
    const { result, setScripts, toast } = setup();
    await act(async () => {
      await result.current.handleDetachScriptFromSeries("sc1", "s1");
    });
    expect(setScripts).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }));
  });
});

// ─── handleReorderScriptInSeries ──────────────────────────────────────────────

describe("handleReorderScriptInSeries", () => {
  beforeEach(() => {
    vi.mocked(scriptsApi.updateScript).mockResolvedValue({} as BaseScriptApi);
  });

  it("calls updateScript with reorder payload", async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.handleReorderScriptInSeries("sc1", 5);
    });
    expect(scriptsApi.updateScript).toHaveBeenCalledWith("sc1", { seriesOrder: 5 });
  });

  it("only updates seriesOrder, leaves other fields unchanged", async () => {
    const script = makeScript({ id: "sc1", seriesId: "s1", seriesOrder: 1, title: "My Script" });
    const { result, setScripts } = setup([script]);
    await act(async () => {
      await result.current.handleReorderScriptInSeries("sc1", 7);
    });
    const updater = vi.mocked(setScripts).mock.calls[0][0] as (p: BaseScriptApi[]) => BaseScriptApi[];
    const updated = updater([script]);
    expect(updated[0].seriesOrder).toBe(7);
    expect(updated[0].seriesId).toBe("s1");
    expect(updated[0].title).toBe("My Script");
  });

  it("does not call setScripts on API failure", async () => {
    vi.mocked(scriptsApi.updateScript).mockRejectedValue(new Error("fail"));
    const { result, setScripts, toast } = setup();
    await act(async () => {
      await result.current.handleReorderScriptInSeries("sc1", 3);
    });
    expect(setScripts).not.toHaveBeenCalled();
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }));
  });
});

// ─── handleCreateSeries ───────────────────────────────────────────────────────

describe("handleCreateSeries", () => {
  beforeEach(() => {
    vi.mocked(seriesApi.createSeries).mockReset();
  });

  it("calls createSeries and prepends to seriesList, sets selectedSeriesId", async () => {
    vi.mocked(seriesApi.createSeries).mockResolvedValue({ id: "s3", name: "New Series" } as never);
    const { result } = setup();
    act(() => {
      result.current.setSeriesDraft({ name: "New Series", summary: "", coverUrl: "", coverCrop: null });
    });
    await act(async () => {
      await result.current.handleCreateSeries();
    });
    expect(seriesApi.createSeries).toHaveBeenCalled();
    expect(result.current.seriesList[0].id).toBe("s3");
    expect(result.current.selectedSeriesId).toBe("s3");
  });

  it("does not call createSeries when name is empty", async () => {
    const { result } = setup();
    await act(async () => {
      await result.current.handleCreateSeries();
    });
    expect(seriesApi.createSeries).not.toHaveBeenCalled();
  });

  it("does not change seriesList on API failure", async () => {
    vi.mocked(seriesApi.createSeries).mockRejectedValue(new Error("fail"));
    const { result, toast } = setup();
    act(() => {
      result.current.setSeriesDraft({ name: "X", summary: "", coverUrl: "", coverCrop: null });
    });
    await act(async () => {
      await result.current.handleCreateSeries();
    });
    expect(result.current.seriesList).toHaveLength(0);
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive" }));
  });
});
