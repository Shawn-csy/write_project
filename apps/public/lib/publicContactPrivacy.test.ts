import { describe, expect, it } from "vitest";
import { isPrivateContact, partitionContacts } from "./publicContactPrivacy";

describe("publicContactPrivacy", () => {
  it("flags email and discord contacts as private", () => {
    expect(isPrivateContact({ label: "Email", url: "a@b.co" })).toBe(true);
    expect(isPrivateContact({ label: "聯絡方式", url: "someone@example.com" })).toBe(true);
    expect(isPrivateContact({ label: "Discord", url: "user#1234" })).toBe(true);
    expect(isPrivateContact({ label: "社群", url: "https://discord.gg/abc" })).toBe(true);
    expect(isPrivateContact({ label: "Plurk", url: "https://plurk.com/x" })).toBe(false);
  });

  it("hides private contacts unless the owner marked them public", () => {
    const { visible, hidden } = partitionContacts([
      { label: "Email", url: "a@b.co" },
      { label: "Discord", url: "x", isPublic: true },
      { label: "網站", url: "https://example.com" },
    ]);
    expect(hidden.map((item) => item.label)).toEqual(["Email"]);
    expect(visible.map((item) => item.label)).toEqual(["Discord", "網站"]);
  });
});
