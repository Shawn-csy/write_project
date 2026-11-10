import { expect, it } from "vitest";
import { combinePublicIdentities } from "../publicIdentity";
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

it("merges a linked external author into one enriched persona", () => {
  const authors = combinePublicIdentities(
    [{ id: "persona-1", displayName: "安里", roles: ["scriptwriter", "voice_actor"], tags: ["聲演"] }],
    [externalScript("persona-1")],
  );
  expect(authors).toHaveLength(1);
  expect(authors[0]).toMatchObject({
    id: "persona-1",
    bio: "公開作者介紹",
    avatar: "https://example.com/avatar.jpg",
    tags: ["聲演", "男性向"],
  });
});

it("does not merge people solely because their display names match", () => {
  const authors = combinePublicIdentities(
    [{ id: "persona-1", displayName: "安里" }],
    [externalScript()],
  );
  expect(authors).toHaveLength(2);
});
