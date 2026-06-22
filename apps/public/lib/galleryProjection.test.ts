import { describe, expect, it } from "vitest";
import type { PublicScript } from "./types";
import {
  publicOrgsFromResponse,
  publicPersonasFromResponse,
  publicScriptsFromBundle,
  toAuthorLike,
  toGalleryInput,
  toOrgLike,
} from "./galleryProjection";

describe("galleryProjection", () => {
  it("maps PublicScript into GalleryScriptInput with persona author and license defaults", () => {
    const script: PublicScript = {
      id: "s1",
      title: "Script",
      coverUrl: "/cover.jpg",
      tags: [{ id: "t1", name: "奇幻" }],
      views: 12,
      lastModified: 100,
      updatedAt: 90,
      seriesOrder: 2,
      series: { id: "series-1", name: "Series", coverUrl: "/series.jpg" },
      licenseCommercial: null,
      licenseDerivative: "allow",
      licenseNotify: "required",
      customMetadata: [{ key: "license", value: "CC" }],
      persona: {
        id: "p1",
        displayName: "Persona",
        avatar: "/avatar.jpg",
        defaultLicenseCommercial: "allow",
        defaultLicenseDerivative: "disallow",
        defaultLicenseNotify: "required",
      },
    };

    const input = toGalleryInput(script);

    expect(input).toMatchObject({
      id: "s1",
      title: "Script",
      coverUrl: "/cover.jpg",
      tags: [{ id: "t1", name: "奇幻" }],
      views: 12,
      lastModified: 100,
      updatedAt: 90,
      seriesOrder: 2,
      series: { id: "series-1", name: "Series", coverUrl: "/series.jpg" },
      licenseCommercial: undefined,
      licenseDerivative: "allow",
      licenseNotify: "required",
      customMetadata: [{ key: "license", value: "CC" }],
      author: { id: "p1", displayName: "Persona", avatarUrl: "/avatar.jpg" },
      persona: {
        defaultLicenseCommercial: "allow",
        defaultLicenseDerivative: "disallow",
        defaultLicenseNotify: "required",
      },
    });
  });

  it("uses owner as author when persona is absent", () => {
    const input = toGalleryInput({
      id: "s1",
      title: "Script",
      owner: { id: "u1", displayName: "Owner", avatarUrl: "/owner.jpg" },
      persona: null,
    });

    expect(input.author).toEqual({
      id: "u1",
      displayName: "Owner",
      avatarUrl: "/owner.jpg",
    });
    expect(input.persona).toBeNull();
  });

  it("normalizes author and org list items", () => {
    expect(
      toAuthorLike({ id: "p1", displayName: "Persona", avatar: "/a.jpg", tags: ["聲劇"] })
    ).toEqual({
      id: "p1",
      displayName: "Persona",
      avatarUrl: "/a.jpg",
      tags: ["聲劇"],
    });
    expect(toOrgLike({ id: "o1", name: "Org", tags: ["社團"] })).toEqual({
      id: "o1",
      name: "Org",
      tags: ["社團"],
    });
  });

  it("extracts scripts from bundle responses", () => {
    expect(
      publicScriptsFromBundle({
        scripts: [{ id: "s1", title: "One" }, { title: "Missing id" }, null],
      })
    ).toEqual([{ id: "s1", title: "One" }]);
    expect(publicScriptsFromBundle(null)).toEqual([]);
    expect(publicScriptsFromBundle({ scripts: "bad" })).toEqual([]);
  });

  it("forwards synopsis and outline from PublicScript", () => {
    const input = toGalleryInput({
      id: "s1",
      title: "Script",
      synopsis: "Short summary text",
      outline: "Detailed outline text",
    });
    expect(input.synopsis).toBe("Short summary text");
    expect(input.outline).toBe("Detailed outline text");
  });

  it("synopsis and outline are undefined when absent on PublicScript", () => {
    const input = toGalleryInput({ id: "s1", title: "Script" });
    expect(input.synopsis).toBeUndefined();
    expect(input.outline).toBeUndefined();
  });

  it("normalizes people responses", () => {
    expect(publicPersonasFromResponse([{ id: "p1", displayName: "P" }])).toEqual([
      { id: "p1", displayName: "P" },
    ]);
    expect(publicPersonasFromResponse({})).toEqual([]);
    expect(publicOrgsFromResponse([{ id: "o1", name: "O" }])).toEqual([
      { id: "o1", name: "O" },
    ]);
    expect(publicOrgsFromResponse(null)).toEqual([]);
  });
});
