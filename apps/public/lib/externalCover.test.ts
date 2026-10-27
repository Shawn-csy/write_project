import { afterEach, describe, expect, it, vi } from "vitest";

async function load(env: Record<string, string>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return (await import("./externalCover")).externalCoverSrc;
}

afterEach(() => vi.unstubAllEnvs());

describe("externalCoverSrc", () => {
  const staticEnv = { NEXT_PUBLIC_STATIC_EXPORT: "1", NEXT_PUBLIC_MEDIA_ORIGIN: "https://media.example" };

  it("has no cover when the work has none", async () => {
    expect((await load(staticEnv))({ id: "a", coverUrl: null })).toBeUndefined();
  });

  it("reads a stored cover straight from the media origin in the static build", async () => {
    const src = await load(staticEnv);
    expect(src({ id: "a", coverUrl: "/media/u/cover.webp" })).toBe("https://media.example/media/u/cover.webp");
    expect(src({ id: "a", coverUrl: "https://media.example/media/u/cover.webp" })).toBe("https://media.example/media/u/cover.webp");
  });

  it("keeps the server proxy for a cover that lives on another site", async () => {
    expect((await load(staticEnv))({ id: "a", coverUrl: "https://other.example/c.jpg" })).toBe("/api/public-media/external/a");
  });

  it("always uses the proxy outside the static build", async () => {
    expect((await load({}))({ id: "a", coverUrl: "/media/u/cover.webp" })).toBe("/api/public-media/external/a");
  });
});
