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
    expect(img).toHaveAttribute("referrerpolicy", "no-referrer");
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

  it("gives static cards local and external thumbnails with their existing fallback URL", async () => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_STATIC_EXPORT", "1");
    vi.stubEnv("NEXT_PUBLIC_API_ORIGIN", "https://api.example");
    vi.stubEnv("NEXT_PUBLIC_MEDIA_ORIGIN", "https://media.example");
    vi.stubEnv("NEXT_PUBLIC_MEDIA_FALLBACK_ORIGIN", "https://r2.example");
    try {
      const { PublicImage: StaticImage } = await import("./PublicImage");
      const local = "https://media.example/media/u/cover.webp";
      const external = "https://r2.example/media/external-public-scripts/entry";
      render(<>
        <StaticImage src={local} alt="local" preset="script-cover" resizeStatic eager sizes="120px" />
        <StaticImage src={external} alt="external" preset="script-cover" resizeStatic />
      </>);
      const localImage = screen.getByAltText("local");
      expect(localImage.getAttribute("src")).toMatch(/^https:\/\/api\.example\/api\/public-media\/[\w-]+\.webp\?w=360$/);
      expect(localImage).toHaveAttribute("data-media-original", local);
      expect(localImage).toHaveAttribute("loading", "eager");
      expect(localImage).toHaveAttribute("sizes", "120px");
      const externalImage = screen.getByAltText("external");
      expect(externalImage.getAttribute("srcset")).toContain("https://api.example/api/public-media/external/entry.webp?w=240 240w");
      expect(externalImage).toHaveAttribute("data-media-original", external);
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
