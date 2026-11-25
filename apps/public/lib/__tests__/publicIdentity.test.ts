import { expect, it } from "vitest";
import { combinePublicIdentities } from "../publicIdentity";
import { buildGalleryAuthorIndex } from "../galleryAuthorIndex";
import type { ExternalPublicScript } from "../types";

const externalScript = (authorPersonaId?: string): ExternalPublicScript => ({
  id: "script-1",
  sourceUrl: "https://example.com/script",
  title: "作品",
  status: "published",
  authorName: "安里",
  authorBio: "公開作者介紹",
  authorAvatarUrl: "https://example.com/avatar.jpg",
  authorPersonaId,
  categories: ["男性向"],
});

it("enriches the linked author without importing work categories as profile tags", () => {
  const authors = combinePublicIdentities(
    [{ id: "persona-1", displayName: "安里", roles: ["scriptwriter", "voice_actor"], tags: ["聲演"] }],
    [externalScript("persona-1")],
  );
  expect(authors).toHaveLength(1);
  expect(authors[0]).toMatchObject({
    id: "persona-1",
    bio: "公開作者介紹",
    avatar: "https://example.com/avatar.jpg",
    tags: ["聲演"],
  });
});

it("does not merge people solely because their display names match", () => {
  const authors = combinePublicIdentities(
    [{ id: "persona-1", displayName: "安里" }],
    [externalScript()],
  );
  expect(authors).toHaveLength(2);
  expect(authors[1].tags ?? []).toEqual([]);
});

it("indexes public profile tags and leaves work categories with the work", () => {
  const work = externalScript("persona-1");
  const { searchIndex } = buildGalleryAuthorIndex(
    [{ id: "persona-1", displayName: "安里", tags: ["ＫＵ１００", "Ｄｅｍｏ　投稿建立"] }],
    [], [work],
  );
  expect(searchIndex[0].tags).toEqual(["ＫＵ１００"]);
  expect(searchIndex[0].searchText).toContain("作品");
  expect(searchIndex[0].searchText).not.toMatch(/投稿建立|男性向/);
  expect(work.categories).toEqual(["男性向"]);
});
