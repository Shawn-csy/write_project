import React from "react";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GalleryBrandHeroSlide } from "./GalleryBrandHeroSlide";

describe("GalleryBrandHeroSlide", () => {
  it("fills the carousel frame", () => {
    render(<GalleryBrandHeroSlide />);
    const slide = screen.getByTestId("brand-hero-slide");
    expect(slide.className).toContain("absolute");
    expect(slide.className).toContain("inset-0");
  });

  it("keeps brand copy visible on all viewports", () => {
    render(<GalleryBrandHeroSlide />);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("配音、閱讀、創作公開台本");
    expect(screen.getByTestId("brand-hero-slide").querySelector("p.whitespace-pre-line")).toBeTruthy();
    expect(screen.getByRole("heading", { level: 1 }).className).toContain("text-sm");
  });
});
