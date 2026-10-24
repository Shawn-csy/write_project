import { describe, expect, it } from "vitest";
import { externalEntityHref, externalEntitySlug } from "../externalEntity";

describe("externalEntitySlug", () => {
  it("uses the Twitter handle as the short public ID", () => {
    expect(externalEntitySlug("橘子‧伊橙//ㄐㄧㄤㄗㄞㄙ", "https://x.com/kurihara_mikan")).toBe("kurihara_mikan");
  });

  it("supports malformed nested Twitter URLs by using the final handle", () => {
    expect(externalEntitySlug("橘子", "https://x.com/https://twitter.com/kurihara_mikan")).toBe("kurihara_mikan");
  });

  it("has a deterministic fallback for a CJK name without a profile URL", () => {
    expect(externalEntitySlug("被談聲聆")).toMatch(/^entity-[a-z0-9]+$/);
  });
});

describe("externalEntityHref", () => {
  it("builds a short author route from the profile handle", () => {
    expect(externalEntityHref("author", "橘子", "https://x.com/kurihara_mikan"))
      .toBe("/author/external/kurihara_mikan");
  });
});
