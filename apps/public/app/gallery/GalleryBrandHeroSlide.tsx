"use client";

import { useState, useEffect } from "react";
import { BrandScriptDesk } from "./BrandScriptDesk";
import { BRAND_SLIDE, type BrandHeroSlide } from "./homepageHeroModel";

const DESKTOP_MQ = "(min-width: 640px)";

/**
 * Brand hero slide content — renders inside PublicHeroMarquee's carousel frame.
 * No outer <section> or height control: the carousel container owns dimensions.
 * BrandScriptDesk is conditionally mounted only on desktop (min-width:640px)
 * so mobile does not render the decorative scene.
 */
export function GalleryBrandHeroSlide({ slide }: { slide?: BrandHeroSlide }) {
  const [isDesktop, setIsDesktop] = useState(false);
  const title = slide?.title || "配音、閱讀、創作公開台本";
  const titleParts = title.split("公開台本");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia(DESKTOP_MQ);
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden bg-background" data-testid="brand-hero-slide">
      <div className="absolute inset-0 pointer-events-none editorial-brand-hero-backdrop" data-testid="brand-hero-backdrop" aria-hidden />
      <div data-testid="brand-script-desk-wrapper" aria-hidden>
        {isDesktop && <BrandScriptDesk />}
      </div>

      {/* Decorative ruled lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        <div className="absolute left-0 right-0 top-[3.5rem]" style={{ height: "1px", background: "hsl(var(--border) / 0.35)" }} />
        <div className="absolute left-0 right-0 top-[3.7rem]" style={{ height: "1px", background: "hsl(var(--border) / 0.15)" }} />
      </div>

      {/* Fine grain texture */}
      <div className="absolute inset-0 pointer-events-none editorial-grain" aria-hidden />

      <div className="relative z-10 h-full flex flex-col justify-center mx-auto max-w-5xl px-5 sm:px-8 py-3 sm:py-10">
        <p className="mb-1.5 text-primary [font-size:var(--public-font-caption)] font-semibold tracking-widest sm:mb-3">{slide?.eyebrow || BRAND_SLIDE.eyebrow}</p>
        {/* Main headline */}
        <h1 className="text-xl sm:text-4xl lg:text-5xl font-serif font-bold leading-[1.15] text-foreground">
          {titleParts.length === 2 ? (
            <>
              <span className="hero-reveal block" style={{ animationDelay: "80ms" }}>
                {titleParts[0]}
              </span>
              <span className="hero-reveal relative inline-block text-primary" style={{ animationDelay: "160ms" }}>
                公開台本{titleParts[1]}
                <span className="absolute left-0 bottom-[0.08em] w-full editorial-accent-rule" aria-hidden />
              </span>
            </>
          ) : (
            <span className="hero-reveal block" style={{ animationDelay: "80ms" }}>
              {title}
            </span>
          )}
        </h1>
        <p className="mt-2 max-w-xl whitespace-pre-line line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:mt-4 sm:text-sm">{slide?.content || BRAND_SLIDE.content}</p>
      </div>
    </div>
  );
}
