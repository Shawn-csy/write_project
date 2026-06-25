/**
 * HeroImage — art-direction-aware hero banner renderer for PublicHeroMarquee.
 *
 * Renders a single PublicImage node whose crop is chosen by viewport breakpoint:
 *   <768px   (mobile)     → mobileCrop ?? crop
 *   768–1535px (desktop)  → desktopCrop ?? crop
 *   ≥1536px (ultra-wide)  → ultraWideCrop ?? desktopCrop ?? crop
 *
 * Uses matchMedia so only one <img> element is in the DOM at any time.
 * No hydration mismatch: component is only used inside "use client" parents.
 *
 * blur-fill mode: a blurred, heavily scaled background copy of the same image
 * fills edge areas that the focal crop cannot cover at extreme aspect ratios.
 * The background is visible because the primary image uses object-fit: cover
 * and is fully opaque — blur-fill is only meaningful when the container is
 * wider than the source image's natural composition allows. Authors should
 * set blur-fill alongside an ultraWideCrop that frames the subject tightly.
 *
 * Phase 10 of docs/public-media-presentation-architecture.md
 */
"use client";

import { useEffect, useState } from "react";
import type { MediaCropLike } from "@write/media-crop";
import { PublicImage } from "./PublicImage";

interface HeroImagePlacement {
  url: string;
  alt?: string;
  crop?: MediaCropLike | null;
  mobileCrop?: MediaCropLike | null;
  desktopCrop?: MediaCropLike | null;
  ultraWideCrop?: MediaCropLike | null;
  backgroundMode?: "cover" | "blur-fill";
}

type Breakpoint = "mobile" | "desktop" | "ultrawide";

function getBreakpoint(): Breakpoint {
  if (typeof window === "undefined") return "desktop";
  if (window.matchMedia("(min-width: 1536px)").matches) return "ultrawide";
  if (window.matchMedia("(min-width: 768px)").matches) return "desktop";
  return "mobile";
}

function resolveCrop(image: HeroImagePlacement, bp: Breakpoint): MediaCropLike | null | undefined {
  if (bp === "mobile") return image.mobileCrop ?? image.crop;
  if (bp === "ultrawide") return image.ultraWideCrop ?? image.desktopCrop ?? image.crop;
  return image.desktopCrop ?? image.crop;
}

interface Props {
  image: HeroImagePlacement;
  priority?: boolean;
  /** Slide title — fallback alt text when image.alt is absent */
  slideTitle?: string;
}

export function HeroImage({ image, priority, slideTitle }: Props) {
  const [bp, setBp] = useState<Breakpoint>(() => getBreakpoint());

  useEffect(() => {
    const mqlUltrawide = window.matchMedia("(min-width: 1536px)");
    const mqlDesktop = window.matchMedia("(min-width: 768px)");

    const update = () => setBp(getBreakpoint());

    mqlUltrawide.addEventListener("change", update);
    mqlDesktop.addEventListener("change", update);
    return () => {
      mqlUltrawide.removeEventListener("change", update);
      mqlDesktop.removeEventListener("change", update);
    };
  }, []);

  const activeCrop = resolveCrop(image, bp);
  const alt = image.alt || slideTitle || "";
  const blurFill = image.backgroundMode === "blur-fill";

  return (
    <>
      {/* blur-fill background: blurred, oversized copy fills edge areas.
          Only useful when the primary image's composition leaves dark/empty
          edges at ultra-wide ratios. Set alongside ultraWideCrop. */}
      {blurFill && (
        <PublicImage
          src={image.url}
          alt=""
          preset="hero-banner"
          crop={image.ultraWideCrop ?? image.desktopCrop ?? image.crop}
          priority={priority}
          className="scale-[1.4] blur-xl opacity-50 object-cover"
        />
      )}
      <PublicImage
        src={image.url}
        alt={alt}
        preset="hero-banner"
        crop={activeCrop}
        priority={priority}
      />
    </>
  );
}
