import React from "react";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render } from "@testing-library/react";
import type { MediaCropLike } from "@write/media-crop";

// Mock PublicImage — expose crop, objectFit, priority as data attributes
vi.mock("./PublicImage", () => ({
  PublicImage: ({
    src,
    alt,
    crop,
    objectFit,
    priority,
    respectCropZoom,
    className,
  }: {
    src: string;
    alt: string;
    crop?: MediaCropLike | null;
    objectFit?: string;
    priority?: boolean;
    respectCropZoom?: boolean;
    className?: string;
  }) => (
    <img
      src={src}
      alt={alt}
      data-crop={crop ? JSON.stringify(crop) : undefined}
      data-object-fit={objectFit ?? "cover"}
      data-priority={priority ? "true" : undefined}
      data-respect-crop-zoom={respectCropZoom ? "true" : undefined}
      className={className}
    />
  ),
}));

import { HeroImage } from "./HeroImage";

const mobileCrop: MediaCropLike = { cx: -0.5, cy: 0.2, zoom: 1 };
const desktopCrop: MediaCropLike = { cx: 0.3, cy: 0.1, zoom: 1 };
const ultraWideCrop: MediaCropLike = { cx: 0.5, cy: 0.0, zoom: 1 };
const genericCrop: MediaCropLike = { cx: 0.0, cy: 0.0, zoom: 1 };

const baseImage = {
  url: "/media/hero/banner.webp",
  alt: "Hero banner",
};

// ── matchMedia helpers ────────────────────────────────────────────────────────

const mockMql = (matches: boolean) => ({
  matches,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
});

function mockViewport(bp: "mobile" | "desktop" | "ultrawide") {
  vi.spyOn(window, "matchMedia").mockImplementation((query: string) => {
    if (query === "(min-width: 1536px)") return mockMql(bp === "ultrawide") as unknown as MediaQueryList;
    if (query === "(min-width: 768px)") return mockMql(bp !== "mobile") as unknown as MediaQueryList;
    return mockMql(false) as unknown as MediaQueryList;
  });
}

function getForeground(container: HTMLElement) {
  return container.querySelector("img[alt='Hero banner']") as HTMLElement;
}

function getCropAttr(el: HTMLElement): MediaCropLike | null {
  const raw = el.getAttribute("data-crop");
  return raw ? JSON.parse(raw) : null;
}

// ── Crop selection ────────────────────────────────────────────────────────────

describe("HeroImage — crop selection", () => {
  beforeEach(() => mockViewport("desktop"));
  afterEach(() => vi.restoreAllMocks());

  it("uses desktopCrop on desktop viewport", () => {
    const { container } = render(
      <HeroImage image={{ ...baseImage, mobileCrop, desktopCrop, ultraWideCrop, crop: genericCrop }} />
    );
    expect(getCropAttr(getForeground(container))).toEqual(desktopCrop);
  });

  it("uses mobileCrop on mobile viewport", () => {
    mockViewport("mobile");
    const { container } = render(
      <HeroImage image={{ ...baseImage, mobileCrop, desktopCrop, ultraWideCrop, crop: genericCrop }} />
    );
    expect(getCropAttr(getForeground(container))).toEqual(mobileCrop);
  });

  it("uses ultraWideCrop on ultra-wide viewport", () => {
    mockViewport("ultrawide");
    const { container } = render(
      <HeroImage image={{ ...baseImage, mobileCrop, desktopCrop, ultraWideCrop, crop: genericCrop }} />
    );
    expect(getCropAttr(getForeground(container))).toEqual(ultraWideCrop);
  });

  it("falls back desktopCrop → crop when ultraWideCrop absent on ultra-wide", () => {
    mockViewport("ultrawide");
    const { container } = render(
      <HeroImage image={{ ...baseImage, desktopCrop, crop: genericCrop }} />
    );
    expect(getCropAttr(getForeground(container))).toEqual(desktopCrop);
  });

  it("falls back to generic crop when no viewport-specific crop set", () => {
    const { container } = render(
      <HeroImage image={{ ...baseImage, crop: genericCrop }} />
    );
    expect(getCropAttr(getForeground(container))).toEqual(genericCrop);
  });

  it("passes null crop when nothing is set", () => {
    const { container } = render(<HeroImage image={baseImage} />);
    expect(getCropAttr(getForeground(container))).toBeNull();
  });
});

// ── Alt text ──────────────────────────────────────────────────────────────────

