import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { DEFAULT_OG_IMAGE_URL, DEFAULT_OG_IMAGE_PATH } from "../seo";

describe("OG image contract", () => {
  it("default OG image file exists at apps/public/public/og/homepage.png", () => {
    const filePath = resolve(__dirname, "../../public/og/homepage.png");
    expect(existsSync(filePath), `Missing: ${filePath}`).toBe(true);
  });

  it("DEFAULT_OG_IMAGE_PATH is /og/homepage.png", () => {
    expect(DEFAULT_OG_IMAGE_PATH).toBe("/og/homepage.png");
  });

  it("DEFAULT_OG_IMAGE_URL is an absolute URL", () => {
    expect(DEFAULT_OG_IMAGE_URL.startsWith("https://") || DEFAULT_OG_IMAGE_URL.startsWith("http://")).toBe(true);
  });

  it("DEFAULT_OG_IMAGE_URL contains the og/homepage.png path", () => {
    expect(DEFAULT_OG_IMAGE_URL).toContain("/og/homepage.png");
  });
});
