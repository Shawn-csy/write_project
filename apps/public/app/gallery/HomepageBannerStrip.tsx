"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroSlide } from "@write/public-ui";
import { PublicImage } from "@/components/PublicImage";
import { GalleryBrandHeroSlide } from "./GalleryBrandHeroSlide";
import { BRAND_SLIDE } from "./homepageHeroModel";

/**
 * Homepage promotion strip, laid out the way doujin storefronts do it: fixed 3:1
 * tiles side by side on a wide screen, one tile with the next one peeking on a phone.
 * Each image is shown whole — a banner with lettering must never be cropped — so
 * artwork should be made at 3:1 (1500×500).
 */

interface Banner {
  key: string;
  src: string;
  alt: string;
  link: string;
  title: string;
  content: string;
  eyebrow: string;
  brand: boolean;
}

function toBanners(slides: HeroSlide[]): Banner[] {
  return slides.map((slide, index) => ({
    key: String(slide.id ?? index),
    src: slide.image?.url || slide.imageUrl || "",
    alt: slide.image?.alt || slide.title || "",
    link: /^(https?:\/\/|\/(?!\/))/.test((slide.link || "").trim()) && !/[\\\s\x00-\x1f]/.test(slide.link || "") ? (slide.link || "").trim() : "",
    title: (slide.title || "").trim(),
    content: (slide.content || slide.subtitle || "").trim(),
    eyebrow: slide.eyebrow || "",
    brand: String(slide.id) === "brand-intro",
  })).filter((banner) => banner.src || banner.title);
}

function isExternal(link: string) {
  return /^https?:\/\//i.test(link);
}

