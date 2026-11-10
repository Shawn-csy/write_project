import { expect, it } from "vitest";
import nextConfig from "./next.config";

it("keeps the server-side image optimizer away from private networks and redirects", () => {
  const images = nextConfig.images;
  expect(images?.dangerouslyAllowLocalIP).toBe(false);
  expect(images?.maximumRedirects).toBe(0);
  expect(images?.maximumResponseBody).toBeLessThanOrEqual(12 * 1024 * 1024);
  expect(images?.remotePatterns).not.toContainEqual(
    expect.objectContaining({ hostname: "write_project-backend" }),
  );
});
