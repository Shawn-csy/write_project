import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

describe("public bundle BFF projection", () => {
  const backendFetch = vi.fn();
  beforeEach(() => vi.stubGlobal("fetch", backendFetch));
  afterEach(() => {
    vi.unstubAllGlobals();
    backendFetch.mockReset();
  });

  it("streams a validated section request without rewriting the payload", async () => {
    const body = '{"audioWorks":[{"coverUrl":"/media/example.webp"}],"organizations":[]}';
    backendFetch.mockResolvedValue(new Response(body, { headers: { "Content-Type": "application/json" } }));
    const response = await GET(new Request("https://site.example/api/public-bundle?sections=audioWorks,organizations"));
    expect(response.status).toBe(200);
    expect(backendFetch).toHaveBeenCalledWith(
      "http://write_project-backend:1091/api/public-bundle?sections=audioWorks,organizations",
      expect.objectContaining({ cache: "no-store", signal: expect.any(AbortSignal) }),
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.text()).toBe(body);
  });

  it("rejects unknown sections before reaching the backend", async () => {
    const response = await GET(new Request("https://site.example/api/public-bundle?sections=privateData"));
    expect(response.status).toBe(400);
    expect(backendFetch).not.toHaveBeenCalled();
  });

  it("returns 502 when the backend fails", async () => {
    backendFetch.mockResolvedValue(new Response(null, { status: 503 }));
    const response = await GET(new Request("https://site.example/api/public-bundle"));
    expect(response.status).toBe(502);
  });
});
