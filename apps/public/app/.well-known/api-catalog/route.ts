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
        item: [
          {
            href: `${BASE_URL}/api/public-scripts/{script_id}`,
            type: "application/json",
          },
          {
            href: `${BASE_URL}/api/public-scripts/{script_id}/raw`,
            type: "text/markdown",
          },
        ],
      },
    ],
  };

  return NextResponse.json(catalog, {
    headers: { "Content-Type": "application/linkset+json" },
  });
}
