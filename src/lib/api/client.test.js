import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../firebase", () => ({
  auth: { currentUser: null },
}));

vi.mock("../apiHealth", () => ({
  isApiOffline: vi.fn(() => false),
  markApiOffline: vi.fn(),
  clearApiOffline: vi.fn(),
}));

const okJson = (data) => ({
  ok: true,
  json: vi.fn().mockResolvedValue(data),
});

describe("api client", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("returns cached GET response without refetching", async () => {
    fetch.mockResolvedValue(okJson({ value: 1 }));
    const { fetchApi } = await import("./client");

    const first = await fetchApi("/test-cache");
    const second = await fetchApi("/test-cache");

    expect(first).toEqual({ value: 1 });
    expect(second).toEqual({ value: 1 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("bypasses GET cache when no-store is set", async () => {
    fetch
      .mockResolvedValueOnce(okJson({ value: 1 }))
      .mockResolvedValueOnce(okJson({ value: 2 }));
    const { fetchApi } = await import("./client");

    const first = await fetchApi("/test-no-store", { cache: "no-store" });
    const second = await fetchApi("/test-no-store", { cache: "no-store" });

    expect(first).toEqual({ value: 1 });
    expect(second).toEqual({ value: 2 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("retries on retryable 5xx once and then succeeds", async () => {
    fetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: "Server Error",
        text: vi.fn().mockResolvedValue(""),
      })
      .mockResolvedValueOnce(okJson({ ok: true }));
    const { fetchApi } = await import("./client");

    const result = await fetchApi("/test-retry", {}, 1, 0);

    expect(result).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry on 4xx and surfaces status/message", async () => {
    fetch.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: "Bad Request",
      text: vi.fn().mockResolvedValue("invalid payload"),
    });
    const { fetchApi } = await import("./client");

    await expect(fetchApi("/test-400", {}, 2, 0)).rejects.toMatchObject({
      status: 400,
      retryable: false,
      message: "API Error 400: invalid payload",
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("marks API offline when network TypeError happens", async () => {
    const { fetchApi } = await import("./client");
    const { markApiOffline } = await import("../apiHealth");
    const networkError = new TypeError("network down");
    fetch.mockRejectedValue(networkError);

    await expect(fetchApi("/test-network", {}, 0, 0)).rejects.toBe(networkError);
    expect(markApiOffline).toHaveBeenCalledTimes(1);
  });

  it("stops immediately when API is in cooldown", async () => {
    const { isApiOffline } = await import("../apiHealth");
    isApiOffline.mockReturnValue(true);
    const { fetchApi } = await import("./client");

    await expect(fetchApi("/test-offline")).rejects.toThrow("API offline (cooldown)");
    expect(fetch).not.toHaveBeenCalled();
  });
});
