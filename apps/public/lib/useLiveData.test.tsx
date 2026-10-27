import { describe, expect, it } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { LiveApiError } from "./liveApi";
import { useLiveData } from "./useLiveData";

describe("useLiveData", () => {
  it("shows the snapshot first, then the fresh value when it differs", async () => {
    const { result } = renderHook(() => useLiveData({ n: 1 }, async () => ({ n: 2 }), "k"));
    expect(result.current).toEqual({ status: "ready", data: { n: 1 } });
    await waitFor(() => expect(result.current).toEqual({ status: "ready", data: { n: 2 } }));
  });

  it("keeps the snapshot object when nothing changed", async () => {
    const initial = { n: 1 };
    const { result } = renderHook(() => useLiveData(initial, async () => ({ n: 1 }), "k"));
    await act(async () => { await Promise.resolve(); });
    expect(result.current).toEqual({ status: "ready", data: initial });
    expect((result.current as { data: unknown }).data).toBe(initial);
  });

  it("keeps the snapshot when the refresh fails", async () => {
    const { result } = renderHook(() => useLiveData({ n: 1 }, async () => { throw new Error("down"); }, "k"));
    await act(async () => { await Promise.resolve(); });
    expect(result.current).toEqual({ status: "ready", data: { n: 1 } });
  });

  it("turns a null or a 404 into missing, even over a snapshot", async () => {
    const gone = renderHook(() => useLiveData({ n: 1 }, async () => null, "a"));
    await waitFor(() => expect(gone.result.current).toEqual({ status: "missing" }));
    const notFound = renderHook(() => useLiveData<{ n: number }>(undefined, async () => { throw new LiveApiError("x", 404); }, "b"));
    await waitFor(() => expect(notFound.result.current).toEqual({ status: "missing" }));
  });

  it("reports an error only when there is no snapshot to fall back on", async () => {
    const { result } = renderHook(() => useLiveData<{ n: number }>(undefined, async () => { throw new Error("down"); }, "k"));
    expect(result.current).toEqual({ status: "loading" });
    await waitFor(() => expect(result.current).toEqual({ status: "error" }));
  });
});
