import { describe, expect, it } from "vitest";
import { BASE_URL } from "@/lib/seo";
import { createPublicInfoWebPageJsonLd } from "./publicInfoJsonLd";

describe("createPublicInfoWebPageJsonLd", () => {
  it("builds canonical WebPage data linked to the site's WebSite entity", () => {
    expect(
      createPublicInfoWebPageJsonLd({
        path: "/about",
        name: "關於｜泛用型產品作坊",
        description: "平台介紹",
      }),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${BASE_URL}/about#webpage`,
      url: `${BASE_URL}/about`,
      name: "關於｜泛用型產品作坊",
      description: "平台介紹",
      inLanguage: "zh-Hant",
      isPartOf: { "@id": `${BASE_URL}/#website` },
    });
  });

  it("resolves page paths against the canonical base URL", () => {
    const data = createPublicInfoWebPageJsonLd({ path: "/privacy", name: "Privacy", description: "Policy" });
    expect(data.url).toBe(`${BASE_URL}/privacy`);
    expect(data.url).not.toContain("localhost");
  });
});
