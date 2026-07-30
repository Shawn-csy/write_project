import { afterEach, describe, expect, it, vi } from "vitest";

import { GET as getReadiness } from "./route";
import { GET as getLiveness } from "./live/route";


describe("public service health endpoints", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("reports liveness without calling the backend", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await getLiveness();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      service: "public",
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports readiness when the backend is ready", async () => {
    vi.stubEnv("BACKEND_API_URL", "http://backend.test/");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ status: "ready" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await getReadiness();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "ready",
      service: "public",
      checks: { backend: "ok" },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "http://backend.test/api/health/ready",
      expect.objectContaining({ cache: "no-store" }),
    );
  });

  it.each([
    ["backend error", vi.fn().mockResolvedValue(new Response(null, { status: 503 }))],
    ["network error", vi.fn().mockRejectedValue(new Error("network unavailable"))],
    [
      "invalid contract",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: "ok" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ],
  ])("returns 503 for %s", async (_case, fetchMock) => {
    vi.stubGlobal("fetch", fetchMock);

    const response = await getReadiness();

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      status: "unavailable",
      service: "public",
      checks: { backend: "failed" },
    });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
});
