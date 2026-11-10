import type { NextConfig } from "next";
import path from "path";
import { PUBLIC_NEXT_IMAGE_HOST_PATTERNS } from "./lib/publicImageOrigins";
import { PUBLIC_SECURITY_HEADERS } from "./securityHeaders.mjs";

// ── Image origins ─────────────────────────────────────────────────────────────
// 1. Backend /media/ paths use the dedicated public media proxy, never the
//    image optimizer's network access to Docker-internal services.
// 2. Known external image origins are allowlisted for next/image. Unknown
//    user-provided external URLs render through PublicImage's plain <img>
//    fallback instead of turning the optimizer into an open proxy.

const backendUrl = process.env.BACKEND_API_URL || "http://localhost:1091";

const staticExport = process.env.CF_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  ...(staticExport
    ? { output: "export" as const }
    : {
        output: "standalone" as const,
        outputFileTracingRoot: path.resolve(__dirname, "../.."),
      }),
  // ISR 頁面的 Cache-Control 由 Next 依下列公式產生：
  //   s-maxage=<revalidate>, stale-while-revalidate=<expireTime - revalidate>
  // expireTime 預設是 31536000（一年），代表快取過期後 CDN 仍可供應舊版本將近一年。
  // 2026-08-20 資料庫事故期間，三篇台本頁的 404 就是被 Cloudflare 以這個視窗鎖住，
  // 源站修好後訪客仍持續看到錯誤頁。
  // 收斂為 7200：各路由 revalidate 皆為 3600，故 stale-while-revalidate 也是 3600，
  // 最壞情況的內容陳舊時間從一年降到約兩小時。
  ...(!staticExport ? { expireTime: 7200 } : {}),
  transpilePackages: ["@write/browser-download", "@write/media-crop", "@write/public-ui", "@write/reader-export", "@write/script-engine", "@write/script-reader-renderer", "@write/script-reader-ui"],
  ...(!staticExport ? {
  async rewrites() {
    return [
      {
        source: "/media/:path*",
        destination: `${backendUrl.replace(/\/+$/, "")}/media/:path*`,
      },
    ];
  },
  async headers() {
    const discoveryLinks = [
      '</llms.txt>; rel="service-doc"; type="text/plain"',
      '</.well-known/llms.txt>; rel="service-doc"; type="text/plain"',
      '</.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"',
      '</sitemap.xml>; rel="sitemap"; type="application/xml"',
    ].join(", ");
    const publicRoutes = [
      "/",
      "/read/:path*",
      "/author/:path*",
      "/org/:path*",
      "/series/:path*",
      "/tag/:path*",
      "/about",
      "/help",
      "/license",
      "/privacy",
      "/terms",
    ];
    const discoveryHeaders = publicRoutes.map((source) => ({
      source,
      headers: [{ key: "Link", value: discoveryLinks }],
    }));

    // Edge-cacheable responses for routes Next renders dynamically (and would
    // otherwise send as `private, no-store`). Lifetimes are deliberately short:
    // the homepage falls back to an empty list when the backend is down, and a
    // CDN must never pin that state for long (see expireTime above).
    const edgeCacheHeaders = [
      {
        source: "/",
        // Cloudflare does not key its HTML cache on Next's RSC request header.
        missing: [{ type: "header" as const, key: "rsc" }],
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=120, stale-while-revalidate=300" },
        ],
      },
      {
        source: "/sitemap.xml",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, s-maxage=3600, stale-while-revalidate=3600" },
        ],
      },
      {
        source: "/llms.txt",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400" },
        ],
      },
    ];

    return [
      { source: "/:path*", headers: PUBLIC_SECURITY_HEADERS },
      ...discoveryHeaders,
      ...edgeCacheHeaders,
      // ISR pages also emit cacheable RSC payloads. Cloudflare ignores the
      // RSC Vary dimension, so all flight responses must bypass its cache.
      {
        source: "/:path*",
        has: [{ type: "header", key: "rsc" }],
        headers: [{ key: "Cache-Control", value: "private, no-store" }],
      },
    ];
  },
  } : {}),
  images: {
    ...(staticExport ? { unoptimized: true } : {}),
    dangerouslyAllowLocalIP: false,
    maximumRedirects: 0,
    maximumResponseBody: 12 * 1024 * 1024,
    remotePatterns: [
      ...PUBLIC_NEXT_IMAGE_HOST_PATTERNS.map((hostname) => ({
        protocol: "https" as const,
        hostname,
      })),
    ],
  },
};

export default nextConfig;
