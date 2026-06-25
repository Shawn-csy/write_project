/**
 * HeroImage — art-direction-aware hero banner renderer for PublicHeroMarquee.
 *
 * Default mode renders one PublicImage whose crop is chosen by viewport breakpoint:
 *   <768px   (mobile)     → mobileCrop ?? crop
 *   768–1535px (desktop)  → desktopCrop ?? crop
 *   ≥1536px (ultra-wide)  → ultraWideCrop ?? desktopCrop ?? crop
 *
 * Uses matchMedia so default mode keeps one foreground image in the DOM.
 * blur-fill mode renders one decorative background layer plus the foreground.
 * Crop hydration: Next.js App Router may pre-render Client Components on the
 * server, so the initial breakpoint resolves to "desktop" (window is absent).
 * On mobile or ultra-wide viewports the correct crop is applied after hydration
 * — there is a single-frame repaint cost. This is acceptable for hero art
 * direction; the correct long-term solution is CSS custom properties driven by
 * media queries (no JS state needed). Document this if LCP measurements flag it.
 *
 * blur-fill mode:
 *   The foreground image switches to object-fit: contain (letterbox).
 *   A blurred, oversized copy of the same image fills the letterbox bars
 *   behind it, hiding the empty black edges.
 *   Use blur-fill when the source image aspect ratio is narrower than the
 *   hero container at ultra-wide viewports and you prefer a filled look over
 *   a cropped one. Set alongside ultraWideCrop to control which part of the
 *   image the background blur layer emphasises.
 *
 * Hero art direction opts into crop.zoom because homepage banners are authored
 * placements. Other public image placements still ignore zoom by default to
 * avoid accidental blank-space states.
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
    <div className="absolute inset-0 overflow-hidden">
      {/* blur-fill background layer: blurred oversized copy fills letterbox bars.
          Rendered behind the foreground contain image; visible only in the bars
          that object-fit: contain leaves uncovered at the sides or top/bottom. */}
      {blurFill && (
        <PublicImage
          src={image.url}
          alt=""
          preset="hero-banner"
          crop={image.ultraWideCrop ?? image.desktopCrop ?? image.crop}
          respectCropZoom
          className="scale-[1.4] blur-xl opacity-60"
        />
      )}
      {/* Foreground: contain when blur-fill is active (shows full art without
          cropping); cover otherwise (fills container with focal-point crop). */}
      <PublicImage
        src={image.url}
        alt={alt}
        preset="hero-banner"
        crop={activeCrop}
        priority={priority}
        objectFit={blurFill ? "contain" : undefined}
        respectCropZoom
      />
    </div>
  );
}
