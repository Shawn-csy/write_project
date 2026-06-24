import type { NextConfig } from "next";
import path from "path";

// ── Backend media origin ────────────────────────────────────────────────────
// BACKEND_API_URL must be available at build time (Dockerfile ARG → ENV) so
// next/image remotePatterns can whitelist the backend hostname, and at runtime
// so PublicImage can rewrite /media/ paths to absolute URLs.
//
// next/image fetches image sources server-side. Relative /media/ paths resolve
// to localhost:3000 (the Next.js container itself), which has no media handler.
// The fix: PublicImage rewrites /media/… to ${BACKEND_API_URL}/media/… and
// remotePatterns allows that origin. No rewrites() needed.

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
  transpilePackages: ["@write/browser-download", "@write/media-crop", "@write/public-ui", "@write/reader-export", "@write/script-engine", "@write/script-reader-renderer", "@write/script-reader-ui"],
  images: {
    // Backend runs on Docker-internal network (private IP). next/image blocks
    // private IPs by default; allow them since this is trusted infra.
    dangerouslyAllowLocalIP: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "open-scripts.shawnup.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: backendPattern.protocol,
        hostname: backendPattern.hostname,
        ...(backendPattern.port && { port: backendPattern.port }),
        pathname: "/media/**",
      },
    ],
  },
};

export default nextConfig;
