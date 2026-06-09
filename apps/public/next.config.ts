import type { NextConfig } from "next";
import path from "path";

const engineSrc = path.resolve(__dirname, "../../packages/script-engine/src");

const nextConfig: NextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@script-engine": engineSrc,
    };
    return config;
  },
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
