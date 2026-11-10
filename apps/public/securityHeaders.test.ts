import { describe, expect, it } from "vitest";
import nextConfig from "./next.config";
import { PUBLIC_SECURITY_HEADERS } from "./securityHeaders.mjs";

describe("public site security headers", () => {
  it("enforces frame protection and starts CSP and HSTS with limited scope", () => {
    const headers = new Map(PUBLIC_SECURITY_HEADERS.map(({ key, value }) => [key, value]));
    expect(headers.get("Content-Security-Policy")).toBe("frame-ancestors 'none'");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Content-Security-Policy-Report-Only")).toContain("script-src 'self'");
    expect(headers.get("Strict-Transport-Security")).toBe("max-age=2592000");
  });

  it("applies the shared headers to every Next.js path", async () => {
    expect(nextConfig.headers).toBeDefined();
    const routes = await nextConfig.headers!();
    expect(routes).toContainEqual({ source: "/:path*", headers: PUBLIC_SECURITY_HEADERS });
  });

  it("keeps RSC homepage responses out of the public HTML cache", async () => {
    const routes = await nextConfig.headers!();
    const homepageCache = routes.find((route) =>
      route.source === "/" && route.headers.some((header) => header.key === "Cache-Control")
    );
    expect(homepageCache?.missing).toContainEqual({ type: "header", key: "rsc" });
    expect(routes).toContainEqual({
      source: "/:path*",
      has: [{ type: "header", key: "rsc" }],
      headers: [{ key: "Cache-Control", value: "private, no-store" }],
    });
  });
});
