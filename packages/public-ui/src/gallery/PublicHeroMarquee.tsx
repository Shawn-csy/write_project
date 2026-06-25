/**
 * PublicHeroMarquee — shared carousel component.
 * No i18n dependency: all labels passed as props with built-in defaults.
 * Uses native <button> instead of shadcn Button to stay dependency-free.
 */
import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroSlide } from "./bannerModel";
import { DEV_PLACEHOLDER_SLIDES } from "./bannerModel";

export type { HeroSlide, HeroSlideBackground } from "./bannerModel";

const DEFAULT_HERO_GRADIENT =
  "from-[#e7f4ff] via-[#f2fbff] to-[#fff9f2] dark:from-[#16314b] dark:via-[#13313c] dark:to-[#3b2a1e]";

/**
 * Returns the Tailwind classes that control the carousel slide frame background.
 * background="none" → neutral bg-background (slide renders its own full-bleed bg).
 * background="default" or unset → standard banner gradient.
 */
function slideFrameClass(slide: HeroSlide): string {
  if (slide.background === "none") return "bg-background";
  return cn("bg-gradient-to-r", slide.className || DEFAULT_HERO_GRADIENT);
}

/**
 * Host-injected image renderer for hero slides.
 * Receives slide image data and slide index; returns a React node.
 * Next.js apps should inject PublicImage with preset="hero-banner".
 * Defaults to plain <img> when not provided.
 */
export type HeroImageRenderer = (
  image: NonNullable<HeroSlide["image"]>,
  slide: HeroSlide,
  index: number
) => React.ReactNode;

/**
 * Host-injected slide content renderer.
 * Called instead of the default text/link content block for every slide.
 * Return null to suppress default content entirely.
 * The defaultContent argument is the component's own rendered output —
 * return it unchanged to use default rendering for that slide.
 */
export type HeroSlideContentRenderer = (
  slide: HeroSlide,
  index: number,
  defaultContent: React.ReactNode
) => React.ReactNode;

