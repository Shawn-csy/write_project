import { describe, expect, it, vi } from "vitest";
import { LiveApiError, createLiveApi } from "./liveApi";

const PRIMARY = "https://tunnel.example";
const FALLBACK = "https://fallback.example";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  };
}

function setup(handlers: Record<string, () => Response | Promise<Response>>, options: { fallback?: boolean } = {}) {
  let time = 1_000;
  const calls: string[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    calls.push(url);
    const origin = new URL(url).origin;
    const handler = handlers[origin];
    if (!handler) throw new TypeError("network down");
    return handler();
  }) as unknown as typeof fetch;
  const api = createLiveApi({
    primaryOrigin: PRIMARY,
    fallbackOrigin: options.fallback === false ? "" : FALLBACK,
    primaryTimeoutMs: 50,
    downCooldownMs: 60_000,
    fetchImpl,
    now: () => time,
    storage: memoryStorage(),
  });
  return { api, calls, advance: (ms: number) => { time += ms; } };
}

const json = (body: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init });

describe("liveApi read", () => {
  it("uses the primary when it is healthy and never touches the fallback", async () => {
    const { api, calls } = setup({ [PRIMARY]: () => json({ ok: 1 }), [FALLBACK]: () => json({ ok: 2 }) });
    const { data, source } = await api.readJson<{ ok: number }>("/api/public-bundle");
    expect(source).toBe("primary");
    expect(data).toEqual({ ok: 1 });
    expect(calls).toEqual([`${PRIMARY}/api/public-bundle`]);
  });

  it("switches to the fallback when the primary is unreachable", async () => {
    const { api, calls } = setup({ [FALLBACK]: () => json({ ok: 2 }, { headers: { "x-data-synced-at": "2026-10-27T00:00:00Z" } }) });
    const { data, source } = await api.readJson<{ ok: number }>("/api/public-bundle");
    expect(source).toBe("fallback");
    expect(data).toEqual({ ok: 2 });
    expect(calls).toEqual([`${PRIMARY}/api/public-bundle`, `${FALLBACK}/api/public-bundle`]);
    expect(api.getStatus()).toEqual({ source: "fallback", syncedAt: "2026-10-27T00:00:00Z" });
  });

  it("switches to the fallback on a 5xx from the primary", async () => {
    const { api } = setup({ [PRIMARY]: () => new Response("tunnel down", { status: 530 }), [FALLBACK]: () => json({ ok: 2 }) });
    expect((await api.readJson("/api/public-bundle")).source).toBe("fallback");
  });

  it("does not switch for a 404: that is a real answer", async () => {
    const { api, calls } = setup({ [PRIMARY]: () => new Response("nope", { status: 404 }), [FALLBACK]: () => json({}) });
    await expect(api.readJson("/api/public-scripts/missing")).rejects.toMatchObject({ status: 404 });
    expect(calls).toEqual([`${PRIMARY}/api/public-scripts/missing`]);
  });

  it("times out a hanging primary and uses the fallback", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith(PRIMARY)) {
        return new Promise<Response>((_, reject) => init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));
      }
      return json({ ok: 2 });
    }) as unknown as typeof fetch;
    const api = createLiveApi({ primaryOrigin: PRIMARY, fallbackOrigin: FALLBACK, primaryTimeoutMs: 20, downCooldownMs: 1000, fetchImpl, storage: memoryStorage() });
    expect((await api.readJson("/api/public-bundle")).source).toBe("fallback");
  });

  it("skips the primary during the cooldown, then retries it and recovers", async () => {
    let primaryUp = false;
    const { api, calls, advance } = setup({
      [PRIMARY]: () => (primaryUp ? json({ ok: 1 }) : new Response("down", { status: 503 })),
      [FALLBACK]: () => json({ ok: 2 }),
    });
    await api.readJson("/api/a");
    calls.length = 0;

    await api.readJson("/api/b");
    expect(calls).toEqual([`${FALLBACK}/api/b`]);

    advance(61_000);
    primaryUp = true;
    calls.length = 0;
    expect((await api.readJson("/api/c")).source).toBe("primary");
    expect(calls).toEqual([`${PRIMARY}/api/c`]);
  });

  it("remembers the outage across page loads through storage", async () => {
    const storage = memoryStorage();
    const first = createLiveApi({
      primaryOrigin: PRIMARY, fallbackOrigin: FALLBACK, primaryTimeoutMs: 50, downCooldownMs: 60_000,
      fetchImpl: (async (input: RequestInfo | URL) => String(input).startsWith(PRIMARY) ? new Response("x", { status: 503 }) : json({})) as typeof fetch,
      now: () => 5_000, storage,
    });
    await first.read("/api/a");

    const calls: string[] = [];
    const second = createLiveApi({
      primaryOrigin: PRIMARY, fallbackOrigin: FALLBACK, primaryTimeoutMs: 50, downCooldownMs: 60_000,
      fetchImpl: (async (input: RequestInfo | URL) => { calls.push(String(input)); return json({}); }) as typeof fetch,
      now: () => 6_000, storage,
    });
    await second.read("/api/b");
    expect(calls).toEqual([`${FALLBACK}/api/b`]);
  });

  it("surfaces the primary error when no fallback is configured", async () => {
    const { api } = setup({}, { fallback: false });
    await expect(api.read("/api/public-bundle")).rejects.toThrow("network down");
  });

  it("notifies subscribers when the source changes", async () => {
    const { api } = setup({ [FALLBACK]: () => json({}) });
    const listener = vi.fn();
    api.subscribe(listener);
    await api.read("/api/a");
    expect(listener).toHaveBeenCalledTimes(1);
    await api.read("/api/b");
    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("liveApi write", () => {
  it("only ever goes to the primary", async () => {
    const { api, calls } = setup({ [PRIMARY]: () => json({ ok: 1 }), [FALLBACK]: () => json({}) });
    await api.write("/api/scripts/1/view", { method: "POST" });
    expect(calls).toEqual([`${PRIMARY}/api/scripts/1/view`]);
  });

  it("is skipped without a request while the primary is known to be down", async () => {
    const { api, calls } = setup({ [PRIMARY]: () => new Response("down", { status: 503 }), [FALLBACK]: () => json({}) });
    await api.read("/api/a");
    calls.length = 0;
    await expect(api.write("/api/scripts/1/view", { method: "POST" })).rejects.toBeInstanceOf(LiveApiError);
    expect(calls).toEqual([]);
  });
});
