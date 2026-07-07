import { describe, it, expect } from "vitest";
import { buildAuthorEntityModel, buildOrgEntityModel } from "./publicEntityPageModel";
import type { PublicPersona, PublicOrg, PublicScript } from "./types";

const makeScript = (overrides: Partial<PublicScript> = {}): PublicScript => ({
  id: "s1",
  title: "Test Script",
  tags: [{ name: "奇幻" }, { name: "現代" }],
  ...overrides,
});

const persona: PublicPersona = {
  id: "p1",
  displayName: "Alice",
  avatar: "/media/avatar.jpg",
  bannerUrl: "/media/banner.jpg",
  tags: ["作詞人", "音效"],
};

const org: PublicOrg = {
  id: "o1",
  name: "TestOrg",
  logoUrl: "/media/logo.jpg",
  bannerUrl: "/media/orgbanner.jpg",
  tags: ["工作室"],
};

describe("buildAuthorEntityModel", () => {
  it("separates profileTags from workTags", () => {
    const scripts = [makeScript({ tags: [{ name: "奇幻" }, { name: "作詞人" }] })];
    const model = buildAuthorEntityModel(persona, scripts);
    expect(model.profileTags).toEqual(["作詞人", "音效"]);
    // "作詞人" is also a profile tag → excluded from workTags
    expect(model.workTags).toEqual(["奇幻"]);
  });

  it("empty profile images do not fall back to script images", () => {
    const bare: PublicPersona = { id: "p2", displayName: "Bob" };
    const model = buildAuthorEntityModel(bare, [makeScript()]);
    expect(model.image.avatarUrl).toBeUndefined();
    expect(model.image.bannerUrl).toBeUndefined();
    expect(model.image.logoUrl).toBeUndefined();
  });

  it("owner fallback not included in model identity", () => {
    const scriptWithOwnerOnly = makeScript({ persona: null, owner: { id: "owner1", displayName: "Owner" } });
    const model = buildAuthorEntityModel(persona, [scriptWithOwnerOnly]);
    // model identity is persona, not owner
    expect(model.id).toBe(persona.id);
    expect(model.name).toBe(persona.displayName);
  });

  it("kind is author", () => {
    expect(buildAuthorEntityModel(persona, []).kind).toBe("author");
  });

  it("profileTags empty when persona has no tags", () => {
    const bare: PublicPersona = { id: "p3", displayName: "Carol" };
    const model = buildAuthorEntityModel(bare, [makeScript()]);
    expect(model.profileTags).toEqual([]);
    expect(model.workTags).toEqual(["奇幻", "現代"]);
  });
});

describe("buildOrgEntityModel", () => {
  it("separates profileTags from workTags", () => {
    const scripts = [makeScript({ tags: [{ name: "工作室" }, { name: "恐怖" }] })];
    const model = buildOrgEntityModel(org, scripts);
    expect(model.profileTags).toEqual(["工作室"]);
    expect(model.workTags).toEqual(["恐怖"]);
  });

  it("image fields come from org, not scripts", () => {
    const model = buildOrgEntityModel(org, [makeScript({ coverUrl: "/media/cover.jpg" })]);
    expect(model.image.logoUrl).toBe("/media/logo.jpg");
    expect(model.image.bannerUrl).toBe("/media/orgbanner.jpg");
    expect(model.image.avatarUrl).toBeUndefined();
  });

  it("kind is organization", () => {
    expect(buildOrgEntityModel(org, []).kind).toBe("organization");
  });
});