export interface PublicHeroMarqueeProps {
  slides?: HeroSlide[];
  intervalMs?: number;
  /**
   * When true, renders DEV_PLACEHOLDER_SLIDES when no backend slides are provided.
   * Default is false. Only set true in Storybook, local dev, or explicit demo pages.
   * Production pages must never pass fallbackToDefault=true.
   */
  fallbackToDefault?: boolean;
  fullBleed?: boolean;
  /** Accessible labels — provide localised strings from host */
  labels?: {
    region?: string;
    prev?: string;
    next?: string;
    jumpTo?: (index: number) => string;
  };
  /**
   * Host renderer for slide images. Inject PublicImage from the Next.js app to
   * use next/image optimization and the hero-banner preset with focal crop.
   * Defaults to plain <img> so the package stays framework-neutral.
   */
  renderImage?: HeroImageRenderer;
  /**
   * Host renderer for slide content overlay (text, links, brand content).
   * Called for every slide. Return defaultContent to keep default rendering,
   * return custom JSX to override (e.g. inject GalleryBrandHeroSlide for
   * brand slides), or return null to suppress content entirely.
   */
  renderSlideContent?: HeroSlideContentRenderer;
}

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function PublicHeroMarquee({
  slides,
  intervalMs = 4500,
  fallbackToDefault = false,
  fullBleed = false,
  labels,
  renderImage,
  renderSlideContent,
}: PublicHeroMarqueeProps): React.JSX.Element | null {
  const safeSlides =
    Array.isArray(slides) && slides.length > 0
      ? slides
      : fallbackToDefault
      ? (DEV_PLACEHOLDER_SLIDES as HeroSlide[])
      : [];

  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  useEffect(() => {
    if (safeSlides.length <= 1 || isPaused) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % safeSlides.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, isPaused, safeSlides.length]);

  if (safeSlides.length === 0) return null;

  const goTo = (nextIndex: number): void => {
    const bounded = ((nextIndex % safeSlides.length) + safeSlides.length) % safeSlides.length;
    setActiveIndex(bounded);
  };

  const visibleSlideIndexes = new Set([
    activeIndex,
    (activeIndex - 1 + safeSlides.length) % safeSlides.length,
    (activeIndex + 1) % safeSlides.length,
  ]);

  const regionLabel = labels?.region ?? "跑馬燈區塊";
  const prevLabel = labels?.prev ?? "上一張";
  const nextLabel = labels?.next ?? "下一張";
  const jumpToLabel = labels?.jumpTo ?? ((i: number) => `切換到第 ${i + 1} 張`);

  return (
    <section className="w-full border-b border-border/60 bg-background/50" aria-label={regionLabel}>
      <div
        className={
          fullBleed
            ? "w-full px-0 py-0"
            : "w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5"
        }
      >
        <div
          className={cn(
            "relative overflow-hidden border border-border/70",
            fullBleed ? "rounded-none border-x-0" : "rounded-xl"
          )}
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div
            className={cn(
              "relative aspect-[3/1] min-h-[140px] sm:min-h-[180px] max-h-[44vh]",
              fullBleed && "min-h-[200px] sm:min-h-[280px] lg:min-h-[340px] max-h-[54vh]"
            )}
          >
            {safeSlides.map((slide, index) =>
              visibleSlideIndexes.has(index) ? (
                <div
                  key={slide.id || index}
                  data-testid="hero-slide-frame"
                  data-active={activeIndex === index ? "true" : undefined}
                  className={cn(
                    "absolute inset-0 p-4 sm:p-6 transition-opacity duration-500",
                    slideFrameClass(slide),
                    activeIndex === index ? "opacity-100" : "opacity-0 pointer-events-none",
                    String(slide.link || "").trim() ? "cursor-pointer" : ""
                  )}
                >
                  {(slide.image?.url || String(slide.imageUrl || "").trim()) && (
                    <>
                      {slide.image?.url && renderImage ? (
                        <div className="absolute inset-0 overflow-hidden">
                          {renderImage(slide.image, slide, index)}
                        </div>
                      ) : (
                        <img
                          src={slide.image?.url || String(slide.imageUrl).trim()}
                          alt={slide.image?.alt || slide.title || "banner"}
                          className="absolute inset-0 h-full w-full object-cover"
                          loading={index === 0 ? "eager" : "lazy"}
                        />
                      )}
                      {(() => {
                        const hasText =
                          String(slide.title || "").trim() ||
                          String(slide.subtitle || slide.content || "").trim();
                        const opacity = slide.overlayOpacity;
                        if (opacity === 0) return null;
                        if (typeof opacity === "number") {
                          return (
                            <div
                              className="absolute inset-0 bg-black pointer-events-none"
                              style={{ opacity: opacity / 100 }}
                            />
                          );
                        }
                        return hasText ? (
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent pointer-events-none" />
                        ) : null;
                      })()}
                    </>
                  )}
                  {/* Text/link content block.
                      renderSlideContent can override per-slide (e.g. brand slide).
                      defaultContent follows standard text+link layout. */}
                  {(() => {
                    const hasTitle = String(slide.title || "").trim();
                    const hasBody = String(slide.subtitle || slide.content || "").trim();
                    const hasLink = String(slide.link || "").trim();

                    const defaultContent: React.ReactNode = (hasTitle || hasBody) ? (
                      <div className="flex h-full items-end pointer-events-none">
                        {hasLink ? (
                          <a
                            href={String(slide.link).trim()}
                            className="relative z-20 max-w-xl rounded-xl border border-white/25 bg-white/60 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-black/40 pointer-events-auto hover:bg-white/75 dark:hover:bg-black/55 transition-all duration-300 shadow-lg shadow-black/10"
                            aria-label={slide.title || regionLabel}
                          >
                            {hasTitle ? (
                              <p className="text-sm sm:text-lg font-bold text-foreground tracking-tight">{slide.title}</p>
                            ) : null}
                            {hasBody ? (
                              <p className="mt-1 text-xs sm:text-sm text-foreground/70 leading-relaxed">{slide.subtitle || slide.content}</p>
                            ) : null}
                          </a>
                        ) : (
                          <div className="relative z-20 max-w-xl rounded-xl border border-white/25 bg-white/60 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-black/40 shadow-lg shadow-black/10">
                            {hasTitle ? (
                              <p className="text-sm sm:text-lg font-bold text-foreground tracking-tight">{slide.title}</p>
                            ) : null}
                            {hasBody ? (
                              <p className="mt-1 text-xs sm:text-sm text-foreground/70 leading-relaxed">{slide.subtitle || slide.content}</p>
                            ) : null}
                          </div>
                        )}
                      </div>
                    ) : hasLink ? (
                      /* No text — full-slide link overlay */
                      <a
                        href={String(slide.link).trim()}
                        className="absolute inset-0 z-10"
                        aria-label={slide.title || regionLabel}
                      />
                    ) : null;

                    return renderSlideContent
                      ? renderSlideContent(slide, index, defaultContent)
                      : defaultContent;
                  })()}
                </div>
              ) : null
            )}
          </div>

          {/* Prev / Next / Dots — only when there are multiple slides to navigate */}
          {safeSlides.length > 1 && (
            <>
              <div className="absolute inset-y-0 left-2 z-30 flex items-center">
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-input bg-background/70 text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => goTo(activeIndex - 1)}
                  aria-label={prevLabel}
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>

              <div className="absolute inset-y-0 right-2 z-30 flex items-center">
                <button
                  type="button"
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-input bg-background/70 text-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  onClick={() => goTo(activeIndex + 1)}
                  aria-label={nextLabel}
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <div className="absolute bottom-2 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5">
                {safeSlides.map((slide, index) => (
                  <button
                    key={`dot-${slide.id || index}`}
                    type="button"
                    className={cn(
                      "inline-flex h-11 w-11 items-center justify-center rounded-full transition-colors hover:bg-white/20",
                      activeIndex === index ? "bg-white/15" : "bg-transparent"
                    )}
                    onClick={() => goTo(index)}
                    aria-label={jumpToLabel(index)}
                  >
                    <span
                      className={cn(
                        "h-1.5 rounded-full bg-white/80 transition-all",
                        activeIndex === index ? "w-5" : "w-2.5 opacity-60"
                      )}
                    />
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
