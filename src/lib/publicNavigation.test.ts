import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { _buildPublicHref, getPublicHref, openPublicPath } from "./publicNavigation";

// _buildPublicHref is a pure fn — test without any env mocking.
describe("_buildPublicHref", () => {
  it("returns path unchanged when base is empty", () => {
    expect(_buildPublicHref("", "/read/abc")).toBe("/read/abc");
    expect(_buildPublicHref("", "/")).toBe("/");
  });

  it("prepends base URL to path", () => {
    expect(_buildPublicHref("https://public.example.com", "/org/o456")).toBe(
      "https://public.example.com/org/o456"
    );
  });

  it("strips trailing slash from base before joining", () => {
    expect(_buildPublicHref("https://public.example.com/", "/series/test")).toBe(
      "https://public.example.com/series/test"
    );
  });

  it("handles paths with query strings", () => {
    expect(_buildPublicHref("https://public.example.com", "/?view=authors&authorTag=foo")).toBe(
      "https://public.example.com/?view=authors&authorTag=foo"
    );
  });

  it("normalizes path missing leading slash", () => {
    expect(_buildPublicHref("", "read/abc")).toBe("/read/abc");
    expect(_buildPublicHref("https://public.example.com", "read/abc")).toBe(
      "https://public.example.com/read/abc"
    );
  });
});

// getPublicHref: in test env VITE_PUBLIC_BASE_URL is not set → falls back to relative path.
describe("getPublicHref", () => {
  it("returns relative path in test env (no VITE_PUBLIC_BASE_URL)", () => {
    expect(getPublicHref("/read/abc")).toBe("/read/abc");
    expect(getPublicHref("/author/u123")).toBe("/author/u123");
  });
});

// openPublicPath: verify it sets window.location.href.
describe("openPublicPath", () => {
  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
    Object.defineProperty(window, "location", {
      writable: true,
      value: { href: "" },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      writable: true,
      value: originalLocation,
    });
  });

  it("sets window.location.href to the public path", () => {
    openPublicPath("/author/u123");
    expect(window.location.href).toBe("/author/u123");
  });

  it("sets window.location.href for root handoff", () => {
    openPublicPath("/");
    expect(window.location.href).toBe("/");
  });

  it("sets window.location.href for read path", () => {
    openPublicPath("/read/script-abc");
    expect(window.location.href).toBe("/read/script-abc");
  });
});
