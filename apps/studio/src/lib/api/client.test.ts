import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../firebase", () => ({
  getLoadedAuth: vi.fn(() => ({ currentUser: null })),
  loadFirebaseAuth: vi.fn().mockResolvedValue({ auth: { currentUser: null } }),
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

  it("a no-store GET does not evict another cached admin read", async () => {
    fetch
      .mockResolvedValueOnce(okJson({ users: [1] }))
      .mockResolvedValueOnce(okJson({ actors: [2] }));
    const { fetchApi } = await import("./client");
    await fetchApi("/admin/all-users");
    await fetchApi("/admin/voice-actors", { cache: "no-store" });
    expect(await fetchApi("/admin/all-users")).toEqual({ users: [1] });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("coalesces authenticated GET requests while auth headers are loading", async () => {
    const { loadFirebaseAuth } = await import("../firebase");
    let releaseAuth;
    loadFirebaseAuth.mockImplementationOnce(() => new Promise((resolve) => { releaseAuth = resolve; }));
    fetch.mockResolvedValue(okJson({ value: 1 }));
    const { fetchApi } = await import("./client");
    const first = fetchApi("/same");
    const second = fetchApi("/same");
    releaseAuth({ auth: { currentUser: null } });
    expect(await Promise.all([first, second])).toEqual([{ value: 1 }, { value: 1 }]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("does not store a response under an old auth identity", async () => {
    const { getLoadedAuth, loadFirebaseAuth } = await import("../firebase");
    let currentUser = null;
    getLoadedAuth.mockImplementation(() => ({ currentUser }));
    loadFirebaseAuth.mockImplementation(() => Promise.resolve({ auth: { currentUser } }));
    fetch.mockResolvedValueOnce(okJson({ value: "old" })).mockResolvedValueOnce(okJson({ value: "new" }));
    const { fetchApi } = await import("./client");
    const first = fetchApi("/account");
    currentUser = { uid: "u1", getIdToken: vi.fn().mockResolvedValue("token") };
    await first;
    currentUser = null;
    expect(await fetchApi("/account")).toEqual({ value: "new" });
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

  it("does not retry an aborted request", async () => {
    const controller = new AbortController();
    const aborted = new DOMException("aborted", "AbortError");
    fetch.mockImplementationOnce(() => {
      controller.abort();
      return Promise.reject(aborted);
    });
    const { fetchApi } = await import("./client");
    await expect(fetchApi("/slow", { signal: controller.signal })).rejects.toBe(aborted);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("retries a later request immediately after a network error", async () => {
    const { fetchApi } = await import("./client");
    const networkError = new TypeError("network down");
    fetch.mockRejectedValueOnce(networkError).mockResolvedValueOnce(okJson({ recovered: true }));

    await expect(fetchApi("/test-network", {}, 0, 0)).rejects.toBe(networkError);
    expect(await fetchApi("/test-network", {}, 0, 0)).toEqual({ recovered: true });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("targeted cache invalidation: mutation only clears matching resource entries", async () => {
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

  it("admin mutation refreshes related admin lists", async () => {
    fetch
      .mockResolvedValueOnce(okJson({ users: [1] }))
      .mockResolvedValueOnce(okJson({ personas: [2] }))
      .mockResolvedValueOnce(okJson({ ok: true }))
      .mockResolvedValueOnce(okJson({ users: [3] }))
      .mockResolvedValueOnce(okJson({ personas: [4] }));
    const { fetchApi } = await import("./client");
    await fetchApi("/admin/all-users");
    await fetchApi("/admin/all-personas");
    await fetchApi("/admin/all-users/u1", { method: "DELETE" });
    expect(await fetchApi("/admin/all-users")).toEqual({ users: [3] });
    expect(await fetchApi("/admin/all-personas")).toEqual({ personas: [4] });
    expect(fetch).toHaveBeenCalledTimes(5);
  });

  it("does not cache a GET that finishes after its resource was changed", async () => {
    let finishOldRead;
    fetch
      .mockImplementationOnce(() => new Promise((resolve) => { finishOldRead = resolve; }))
      .mockResolvedValueOnce(okJson({ ok: true }))
      .mockResolvedValueOnce(okJson({ value: "new" }));
    const { fetchApi } = await import("./client");
    const oldRead = fetchApi("/scripts");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await fetchApi("/scripts/s1", { method: "PUT" });
    finishOldRead(okJson({ value: "old" }));
    expect(await oldRead).toEqual({ value: "old" });
    expect(await fetchApi("/scripts")).toEqual({ value: "new" });
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it("full cache clear when URL has no parseable resource segment", async () => {
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
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    vi.stubGlobal("fetch", vi.fn());
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

  it("a no-store public GET does not evict cached public data", async () => {
    fetch
      .mockResolvedValueOnce(okJson({ value: 1 }))
      .mockResolvedValueOnce(okJson({ value: 2 }));
    const { fetchPublic } = await import("./client");
    await fetchPublic("/public-a");
    await fetchPublic("/public-b", { cache: "no-store" });
    expect(await fetchPublic("/public-a")).toEqual({ value: 1 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not cache a public GET completed after a write", async () => {
    let finishOldRead;
    fetch
      .mockImplementationOnce(() => new Promise((resolve) => { finishOldRead = resolve; }))
      .mockResolvedValueOnce(okJson({ ok: true }))
      .mockResolvedValueOnce(okJson({ value: "new" }));
    const { fetchPublic } = await import("./client");
    const oldRead = fetchPublic("/public-x");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    await fetchPublic("/public-x", { method: "POST" });
    finishOldRead(okJson({ value: "old" }));
    expect(await oldRead).toEqual({ value: "old" });
    expect(await fetchPublic("/public-x")).toEqual({ value: "new" });
  });

  it("retries a later public read immediately after a network error", async () => {
    const { fetchPublic } = await import("./client");
    fetch.mockRejectedValueOnce(new TypeError("network down")).mockResolvedValueOnce(okJson({ ok: true }));
    await expect(fetchPublic("/public", { cache: "no-store" })).rejects.toThrow("network down");
    expect(await fetchPublic("/public", { cache: "no-store" })).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(2);
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
