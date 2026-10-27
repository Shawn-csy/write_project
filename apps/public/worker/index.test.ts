import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "./index";

const ORIGIN = "https://site.example";

type WorkerEnv = Parameters<typeof worker.fetch>[1];

function fakeDb(rows: Record<string, { body: string; synced_at: string }>): NonNullable<WorkerEnv["DB"]> {
  const statement = (path = "") => ({
    bind: (bound: string) => statement(bound),
    first: async () => rows[path] ?? null,
  });
  return { prepare: () => statement() } as unknown as NonNullable<WorkerEnv["DB"]>;
}

const get = (path: string, init?: RequestInit) =>
  new Request(`https://api.example${path}`, { headers: { origin: ORIGIN }, ...init });

afterEach(() => vi.unstubAllGlobals());

describe("snapshot (D1 fallback) mode", () => {
  const db = fakeDb({
    "/api/public-bundle": { body: '{"scripts":[]}', synced_at: "2026-10-27T00:00:00Z" },
    "/api/public-scripts?personaId=p1": { body: "[]", synced_at: "2026-10-27T00:00:00Z" },
  });
  const env = { DB: db, ALLOWED_ORIGINS: ORIGIN };

  it("serves the stored JSON with its sync time", async () => {
    const response = await worker.fetch(get("/api/public-bundle"), env);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('{"scripts":[]}');
    expect(response.headers.get("x-data-synced-at")).toBe("2026-10-27T00:00:00Z");
    expect(response.headers.get("access-control-allow-origin")).toBe(ORIGIN);
    expect(response.headers.get("access-control-expose-headers")).toContain("X-Data-Synced-At");
  });

  it("keys list queries by their query string", async () => {
    const response = await worker.fetch(get("/api/public-scripts?personaId=p1"), env);
    expect(response.status).toBe(200);
  });

  it("answers 404 for a path with no snapshot", async () => {
    expect((await worker.fetch(get("/api/public-scripts/unknown"), env)).status).toBe(404);
  });

  it("refuses writes, since the copy is read-only", async () => {
    const response = await worker.fetch(get("/api/scripts/1/view", { method: "POST" }), env);
    expect(response.status).toBe(503);
  });

  it("does not answer visitor-specific reads or media from a snapshot", async () => {
    expect((await worker.fetch(get("/api/public-scripts/1/like-status?visitorId=v"), env)).status).toBe(404);
    expect((await worker.fetch(get("/api/public-media/abc.webp"), env)).status).toBe(404);
  });
});

describe("routing and CORS", () => {
  const env = { DB: fakeDb({}), ALLOWED_ORIGINS: ORIGIN };

  it("never serves images: /media is not a Worker route", async () => {
    expect((await worker.fetch(get("/media/u/a.webp"), env)).status).toBe(404);
  });

  it("rejects admin and unknown routes", async () => {
    expect((await worker.fetch(get("/api/scripts"), env)).status).toBe(404);
    expect((await worker.fetch(get("/api/admin/users"), env)).status).toBe(404);
  });

  it("only allows the configured origins, not any pages.dev site", async () => {
    const other = new Request("https://api.example/api/public-bundle", { headers: { origin: "https://evil.pages.dev" } });
    const response = await worker.fetch(other, { DB: fakeDb({ "/api/public-bundle": { body: "{}", synced_at: "x" } }), ALLOWED_ORIGINS: ORIGIN });
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("answers preflight", async () => {
    const response = await worker.fetch(get("/api/public-bundle", { method: "OPTIONS" }), env);
    expect(response.status).toBe(204);
  });
});

describe("proxy (preview) mode", () => {
  const env = { BACKEND_ORIGIN: "https://backend.example", ALLOWED_ORIGINS: ORIGIN };

  it("forwards an allowed read and leaves JSON bodies untouched", async () => {
    const upstream = vi.fn(async () => new Response('{"cover":"/media/u/a.webp"}', { headers: { "content-type": "application/json" } }));
    vi.stubGlobal("fetch", upstream);
    const response = await worker.fetch(get("/api/public-bundle"), env);
    expect(upstream).toHaveBeenCalledWith(new URL("https://backend.example/api/public-bundle"), expect.objectContaining({ method: "GET" }));
    expect(await response.text()).toBe('{"cover":"/media/u/a.webp"}');
  });

  it("returns 502 when the backend is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("down"); }));
    expect((await worker.fetch(get("/api/public-bundle"), env)).status).toBe(502);
  });

  it("refuses writes when READ_ONLY is set, without calling the backend", async () => {
    const upstream = vi.fn();
    vi.stubGlobal("fetch", upstream);
    const response = await worker.fetch(get("/api/scripts/1/view", { method: "POST" }), { ...env, READ_ONLY: "1" });
    expect(response.status).toBe(503);
    expect(upstream).not.toHaveBeenCalled();
  });

  it("reports a missing configuration instead of guessing", async () => {
    expect((await worker.fetch(get("/api/public-bundle"), {})).status).toBe(503);
  });
});
