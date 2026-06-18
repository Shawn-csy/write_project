import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  transpilePackages: ["@write/browser-download", "@write/media-crop", "@write/public-ui", "@write/reader-export", "@write/script-engine", "@write/script-reader-renderer", "@write/script-reader-ui"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "open-scripts.shawnup.com",
      },
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
    ],
  },
};

export default nextConfig;
