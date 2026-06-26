"use client";

import { BrandScriptSea } from "./BrandScriptSea";

/**
 * Brand hero slide content — renders inside PublicHeroMarquee's carousel frame.
 * No outer <section> or height control: the carousel container owns dimensions.
 */
export function GalleryBrandHeroSlide() {
  return (
    <div className="absolute inset-0 overflow-hidden bg-background" data-testid="brand-hero-slide">
      <div className="absolute inset-0 pointer-events-none editorial-brand-hero-backdrop" data-testid="brand-hero-backdrop" aria-hidden />
      <BrandScriptSea />

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
            探索、閱讀、分享
          </span>
          <span className="hero-reveal relative inline-block text-primary" style={{ animationDelay: "160ms" }}>
            創作台本
            <span className="absolute left-0 bottom-[0.08em] w-full editorial-accent-rule" aria-hidden />
          </span>
        </h1>

        {/* Sub-copy */}
        <p className="hero-reveal mt-4 max-w-lg text-sm sm:text-base leading-relaxed text-muted-foreground" style={{ animationDelay: "240ms" }}>
          探索公開作品、配音台本與作者頁面。
        </p>

        {/* Decorative rule */}
        <div className="hero-reveal mt-6 flex items-center gap-5" style={{ animationDelay: "320ms" }}>
          <div className="h-px flex-1 max-w-[3rem] editorial-rule" aria-hidden />
          <span className="editorial-dim text-[11px] tracking-[0.15em] uppercase">
            自由創作・開放分享
          </span>
        </div>
      </div>
    </div>
  );
}
