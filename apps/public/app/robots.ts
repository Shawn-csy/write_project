import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/seo";

export const dynamic = "force-static";

const AI_BOTS = ["GPTBot", "ClaudeBot", "PerplexityBot", "Google-Extended"];

const AI_BOT_RULES = {
  allow: [
    "/read/",
    "/author/",
    "/org/",
    "/series/",
    "/tag/",
    "/sitemap.xml",
    "/llms.txt",
    "/.well-known/llms.txt",
    "/.well-known/api-catalog",
    "/api/public-scripts",
    "/api/public-scripts/",
    "/api/public-media/",
  ],
  disallow: ["/dashboard", "/studio", "/edit", "/settings", "/admin", "/api/revalidate", "/api/public-bundle"],
};

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/read/",
          "/author/",
          "/org/",
          "/series/",
          "/tag/",
          "/about",
          "/help",
          "/license",
          "/privacy",
          "/terms",
          // Card/hero images are served through this proxy. The longer rule
          // wins over `Disallow: /api/`, so Googlebot can fetch and index them.
          "/api/public-media/",
        ],
        // `/gallery` is intentionally absent: it returns 410, and blocking it
        // would stop crawlers from ever seeing that status and dropping the URL.
        disallow: [
          "/dashboard",
          "/studio",
          "/edit",
          "/settings",
          "/admin",
          "/api/",
        ],
      },
      ...AI_BOTS.map((userAgent) => ({ userAgent, ...AI_BOT_RULES })),
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
