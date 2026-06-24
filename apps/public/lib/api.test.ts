import { describe, expect, it } from "vitest";
import { resolveMediaUrlsInPublicResponse, resolvePublicMediaUrl } from "./api";

describe("public API media URL resolution", () => {
  const backendOrigin = (process.env.BACKEND_API_URL ?? "http://write_project-backend:1091").replace(/\/+$/, "");

  it("resolves backend media paths for known media URL fields", () => {
    expect(resolvePublicMediaUrl("/media/covers/a.jpg#crop=abc")).toBe(
      `${backendOrigin}/media/covers/a.jpg#crop=abc`
    );
  });

  it("recursively resolves only media URL fields", () => {
    const resolved = resolveMediaUrlsInPublicResponse({
      content: "/media/this-is-script-text-not-an-image",
      coverUrl: "/media/covers/cover.jpg",
      persona: {
        avatar: "/media/avatars/a.png",
      },
      links: [
        { label: "download", url: "/media/not-a-public-image-field.pdf" },
      ],
      banner: {
        imageUrl: "/media/banners/home.webp#crop=1",
      },
    });

    expect(resolved).toEqual({
      content: "/media/this-is-script-text-not-an-image",
      coverUrl: `${backendOrigin}/media/covers/cover.jpg`,
      persona: {
        avatar: `${backendOrigin}/media/avatars/a.png`,
      },
      links: [
        { label: "download", url: "/media/not-a-public-image-field.pdf" },
      ],
      banner: {
        imageUrl: `${backendOrigin}/media/banners/home.webp#crop=1`,
      },
    });
  });

  it("leaves absolute external media URL fields untouched", () => {
    const resolved = resolveMediaUrlsInPublicResponse({
      avatarUrl: "https://avatars.githubusercontent.com/u/1",
    });

    expect(resolved.avatarUrl).toBe("https://avatars.githubusercontent.com/u/1");
  });
});