describe("HeroImage — alt text", () => {
  beforeEach(() => mockViewport("desktop"));
  afterEach(() => vi.restoreAllMocks());

  it("uses image.alt when present", () => {
    const { container } = render(<HeroImage image={{ url: "/media/x.webp", alt: "Custom alt" }} />);
    expect(container.querySelector("img[alt='Custom alt']")).toBeTruthy();
  });

  it("falls back to slideTitle when image.alt absent", () => {
    const { container } = render(<HeroImage image={{ url: "/media/x.webp" }} slideTitle="My Slide" />);
    expect(container.querySelector("img[alt='My Slide']")).toBeTruthy();
  });

  it("falls back to empty string when both absent", () => {
    const { container } = render(<HeroImage image={{ url: "/media/x.webp" }} />);
    expect(container.querySelector("img[alt='']")).toBeTruthy();
  });
});

// ── blur-fill ─────────────────────────────────────────────────────────────────

describe("HeroImage — blur-fill mode", () => {
  beforeEach(() => mockViewport("desktop"));
  afterEach(() => vi.restoreAllMocks());

  it("renders two images when backgroundMode=blur-fill", () => {
    const { container } = render(
      <HeroImage image={{ ...baseImage, backgroundMode: "blur-fill" }} />
    );
    expect(container.querySelectorAll("img")).toHaveLength(2);
  });

  it("renders one image when backgroundMode is absent", () => {
    const { container } = render(<HeroImage image={baseImage} />);
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });

  it("foreground uses object-fit: contain when blur-fill active", () => {
    const { container } = render(
      <HeroImage image={{ ...baseImage, backgroundMode: "blur-fill" }} />
    );
    expect(getForeground(container).getAttribute("data-object-fit")).toBe("contain");
  });

  it("foreground uses object-fit: cover without blur-fill", () => {
    const { container } = render(<HeroImage image={baseImage} />);
    expect(getForeground(container).getAttribute("data-object-fit")).toBe("cover");
  });

  it("background blur layer is decorative (empty alt)", () => {
    const { container } = render(
      <HeroImage image={{ ...baseImage, backgroundMode: "blur-fill" }} />
    );
    const allImgs = container.querySelectorAll("img");
    const decorative = Array.from(allImgs).find((img) => img.alt === "");
    expect(decorative).toBeTruthy();
  });

  it("background blur layer has blur className", () => {
    const { container } = render(
      <HeroImage image={{ ...baseImage, backgroundMode: "blur-fill" }} />
    );
    const decorative = container.querySelector("img[alt='']") as HTMLElement;
    expect(decorative?.className).toContain("blur-xl");
  });

  it("background blur layer opts into crop zoom", () => {
    const { container } = render(
      <HeroImage image={{ ...baseImage, backgroundMode: "blur-fill" }} />
    );
    const decorative = container.querySelector("img[alt='']") as HTMLElement;
    expect(decorative?.getAttribute("data-respect-crop-zoom")).toBe("true");
  });

  it("background blur layer does NOT receive priority (decorative, not LCP)", () => {
    const { container } = render(
      <HeroImage image={{ ...baseImage, backgroundMode: "blur-fill" }} priority />
    );
    const decorative = container.querySelector("img[alt='']") as HTMLElement;
    expect(decorative?.getAttribute("data-priority")).toBeNull();
  });

  it("foreground receives priority when set", () => {
    const { container } = render(
      <HeroImage image={{ ...baseImage, backgroundMode: "blur-fill" }} priority />
    );
    expect(getForeground(container).getAttribute("data-priority")).toBe("true");
  });

  it("background blur uses ultraWideCrop when available", () => {
    const { container } = render(
      <HeroImage
        image={{ ...baseImage, backgroundMode: "blur-fill", ultraWideCrop, desktopCrop, crop: genericCrop }}
      />
    );
    const decorative = container.querySelector("img[alt='']") as HTMLElement;
    expect(getCropAttr(decorative)).toEqual(ultraWideCrop);
  });
});

// ── Priority ──────────────────────────────────────────────────────────────────

describe("HeroImage — priority prop", () => {
  beforeEach(() => mockViewport("desktop"));
  afterEach(() => vi.restoreAllMocks());

  it("passes priority to foreground image", () => {
    const { container } = render(<HeroImage image={baseImage} priority />);
    expect(getForeground(container).getAttribute("data-priority")).toBe("true");
  });

  it("foreground opts into crop zoom for authored hero placement", () => {
    const { container } = render(<HeroImage image={baseImage} />);
    expect(getForeground(container).getAttribute("data-respect-crop-zoom")).toBe("true");
  });

  it("does not set priority when not provided", () => {
    const { container } = render(<HeroImage image={baseImage} />);
    expect(getForeground(container).getAttribute("data-priority")).toBeNull();
  });
});
