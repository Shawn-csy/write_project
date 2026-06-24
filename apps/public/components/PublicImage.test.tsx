import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PublicImage } from "./PublicImage";

vi.mock("next/image", () => ({
  default: ({ src, alt, className }: { src: string; alt: string; className?: string }) => (
    <img data-next-image="true" src={src} alt={alt} className={className} />
  ),
}));

describe("PublicImage", () => {
  it("uses next/image for allowlisted external images", () => {
    render(
      <div className="relative h-20 w-20">
        <PublicImage
          src="https://avatars.githubusercontent.com/u/1"
          alt="avatar"
          preset="avatar"
        />
      </div>
    );

    expect(screen.getByAltText("avatar")).toHaveAttribute("data-next-image", "true");
  });

  it("falls back to plain img for unknown external images", () => {
    render(
      <div className="relative h-20 w-20">
        <PublicImage
          src="https://example.com/user-upload.jpg"
          alt="external"
          preset="script-cover"
        />
      </div>
    );

    const img = screen.getByAltText("external");
    expect(img).not.toHaveAttribute("data-next-image");
    expect(img).toHaveAttribute("src", "https://example.com/user-upload.jpg");
  });
});
