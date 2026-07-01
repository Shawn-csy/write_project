import React from "react";
import { render, screen, act } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { GalleryBrandHeroSlide } from "./GalleryBrandHeroSlide";

function mockMatchMedia(desktopMatches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => {
    const matches = query === "(min-width: 640px)" ? desktopMatches : false;
    return {
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
  });
}

describe("GalleryBrandHeroSlide", () => {
  beforeEach(() => mockMatchMedia(false));

  it("renders slide backdrop", () => {
    render(<GalleryBrandHeroSlide />);
    const slide = screen.getByTestId("brand-hero-slide");
    const backdrop = screen.getByTestId("brand-hero-backdrop");
    expect(slide.className).toContain("absolute");
    expect(slide.className).toContain("inset-0");
    expect(backdrop.className).toContain("absolute");
    expect(backdrop.className).toContain("inset-0");
    expect(backdrop.className).toContain("editorial-brand-hero-backdrop");
  });

  it("keeps brand copy visible on all viewports", () => {
    render(<GalleryBrandHeroSlide />);
    expect(screen.getByText("公開台本平台")).toBeTruthy();
    expect(screen.getByText("嘗試、閱讀、創作")).toBeTruthy();
    expect(screen.getByText("公開台本")).toBeTruthy();
  });

  it("decorative script desk not mounted on mobile (matchMedia returns false)", () => {
    mockMatchMedia(false);
    render(<GalleryBrandHeroSlide />);
    // BrandScriptDesk not mounted — testid absent
    expect(screen.queryByTestId("brand-script-desk")).toBeNull();
  });

  it("decorative script desk mounts on desktop (matchMedia returns true)", async () => {
    mockMatchMedia(true);
    await act(async () => { render(<GalleryBrandHeroSlide />); });
    // BrandScriptDesk mounted and aria-hidden
    const scriptDesk = screen.getByTestId("brand-script-desk");
    expect(scriptDesk.getAttribute("aria-hidden")).toBe("true");
    expect(scriptDesk.className).toContain("pointer-events-none");
  });
});
