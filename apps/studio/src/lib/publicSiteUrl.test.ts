import { describe, expect, it } from "vitest";
import { publicSiteOrigin, publicSiteUrl } from "./publicSiteUrl";

describe("publicSiteUrl", () => {
  it("points the production studio at the production public site", () => {
    expect(publicSiteOrigin("studio-open-scripts.shawnup.com")).toBe("https://open-scripts.shawnup.com");
    expect(publicSiteUrl("/author/abc", "studio-open-scripts.shawnup.com")).toBe("https://open-scripts.shawnup.com/author/abc");
  });

  it("points the dev studio at the dev public site", () => {
    expect(publicSiteOrigin("studio-dev-open-scripts.shawnup.com")).toBe("https://dev-open-scripts.shawnup.com");
  });

  it("falls back to production for local development", () => {
    expect(publicSiteOrigin("localhost")).toBe("https://open-scripts.shawnup.com");
    expect(publicSiteUrl("activities?event=x", "localhost")).toBe("https://open-scripts.shawnup.com/activities?event=x");
  });
});
