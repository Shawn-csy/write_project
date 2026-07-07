import type { MetadataRoute } from "next";
import { BASE_URL } from "@/lib/seo";

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
        ],
        disallow: [
          "/dashboard",
          "/studio",
          "/edit",
          "/settings",
          "/admin",
          "/api/",
          "/gallery", // retired
        ],
      },
      ...AI_BOTS.map((userAgent) => ({ userAgent, ...AI_BOT_RULES })),
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
