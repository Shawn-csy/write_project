import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GalleryBrandHeroSlide } from "./GalleryBrandHeroSlide";

describe("GalleryBrandHeroSlide", () => {
  it("renders a full-frame backdrop owned by the brand slide", () => {
    render(<GalleryBrandHeroSlide />);
    const slide = screen.getByTestId("brand-hero-slide");
    const backdrop = screen.getByTestId("brand-hero-backdrop");

    expect(slide.className).toContain("absolute");
    expect(slide.className).toContain("inset-0");
    expect(backdrop.className).toContain("absolute");
    expect(backdrop.className).toContain("inset-0");
    expect(backdrop.className).toContain("editorial-brand-hero-backdrop");
  });

  it("keeps the brand copy inside the carousel-owned frame", () => {
    render(<GalleryBrandHeroSlide />);
    expect(screen.getByText("公開台本平台")).toBeTruthy();
    expect(screen.getByText("探索、閱讀、分享")).toBeTruthy();
    expect(screen.getByText("創作台本")).toBeTruthy();
  });
});
