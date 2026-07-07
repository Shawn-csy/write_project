import { BASE_URL } from "@/lib/seo";
import { NextResponse } from "next/server";

export const dynamic = "force-static";

export function GET() {
  const catalog = {
    linkset: [
      {
        anchor: BASE_URL,
        "service-doc": [
          { href: `${BASE_URL}/llms.txt`, type: "text/plain" },
          { href: `${BASE_URL}/.well-known/llms.txt`, type: "text/plain" },
        ],
        sitemap: [{ href: `${BASE_URL}/sitemap.xml`, type: "application/xml" }],
        collection: [
          {
            href: `${BASE_URL}/api/public-scripts`,
            type: "application/json",
            title: "Public script collection",
          },
        ],
        item: [
          {
            href: `${BASE_URL}/api/public-scripts/{script_id}`,
            type: "application/json",
            title: "Public script metadata",
          },
          {
            href: `${BASE_URL}/api/public-scripts/{script_id}/raw`,
            type: "text/markdown",
            title: "Public script raw markdown",
          },
        ],
      },
    ],
  };

  return NextResponse.json(catalog, {
    headers: { "Content-Type": "application/linkset+json" },
  });
}
