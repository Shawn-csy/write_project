import { describe, expect, it } from "vitest";
import { isAllowedPublicNextImageHost, isNextImageOptimizableSrc } from "./publicImageOrigins";

describe("public image origin policy", () => {
  it("allows explicitly trusted external hosts", () => {
    expect(isAllowedPublicNextImageHost("avatars.githubusercontent.com")).toBe(true);
    expect(isAllowedPublicNextImageHost("ci-en.dlsite.com")).toBe(true);
    expect(isAllowedPublicNextImageHost("images.plurk.com")).toBe(true);
  });

  it("does not allow arbitrary external hosts through next/image", () => {
    expect(isAllowedPublicNextImageHost("example.com")).toBe(false);
    expect(isNextImageOptimizableSrc("https://example.com/user-image.jpg")).toBe(false);
  });

  it("allows backend media origin through next/image", () => {
    expect(
      isNextImageOptimizableSrc(
        "http://write_project-backend:1091/media/covers/a.jpg",
        "http://write_project-backend:1091"
      )
    ).toBe(true);
  });

  it("allows relative app assets but rejects invalid strings", () => {
    expect(isNextImageOptimizableSrc("/og/homepage.png")).toBe(true);
    expect(isNextImageOptimizableSrc("cover.jpg")).toBe(false);
  });
});
