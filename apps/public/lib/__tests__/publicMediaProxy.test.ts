import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sharp from "sharp";
import { resolveBackendMediaUrl, serveExternalPublicMedia, servePublicMedia } from "../publicMediaProxy";

function token(path: string): string {
  return Buffer.from(path, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function imageUpstream(body: Uint8Array, headers: Record<string, string> = {}): Response {
  return new Response(body as BodyInit, {
    status: 200,
    headers: { "content-type": "image/png", "content-length": String(body.byteLength), ...headers },
  });
}

async function makePng(width: number, height = Math.round(width / 2)): Promise<Uint8Array> {
  const buffer = await sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 40, b: 40 } },
  }).png().toBuffer();
  return new Uint8Array(buffer);
}

describe("resolveBackendMediaUrl", () => {
  it("accepts ordinary media paths, including unicode names", () => {
    expect(resolveBackendMediaUrl("/media/u1/cover/abc.webp")?.pathname).toBe("/media/u1/cover/abc.webp");
    expect(resolveBackendMediaUrl("/media/u1/外部台本圖片/作者-x.jpg")).not.toBeNull();
  });

  it.each([
    "/media/%2e%2e/api/admin",
    "/media/a/%2E%2E/%2e%2e/health",
    "/media/a/../b.png",
    "/media/a\\..\\b.png",
    "/media//evil.com/x.png",
    "/api/admin",
    "//evil.com/media/x.png",
    "/media/x%00.png",
  ])("rejects traversal or off-prefix path %s", (raw) => {
    expect(resolveBackendMediaUrl(raw)).toBeNull();
  });
});

describe("servePublicMedia", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("never reaches the backend for an encoded-traversal token", async () => {
    const res = await servePublicMedia(token("/media/%2e%2e/api/admin/users"));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses non-image upstream content", async () => {
    fetchMock.mockResolvedValue(new Response("<html>", { status: 200, headers: { "content-type": "text/html" } }));
    const res = await servePublicMedia(token("/media/u1/page.html"));
    expect(res.status).toBe(415);
  });

  it("rejects oversized declared bodies", async () => {
    fetchMock.mockResolvedValue(
      new Response(new Uint8Array(4), {
        status: 200,
        headers: { "content-type": "image/png", "content-length": String(60 * 1024 * 1024) },
      }),
    );
    const res = await servePublicMedia(token("/media/u1/huge.png"));
    expect(res.status).toBe(413);
  });

  it("adds nosniff and a sandboxing CSP to image responses", async () => {
    fetchMock.mockResolvedValue(imageUpstream(await makePng(100)));
    const res = await servePublicMedia(token("/media/u1/a.png"));
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("content-security-policy")).toContain("sandbox");
  });

  it("downscales to the requested width and returns webp with the long cache lifetime", async () => {
    fetchMock.mockResolvedValue(imageUpstream(await makePng(1200, 1800)));
    const res = await servePublicMedia(token("/media/u1/big.png"), 360);
    expect(res.headers.get("content-type")).toBe("image/webp");
    const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
    expect(meta.width).toBe(360);
    expect(res.headers.get("cache-control")).toContain("s-maxage=2592000");
  });

  it("serves the original (long cache) when it is already narrower than the request", async () => {
    const small = await makePng(100);
    fetchMock.mockResolvedValue(imageUpstream(small));
    const res = await servePublicMedia(token("/media/u1/small.png"), 360);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(small);
    expect(res.headers.get("cache-control")).toContain("s-maxage=2592000");
  });

  it("does not buffer or resize a body whose length is not declared", async () => {
    const png = await makePng(1200, 1800);
    fetchMock.mockResolvedValue(
      new Response(png as BodyInit, { status: 200, headers: { "content-type": "image/png" } }),
    );
    const res = await servePublicMedia(token("/media/u1/chunked.png"), 360);
    const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
    expect(meta.width).toBe(1200);
  });

  it("falls back to the original with a SHORT cache when the decoder fails", async () => {
    const garbage = new Uint8Array(2048).fill(7);
    fetchMock.mockResolvedValue(imageUpstream(garbage));
    const res = await servePublicMedia(token("/media/u1/broken.png"), 360);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, max-age=60, s-maxage=60");
  });

  it("limits concurrent resizes and degrades extra requests to a short-cached original", async () => {
    const png = await makePng(1600, 2400);
    fetchMock.mockImplementation(async () => imageUpstream(png));
    const results = await Promise.all(
      Array.from({ length: 8 }, () => servePublicMedia(token("/media/u1/burst.png"), 240)),
    );
    const degraded = results.filter((res) => res.headers.get("cache-control") === "public, max-age=60, s-maxage=60");
    const resized = results.filter((res) => res.headers.get("content-type") === "image/webp");
    expect(resized.length).toBeGreaterThan(0);
    expect(resized.length).toBeLessThan(8);
    expect(degraded.length + resized.length).toBe(8);
  });
});

describe("serveExternalPublicMedia remote hosts", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  function bundleWith(coverUrl: string): Response {
    return new Response(JSON.stringify({ externalPublicScripts: [{ id: "e1", coverUrl }] }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  }

  it.each([
    "http://127.0.0.1/a.png",
    "http://169.254.169.254/latest",
    "http://10.0.0.5/x.png",
    "http://localhost/x.png",
    "http://[::1]/x.png",
    "http://[::ffff:127.0.0.1]/x.png",
    "http://[::ffff:169.254.169.254]/x.png",
  ])(
    "refuses private target %s without fetching it",
    async (coverUrl) => {
      fetchMock.mockResolvedValueOnce(bundleWith(coverUrl));
      const res = await serveExternalPublicMedia("e1");
      expect(res.status).toBe(400);
      expect(fetchMock).toHaveBeenCalledTimes(1); // only the bundle lookup
    },
  );

});
