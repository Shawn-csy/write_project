import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type React from "react";
import { PublicImage } from "./PublicImage";

vi.mock("next/image", () => ({
  default: ({
    src,
    alt,
    className,
    style,
  }: {
    src: string;
    alt: string;
    className?: string;
    style?: React.CSSProperties;
  }) => (
    <img data-next-image="true" src={src} alt={alt} className={className} style={style} />
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

  it("ignores crop zoom by default", () => {
    render(
      <div className="relative h-20 w-20">
        <PublicImage
          src="https://avatars.githubusercontent.com/u/1"
          alt="avatar"
          preset="avatar"
          crop={{ cx: 0, cy: 0, zoom: 2 }}
        />
      </div>
    );

    expect(screen.getByAltText("avatar")).not.toHaveStyle({ transform: "scale(2)" });
  });

  it("applies crop zoom when explicitly requested", () => {
    render(
      <div className="relative h-20 w-20">
        <PublicImage
          src="https://avatars.githubusercontent.com/u/1"
          alt="avatar"
          preset="avatar"
          crop={{ cx: 0, cy: 0, zoom: 2 }}
          respectCropZoom
        />
      </div>
    );

    expect(screen.getByAltText("avatar")).toHaveStyle({ transform: "scale(2)" });
  });
});
