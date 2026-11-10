import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePublicReaderActions } from "./usePublicReaderActions";

const write = vi.hoisted(() => vi.fn());
vi.mock("@/lib/liveApi", () => ({ liveApi: { write } }));

describe("public reader like state", () => {
  beforeEach(() => {
    write.mockReset();
    write.mockImplementation((path: string) =>
      path.endsWith("/view")
        ? Promise.resolve({ ok: true })
        : Promise.resolve({ ok: false, status: 429 }),
    );
  });

  it("restores the count and liked state when the server rejects a like", async () => {
    const { result } = renderHook(() => usePublicReaderActions("script-a", 4, 2));
    await act(async () => {
      await result.current.handleLike();
    });
    expect(result.current.liked).toBe(false);
    expect(result.current.likes).toBe(2);
    expect(result.current.likeInFlight).toBe(false);
  });

  it("uses the server count after a successful like", async () => {
    write.mockImplementation((path: string) =>
      path.endsWith("/view")
        ? Promise.resolve({ ok: true })
        : Promise.resolve({ ok: true, json: async () => ({ liked: true, likes: 7 }) }),
    );
    const { result } = renderHook(() => usePublicReaderActions("script-a", 4, 2));
    await act(async () => {
      await result.current.handleLike();
    });
    expect(result.current.liked).toBe(true);
    expect(result.current.likes).toBe(7);
  });
});
