import type { NextConfig } from "next";
import path from "path";
import { PUBLIC_NEXT_IMAGE_HOST_PATTERNS } from "./lib/publicImageOrigins";

// ── Image origins ─────────────────────────────────────────────────────────────
// 1. Backend /media/ paths: apiFetch resolves them to absolute backend URLs at
//    the data boundary (server → client). remotePatterns allows the backend
//    hostname; dangerouslyAllowLocalIP permits Docker-internal private IPs.
// 2. Known external image origins are allowlisted for next/image. Unknown
//    user-provided external URLs render through PublicImage's plain <img>
//    fallback instead of turning the optimizer into an open proxy.

const backendUrl = process.env.BACKEND_API_URL || "http://localhost:1091";

function parseBackendPattern(): { protocol: "http" | "https"; hostname: string; port?: string } {
  try {
    const u = new URL(backendUrl);
    const protocol = u.protocol === "https:" ? "https" : "http";
    return {
      protocol,
      hostname: u.hostname,
      ...(u.port && { port: u.port }),
    };
  } catch {
    return { protocol: "http", hostname: "localhost", port: "1091" };
  }
}

const backendPattern = parseBackendPattern();

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  // ISR 頁面的 Cache-Control 由 Next 依下列公式產生：
  //   s-maxage=<revalidate>, stale-while-revalidate=<expireTime - revalidate>
  // expireTime 預設是 31536000（一年），代表快取過期後 CDN 仍可供應舊版本將近一年。
  // 2026-08-20 資料庫事故期間，三篇台本頁的 404 就是被 Cloudflare 以這個視窗鎖住，
  // 源站修好後訪客仍持續看到錯誤頁。
  // 收斂為 7200：各路由 revalidate 皆為 3600，故 stale-while-revalidate 也是 3600，
  // 最壞情況的內容陳舊時間從一年降到約兩小時。
  expireTime: 7200,
  transpilePackages: ["@write/browser-download", "@write/media-crop", "@write/public-ui", "@write/reader-export", "@write/script-engine", "@write/script-reader-renderer", "@write/script-reader-ui"],
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
    return publicRoutes.map((source) => ({
      source,
      headers: [{ key: "Link", value: discoveryLinks }],
    }));
  },
  images: {
    // Backend runs on Docker-internal network (private IP). next/image blocks
    // private IPs by default; allow them since this is trusted infra.
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      // Backend media (Docker-internal origin)
      {
        protocol: backendPattern.protocol,
        hostname: backendPattern.hostname,
        ...(backendPattern.port && { port: backendPattern.port }),
        pathname: "/media/**",
      },
      ...PUBLIC_NEXT_IMAGE_HOST_PATTERNS.map((hostname) => ({
        protocol: "https" as const,
        hostname,
      })),
    ],
  },
};

export default nextConfig;
