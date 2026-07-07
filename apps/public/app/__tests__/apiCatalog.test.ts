import { describe, expect, it } from "vitest";
import { GET } from "../.well-known/api-catalog/route";

const BASE = "https://open-scripts.shawnup.com";

describe("api-catalog", () => {
  it("returns linkset json for public script discovery", async () => {
    const response = GET();
    const data = await response.json();
    const linkset = data.linkset?.[0];

    expect(response.headers.get("content-type")).toContain("application/linkset+json");
    expect(linkset.anchor).toBe(BASE);
    expect(linkset.sitemap).toContainEqual({
      href: `${BASE}/sitemap.xml`,
      type: "application/xml",
    });
    expect(linkset.collection).toContainEqual({
      href: `${BASE}/api/public-scripts`,
      type: "application/json",
      title: "Public script collection",
    });
    expect(linkset.item).toContainEqual({
      href: `${BASE}/api/public-scripts/{script_id}`,
      type: "application/json",
      title: "Public script metadata",
    });
    expect(linkset.item).toContainEqual({
      href: `${BASE}/api/public-scripts/{script_id}/raw`,
      type: "text/markdown",
      title: "Public script raw markdown",
    });
  });
});
