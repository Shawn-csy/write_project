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

function streamedImage(megabytes: number, advertisedBytes: number): Response {
  let sent = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (sent >= megabytes) return controller.close();
      sent += 1;
      controller.enqueue(new Uint8Array(1024 * 1024));
    },
  });
  return new Response(body, {
    status: 200,
    headers: { "content-type": "image/png", "content-length": String(advertisedBytes) },
  });
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

  it("limits actual passthrough bytes when Content-Length lies", async () => {
    fetchMock.mockResolvedValue(streamedImage(26, 1));
    const res = await servePublicMedia(token("/media/u1/lying-original.png"));
    expect(res.status).toBe(200);
    expect(res.headers.get("content-length")).toBeNull();
    await expect(res.arrayBuffer()).rejects.toThrow("Media too large");
  });

  it("rejects an oversized resize source even when Content-Length claims one byte", async () => {
    fetchMock.mockResolvedValue(streamedImage(13, 1));
    const res = await servePublicMedia(token("/media/u1/lying-thumbnail.png"), 360);
    expect(res.status).toBe(413);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("rejects declared resize sources above the buffer ceiling", async () => {
    fetchMock.mockResolvedValue(imageUpstream(new Uint8Array(1), { "content-length": String(13 * 1024 * 1024) }));
    const res = await servePublicMedia(token("/media/u1/declared-large.png"), 360);
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

  it("resizes a body without Content-Length within the byte ceiling", async () => {
    const png = await makePng(1200, 1800);
    fetchMock.mockResolvedValue(
      new Response(png as BodyInit, { status: 200, headers: { "content-type": "image/png" } }),
    );
    const res = await servePublicMedia(token("/media/u1/chunked.png"), 360);
    const meta = await sharp(Buffer.from(await res.arrayBuffer())).metadata();
    expect(meta.width).toBe(360);
  });

  it("falls back to the original with a SHORT cache when the decoder fails", async () => {
    const garbage = new Uint8Array(2048).fill(7);
    fetchMock.mockResolvedValue(imageUpstream(garbage));
    const res = await servePublicMedia(token("/media/u1/broken.png"), 360);
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("public, max-age=60, s-maxage=60");
  });

  it("queues a burst of thumbnail requests without returning full-size originals", async () => {
    const png = await makePng(1600, 2400);
    fetchMock.mockImplementation(async () => imageUpstream(png));
    const results = await Promise.all(
      Array.from({ length: 8 }, () => servePublicMedia(token("/media/u1/burst.png"), 240)),
    );
    expect(results.every((res) => res.status === 200 && res.headers.get("content-type") === "image/webp")).toBe(true);
    const dimensions = await Promise.all(results.map(async (res) => sharp(Buffer.from(await res.arrayBuffer())).metadata()));
    expect(dimensions.every((meta) => meta.width === 240)).toBe(true);
  });

  it("shares and reuses a small immutable variant across concurrent and later requests", async () => {
    const png = await makePng(1200, 1800);
    fetchMock.mockImplementation(async () => imageUpstream(png));
    const path = token("/media/u1/cached-variant.png");
    const responses = await Promise.all(Array.from({ length: 8 }, () => servePublicMedia(path, 48)));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(responses.every((response) => response.status === 200)).toBe(true);
    const bodies = await Promise.all(responses.map((response) => response.arrayBuffer()));
    expect(bodies.every((body) => body.byteLength === bodies[0].byteLength)).toBe(true);
    const repeat = await servePublicMedia(path, 48);
    expect(repeat.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("caps upstream requests and rejects excess work without caching", async () => {
    let releaseUpstream!: () => void;
    const heldUpstream = new Promise<void>((resolve) => { releaseUpstream = resolve; });
    fetchMock.mockImplementation(async () => {
      await heldUpstream;
      return new Response(null, { status: 404 });
    });
    const pending = Array.from({ length: 112 }, (_, index) => servePublicMedia(token(`/media/u1/overload-${index}.png`), 240));
    try {
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(12));
      // Waiting requests must not open their upstream connection.
      expect(fetchMock).toHaveBeenCalledTimes(12);
    } finally {
      releaseUpstream();
    }
    const results = await Promise.all(pending);
    const rejected = results.filter((res) => res.status === 503);
    expect(rejected.length).toBeGreaterThan(0);
    expect(rejected.every((res) => res.headers.get("cache-control") === "no-store")).toBe(true);
    expect(results.every((res) => res.status === 503 || res.status === 404)).toBe(true);
  });

  it("rejects oversized media tokens before contacting the backend", async () => {
    const res = await servePublicMedia("x".repeat(4097), 240);
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("serveExternalPublicMedia remote hosts", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  function coverLookup(coverUrl: string): Response {
    return new Response(JSON.stringify({ coverUrl }), {
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
      fetchMock.mockResolvedValueOnce(coverLookup(coverUrl));
      const res = await serveExternalPublicMedia("e1");
      expect(res.status).toBe(400);
      expect(fetchMock).toHaveBeenCalledTimes(1); // only the cover lookup
      expect(String(fetchMock.mock.calls[0][0])).toContain("/api/public-external-scripts/e1/cover");
    },
  );

  it("returns 404 without requesting an image when the published cover is missing", async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }));
    const res = await serveExternalPublicMedia("missing");
    expect(res.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

});
