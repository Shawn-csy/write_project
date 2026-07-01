"use client";

import { useState, useEffect } from "react";
import { BrandScriptDesk } from "./BrandScriptDesk";

const DESKTOP_MQ = "(min-width: 640px)";

/**
 * Brand hero slide content — renders inside PublicHeroMarquee's carousel frame.
 * No outer <section> or height control: the carousel container owns dimensions.
 * BrandScriptDesk is conditionally mounted only on desktop (min-width:640px)
 * so mobile does not pay the component + Anime.js cost at all.
 */
export function GalleryBrandHeroSlide() {
  const [isDesktop, setIsDesktop] = useState(false);

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

      <div className="relative z-10 h-full flex flex-col justify-center mx-auto max-w-5xl px-6 sm:px-8 py-10 sm:py-14">
        {/* Eyebrow */}
        <p className="hero-reveal editorial-eyebrow mb-3 text-[10px] font-semibold tracking-[0.22em] uppercase" style={{ animationDelay: "0ms" }}>
          公開台本平台
        </p>

        {/* Main headline */}
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold leading-[1.15] text-foreground">
          <span className="hero-reveal block" style={{ animationDelay: "80ms" }}>
            嘗試、閱讀、創作
          </span>
          <span className="hero-reveal relative inline-block text-primary" style={{ animationDelay: "160ms" }}>
            公開台本
            <span className="absolute left-0 bottom-[0.08em] w-full editorial-accent-rule" aria-hidden />
          </span>
        </h1>

        {/* Sub-copy — hidden on mobile to keep hero compact */}
        <p className="hero-reveal hidden sm:block mt-4 max-w-lg text-sm sm:text-base leading-relaxed text-muted-foreground" style={{ animationDelay: "240ms" }}>
          探索公開作品、配音台本與各種奇妙的東西。
        </p>

        {/* Decorative rule — hidden on mobile */}
        <div className="hero-reveal hidden sm:flex mt-6 items-center gap-5" style={{ animationDelay: "320ms" }}>
          <div className="h-px flex-1 max-w-[3rem] editorial-rule" aria-hidden />
          <span className="editorial-dim text-[11px] tracking-[0.15em] uppercase">
            自由創作・開放分享
          </span>
        </div>
      </div>
    </div>
  );
}
