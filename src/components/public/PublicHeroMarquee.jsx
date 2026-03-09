import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { useI18n } from "../../contexts/I18nContext";

const DEFAULT_SLIDES = [
  {
    id: "placeholder-1",
    title: "Marquee Placeholder A",
    subtitle: "可替換成活動宣傳圖、公告、主題企劃。",
    className:
      "from-[#e7f4ff] via-[#f2fbff] to-[#fff9f2] dark:from-[#16314b] dark:via-[#13313c] dark:to-[#3b2a1e]",
  },
  {
    id: "placeholder-2",
    title: "Marquee Placeholder B",
    subtitle: "可放最新上架、徵稿中、站內公告等資訊。",
    className:
      "from-[#f6f1ff] via-[#fff2f7] to-[#fff8e7] dark:from-[#2d1f4a] dark:via-[#3a2036] dark:to-[#3a2d18]",
  },
  {
    id: "placeholder-3",
    title: "Marquee Placeholder C",
    subtitle: "之後可接後台資料，改為可管理的輪播素材。",
    className:
      "from-[#e9fff7] via-[#edf9ff] to-[#f4f2ff] dark:from-[#133a33] dark:via-[#15303f] dark:to-[#2a2450]",
  },
];

export function PublicHeroMarquee({ slides = DEFAULT_SLIDES, intervalMs = 4500, fallbackToDefault = true }) {
  const { t } = useI18n();
  const safeSlides = Array.isArray(slides) && slides.length > 0
    ? slides
    : (fallbackToDefault ? DEFAULT_SLIDES : []);
  if (safeSlides.length === 0) return null;
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (safeSlides.length <= 1 || isPaused) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % safeSlides.length);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [intervalMs, isPaused, safeSlides.length]);

  const goTo = (nextIndex) => {
    const bounded = ((nextIndex % safeSlides.length) + safeSlides.length) % safeSlides.length;
    setActiveIndex(bounded);
  };

  return (
    <section className="w-full border-b border-border/60 bg-background/50">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5">
        <div
          className="relative overflow-hidden rounded-xl border border-border/70"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          <div className="relative aspect-[3.6/1] min-h-[120px] sm:min-h-[160px]">
            {safeSlides.map((slide, index) => (
              <div
                key={slide.id || index}
                className={cn(
                  "absolute inset-0 bg-gradient-to-r p-4 sm:p-6 transition-opacity duration-500",
                  slide.className || "from-[#e7f4ff] via-[#f2fbff] to-[#fff9f2] dark:from-[#16314b] dark:via-[#13313c] dark:to-[#3b2a1e]",
                  activeIndex === index ? "opacity-100" : "opacity-0 pointer-events-none",
                  String(slide.link || "").trim() ? "cursor-pointer" : ""
                )}
              >
                {String(slide.link || "").trim() && (
                  <a
                    href={String(slide.link || "").trim()}
                    className="absolute inset-0 z-10"
                    aria-label={slide.title || t("publicGallery.marqueeTitle", "跑馬燈區塊")}
                  />
                )}
                {String(slide.imageUrl || "").trim() && (
                  <>
                    <img
                      src={String(slide.imageUrl || "").trim()}
                      alt={slide.title || "banner"}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-black/30" />
                  </>
                )}
                <div className="flex h-full items-end">
                  <div className="relative z-20 max-w-xl rounded-lg border border-white/30 bg-white/65 px-3 py-2 backdrop-blur dark:border-white/15 dark:bg-black/35">
                    <p className="text-sm sm:text-base font-semibold text-foreground">
                      {slide.title || t("publicGallery.marqueeTitle", "跑馬燈區塊")}
                    </p>
                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                      {slide.subtitle || slide.content || t("publicGallery.marqueeSubtitle", "可在此放置圖片輪播。")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="absolute inset-y-0 left-2 z-30 flex items-center">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full bg-background/70"
              onClick={() => goTo(activeIndex - 1)}
              aria-label={t("publicGallery.marqueePrev", "上一張")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
          <div className="absolute inset-y-0 right-2 z-30 flex items-center">
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-8 w-8 rounded-full bg-background/70"
              onClick={() => goTo(activeIndex + 1)}
              aria-label={t("publicGallery.marqueeNext", "下一張")}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="absolute bottom-2 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5">
            {safeSlides.map((slide, index) => (
              <button
                key={`dot-${slide.id || index}`}
                type="button"
                className={cn(
                  "h-1.5 rounded-full bg-white/80 transition-all",
                  activeIndex === index ? "w-5" : "w-2.5 opacity-60"
                )}
                onClick={() => goTo(index)}
                aria-label={t("publicGallery.marqueeJump", "切換到第 {index} 張").replace("{index}", String(index + 1))}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
