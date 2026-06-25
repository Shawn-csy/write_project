/**
 * API boundary regression: public media URLs must pass through apiFetch
 * unchanged so browser-facing <img> components and public-ui can load them.
 * Docker-internal URL rewriting belongs in PublicImage, not here.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { apiFetch } from "./api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

function respondWith(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(body),
  });
}

describe("apiFetch media URL boundary", () => {
  it("returns /media/ paths unchanged — no Docker-internal rewrite", async () => {
    const payload = {
      scripts: [
        {
          id: "abc",
          coverUrl: "/media/user123/cover/abc.webp",
          persona: { avatar: "/media/user123/avatar/xyz.jpg" },
        },
      ],
    };
    respondWith(payload);

    const result = await apiFetch<typeof payload>("/public-bundle");

    expect(result.scripts[0].coverUrl).toBe("/media/user123/cover/abc.webp");
    expect(result.scripts[0].persona.avatar).toBe("/media/user123/avatar/xyz.jpg");
  });

  it("returns external URLs unchanged", async () => {
    const payload = { avatar: "https://avatars.githubusercontent.com/u/123?v=4" };
    respondWith(payload);

    const result = await apiFetch<typeof payload>("/public-personas/123");

    expect(result.avatar).toBe("https://avatars.githubusercontent.com/u/123?v=4");
  });
});