export function HomepageBannerStrip({ slides }: { slides: HeroSlide[] }) {
  const [, setNow] = useState(() => Date.now());
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [paddingCycles, setPaddingCycles] = useState(1);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [hidden, setHidden] = useState(false);
  const today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
  const banners = toBanners(slides.filter((slide) => (!slide.startDate || slide.startDate <= today) && (!slide.endDate || slide.endDate >= today)));
  const count = banners.length;
  const looping = count > 1;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const preference = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedMotion(Boolean(preference?.matches));
    const updateVisibility = () => setHidden(document.visibilityState === "hidden");
    const release = () => setDragging(false);
    updateMotion();
    updateVisibility();
    preference?.addEventListener("change", updateMotion);
    document.addEventListener("visibilitychange", updateVisibility);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      preference?.removeEventListener("change", updateMotion);
      document.removeEventListener("visibilitychange", updateVisibility);
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, []);

  // Visual copies allow native touch scrolling in either direction. Only the
  // original cycle has semantic headings and focusable links.
  const stride = () => {
    const track = trackRef.current;
    const first = track?.children[0] as HTMLElement | undefined;
    const second = track?.children[1] as HTMLElement | undefined;
    if (!first) return 0;
    return second && second.offsetLeft > first.offsetLeft
      ? second.offsetLeft - first.offsetLeft
      : first.offsetWidth + 2;
  };
  const move = (direction: number) => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollBy({ left: direction * stride(), behavior: reducedMotion ? "auto" : "smooth" });
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !looping) { setActive(0); return; }
    let settleTimer: number;
    const base = () => stride() * count * paddingCycles;
    const reset = () => {
      const cycle = stride() * count;
      if (cycle > 0) setPaddingCycles(Math.max(1, Math.ceil(track.clientWidth / cycle)));
      track.scrollLeft = base();
      setActive(0);
    };
    const updateActive = () => {
      const index = Math.round((track.scrollLeft - base()) / stride());
      setActive(((index % count) + count) % count);
    };
    const normalize = () => {
      const cycle = stride() * count;
      if (!cycle) return;
      // Wait for the gesture/animation to finish before moving to an identical
      // copy. Writing scrollLeft during smooth scrolling would cancel it.
      const phase = ((track.scrollLeft - base()) % cycle + cycle) % cycle;
      track.scrollLeft = base() + (Math.abs(phase - cycle) < 1 ? 0 : phase);
      updateActive();
    };
    const update = () => {
      updateActive();
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(normalize, 150);
    };
    reset();
    track.addEventListener("scroll", update, { passive: true });
    track.addEventListener("scrollend", normalize);
    window.addEventListener("resize", reset);
    return () => {
      window.clearTimeout(settleTimer);
      track.removeEventListener("scroll", update);
      track.removeEventListener("scrollend", normalize);
      window.removeEventListener("resize", reset);
    };
  }, [count, looping, paddingCycles]);

  useEffect(() => {
    if (!looping || hovered || focused || dragging || hidden || reducedMotion) return;
    const timer = window.setInterval(() => move(1), 4000);
    return () => window.clearInterval(timer);
  }, [looping, hovered, focused, dragging, hidden, reducedMotion]);

  if (count === 0) return null;
  const tileClass = looping
    ? "relative aspect-[3/1] w-[88%] shrink-0 snap-start sm:w-[30rem]"
    : "relative aspect-[3/1] w-full max-w-[45rem] shrink-0";
  const arrowClass = "absolute top-1/2 z-10 hidden h-12 w-7 -translate-y-1/2 items-center justify-center bg-black/55 text-white hover:bg-black/75 sm:flex";
  const goTo = (index: number) => {
    const track = trackRef.current;
    if (track) track.scrollTo({ left: (count * paddingCycles + index) * stride(), behavior: reducedMotion ? "auto" : "smooth" });
  };
  const cycles = looping
    ? Array.from({ length: paddingCycles * 2 + 1 }, (_, index) => index === paddingCycles ? "original" : `copy-${index}`)
    : ["original"];

  return (
    <section aria-label="公告與活動橫幅" className="border-b border-border bg-muted" data-testid="homepage-banner-strip"
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setFocused(false); }}
      onPointerDown={() => setDragging(true)}>
      <div className="relative">
        <div ref={trackRef} data-testid="banner-track"
          className={`flex snap-x snap-mandatory gap-0.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${looping ? "" : "justify-center"}`}>
          {cycles.flatMap((cycle) => banners.map((banner, index) => {
            const duplicate = cycle !== "original";
            const body = banner.brand ? (
              <GalleryBrandHeroSlide duplicate={duplicate} slide={{ ...BRAND_SLIDE, title: banner.title, content: banner.content, eyebrow: banner.eyebrow }} />
            ) : banner.src ? (
              <PublicImage src={banner.src} alt={duplicate ? "" : banner.alt} preset="hero-banner" objectFit="contain" eager={!duplicate && index < 3} sizes="(min-width: 640px) 720px, 90vw" />
            ) : (
              <span className="absolute inset-0 flex flex-col justify-center bg-band px-5 text-white">
                <span className="line-clamp-2 text-lg font-bold sm:text-xl">{banner.title}</span>
                {banner.content && <span className="mt-1 line-clamp-2 text-xs text-white/85 sm:text-sm">{banner.content}</span>}
              </span>
            );
            if (duplicate) return (
              <div key={`${cycle}-${banner.key}`} aria-hidden="true" data-banner-copy={cycle}
                className={`${tileClass} overflow-hidden bg-card ${banner.link ? "cursor-pointer hover:opacity-90" : ""}`}
                onClick={() => {
                  // A visible visual copy can activate its one semantic link;
                  // it never adds a duplicate tab stop or heading.
                  if (banner.link) (trackRef.current?.querySelector(`[data-banner-index="${index}"]`) as HTMLAnchorElement | null)?.click();
                }}>
                {body}
              </div>
            );
            return banner.link ? (
              <a key={`${cycle}-${banner.key}`} data-banner-index={index}
                href={banner.link} target={isExternal(banner.link) ? "_blank" : undefined}
                rel={isExternal(banner.link) ? "noopener noreferrer" : undefined}
                aria-label={banner.alt || banner.title || `橫幅 ${index + 1}`}
                className={`${tileClass} block overflow-hidden bg-card hover:opacity-90`}>
                {body}
              </a>
            ) : (
              <div key={`${cycle}-${banner.key}`} data-banner-index={index} className={`${tileClass} overflow-hidden bg-card`}>{body}</div>
            );
          }))}
        </div>
        {looping && <>
          <button type="button" aria-label="上一張橫幅" onClick={() => move(-1)} className={`${arrowClass} left-0`}>
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button type="button" aria-label="下一張橫幅" onClick={() => move(1)} className={`${arrowClass} right-0`}>
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </>}
      </div>
      {looping && (
        <div className="flex items-center justify-center gap-1.5 py-2">
          {banners.map((banner, index) => (
            <button key={banner.key} type="button" aria-label={`第 ${index + 1} 張橫幅`} aria-current={index === active}
              onClick={() => goTo(index)} className={`h-2 w-2 rounded-full ${index === active ? "bg-primary" : "bg-border"}`} />
          ))}
        </div>
      )}
    </section>
  );
}
