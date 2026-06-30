import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePathMock = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: revalidatePathMock,
}));

async function loadRoute() {
  vi.resetModules();
  vi.stubEnv("REVALIDATE_SECRET", "test-secret");
  return import("./route");
}

function request(body: unknown) {
  return new Request("http://localhost/api/revalidate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/revalidate", () => {
  beforeEach(() => {
    revalidatePathMock.mockClear();
    vi.unstubAllEnvs();
  });

  it("revalidates allowed public paths", async () => {
    const { POST } = await loadRoute();
    const res = await POST(request({
      secret: "test-secret",
      paths: ["/", "/read/script-1", "/author/p1", "/org/o1", "/series/AAA", "/tag/drama", "/sitemap.xml"],
    }) as never);

    expect(res.status).toBe(200);
    expect(revalidatePathMock).toHaveBeenCalledTimes(7);
    expect(revalidatePathMock).toHaveBeenCalledWith("/read/script-1");
  });

  it("rejects invalid paths without revalidating partial payloads", async () => {
    const { POST } = await loadRoute();
    const res = await POST(request({
      secret: "test-secret",
      paths: ["/read/script-1", "/api/revalidate", "//evil", "/read/x?y=1", "/read/x#hash", "/dashboard"],
    }) as never);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid paths");
    expect(body.rejected).toEqual(["/api/revalidate", "//evil", "/read/x?y=1", "/read/x#hash", "/dashboard"]);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("rejects payloads with too many paths", async () => {
    const { POST } = await loadRoute();
    const res = await POST(request({
      secret: "test-secret",
      paths: Array.from({ length: 51 }, (_, i) => `/read/${i}`),
    }) as never);

    expect(res.status).toBe(400);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  it("rejects bad secrets", async () => {
    const { POST } = await loadRoute();
    const res = await POST(request({ secret: "wrong", paths: ["/"] }) as never);

    expect(res.status).toBe(401);
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });
});
