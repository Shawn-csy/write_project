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

  it("targeted cache invalidation: mutation only clears matching resource entries", async () => {
    const { isApiOffline } = await import("../apiHealth");
    isApiOffline.mockReturnValue(false);

    fetch
      .mockResolvedValueOnce(okJson({ scripts: [] }))   // GET /api/scripts
      .mockResolvedValueOnce(okJson({ themes: [] }))    // GET /api/themes
      .mockResolvedValueOnce(okJson({ ok: true }));     // PUT /api/scripts/1

    const { fetchApi } = await import("./client");

    // Populate two different resource caches
    await fetchApi("/scripts");
    await fetchApi("/themes");

    // Mutate scripts → should evict /scripts cache but keep /themes
    await fetchApi("/scripts/1", { method: "PUT", body: JSON.stringify({}) });

    // /themes should still be cached (no extra fetch)
    await fetchApi("/themes");
    expect(fetch).toHaveBeenCalledTimes(3);

    // /scripts should be re-fetched because cache was invalidated
    fetch.mockResolvedValueOnce(okJson({ scripts: ["new"] }));
    const refreshed = await fetchApi("/scripts");
    expect(refreshed).toEqual({ scripts: ["new"] });
    expect(fetch).toHaveBeenCalledTimes(4);
  });

  it("full cache clear when URL has no parseable resource segment", async () => {
    const { isApiOffline } = await import("../apiHealth");
    isApiOffline.mockReturnValue(false);

    fetch
      .mockResolvedValueOnce(okJson({ data: "cached" }))
      .mockResolvedValueOnce(okJson({ ok: true }))
      .mockResolvedValueOnce(okJson({ data: "fresh" }));

    const { fetchApi } = await import("./client");

    await fetchApi("/data");
    // Mutate to root path — triggers full clear fallback
    await fetchApi("/", { method: "POST", body: "{}" });
    const result = await fetchApi("/data");
    expect(result).toEqual({ data: "fresh" });
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});

describe("fetchPublic", () => {
  beforeEach(async () => {
    vi.resetModules();
    vi.resetAllMocks();
    vi.stubGlobal("fetch", vi.fn());
    // Ensure isApiOffline starts as false after any prior test set it to true
    const { isApiOffline } = await import("../apiHealth");
    isApiOffline.mockReturnValue(false);
  });

  it("caches GET responses", async () => {
    fetch.mockResolvedValue(okJson({ value: 1 }));
    const { fetchPublic } = await import("./client");

    const first = await fetchPublic("/public-test");
    const second = await fetchPublic("/public-test");

    expect(first).toEqual({ value: 1 });
    expect(second).toEqual({ value: 1 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("bypasses cache when no-store is set", async () => {
    fetch
      .mockResolvedValueOnce(okJson({ v: 1 }))
      .mockResolvedValueOnce(okJson({ v: 2 }));
    const { fetchPublic } = await import("./client");

    const first = await fetchPublic("/public-ns", { cache: "no-store" });
    const second = await fetchPublic("/public-ns", { cache: "no-store" });

    expect(first).toEqual({ v: 1 });
    expect(second).toEqual({ v: 2 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("throws when API is in cooldown", async () => {
    const { isApiOffline } = await import("../apiHealth");
    isApiOffline.mockReturnValue(true);
    const { fetchPublic } = await import("./client");

    await expect(fetchPublic("/public")).rejects.toThrow("API offline (cooldown)");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("throws on HTTP error", async () => {
    fetch.mockResolvedValue({ ok: false, statusText: "Not Found" });
    const { fetchPublic } = await import("./client");

    await expect(fetchPublic("/public-404")).rejects.toThrow("API Error: Not Found");
  });

  it("deduplicates concurrent in-flight GET requests", async () => {
    let resolveFirst;
    const pending = new Promise((r) => { resolveFirst = r; });
    fetch.mockReturnValueOnce(pending.then(() => okJson({ data: "shared" })));

    const { fetchPublic } = await import("./client");

    const p1 = fetchPublic("/public-inflight");
    const p2 = fetchPublic("/public-inflight");

    resolveFirst();
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toEqual({ data: "shared" });
    expect(r2).toEqual({ data: "shared" });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
