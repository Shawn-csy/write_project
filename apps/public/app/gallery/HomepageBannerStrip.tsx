"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { HeroSlide } from "@write/public-ui";
import { PublicImage } from "@/components/PublicImage";
import { GalleryBrandHeroSlide } from "./GalleryBrandHeroSlide";
import { BRAND_SLIDE } from "./homepageHeroModel";

/**
 * Homepage promotion strip with a shared height and each image at its native ratio.
 * Images with lettering stay whole, and adjacent banners meet without empty gutters.
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

function BannerImage({ src, alt, eager }: { src: string; alt: string; eager: boolean }) {
  const image = URL.canParse(src) ? new URL(src) : undefined;
  if (image?.origin !== "https://pbs.twimg.com" || !/^\/media\/[^/]+$/.test(image.pathname)
      || !["medium", "large", "orig"].includes(image.searchParams.get("name") ?? "")) {
    return <PublicImage src={src} alt={alt} preset="hero-banner" objectFit="contain" eager={eager} sizes="(min-width: 640px) 720px, 90vw" />;
  }

  image.searchParams.set("name", "360x360");
  const thumbnail = image.href;
  image.searchParams.set("name", "small");
  return (
    <img
      key={src}
      src={thumbnail}
      srcSet={`${thumbnail} 1x, ${image.href} 2x`}
      data-media-original={src}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      decoding="async"
      referrerPolicy="no-referrer"
      className="absolute inset-0 h-full w-full object-contain"
      onError={(event) => {
        const element = event.currentTarget;
        if (element.getAttribute("src") === src) return;
        delete element.dataset.mediaFailed;
        element.removeAttribute("srcset");
        element.src = src;
      }}
    />
  );
}

export function HomepageBannerStrip({ slides }: { slides: HeroSlide[] }) {
  const [, setNow] = useState(() => Date.now());
  const trackRef = useRef<HTMLDivElement>(null);
  const [paddingCycles, setPaddingCycles] = useState(1);
  const [imageRatios, setImageRatios] = useState<Record<string, number>>({});
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

  // Cached images can finish loading before React attaches onLoadCapture.
  // Read their dimensions after hydration so the first visible cycle also fits.
  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const ratios: Record<string, number> = {};
    for (const image of track.querySelectorAll("img")) {
      const src = image.closest<HTMLElement>("[data-banner-src]")?.dataset.bannerSrc;
      if (src && image.naturalWidth && image.naturalHeight) ratios[src] = image.naturalWidth / image.naturalHeight;
    }
    if (Object.keys(ratios).length) {
      setImageRatios((current) => Object.entries(ratios).every(([src, ratio]) => current[src] === ratio)
        ? current : { ...current, ...ratios });
    }
  }, [slides]);

  // Visual copies allow native touch scrolling in either direction. Only the
  // original cycle has semantic headings and focusable links.
  const tileAt = (index: number) => trackRef.current?.children[index] as HTMLElement | undefined;
  const cycleWidth = () => {
    const first = tileAt(0), next = tileAt(count);
    return first && next ? next.offsetLeft - first.offsetLeft : 0;
  };
  const nearestTile = () => {
    const track = trackRef.current;
    if (!track) return -1;
    const tiles = Array.from(track.children) as HTMLElement[];
    let best = 0;
    for (let i = 1; i < tiles.length; i++) {
      if (Math.abs(tiles[i].offsetLeft - track.scrollLeft) < Math.abs(tiles[best].offsetLeft - track.scrollLeft)) best = i;
    }
    return best;
  };
  const move = (direction: number) => {
    const track = trackRef.current;
    if (!track) return;
    const target = tileAt(Math.min(Math.max(nearestTile() + direction, 0), track.children.length - 1));
    if (target) track.scrollTo({ left: target.offsetLeft, behavior: reducedMotion ? "auto" : "smooth" });
  };

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !looping) return;
    let settleTimer: number;
    const base = () => cycleWidth() * paddingCycles;
    const reset = () => {
      const cycle = cycleWidth();
      if (cycle > 0) setPaddingCycles(Math.max(1, Math.ceil(track.clientWidth / cycle)));
      const original = tileAt(count * paddingCycles);
      if (original) track.scrollLeft = original.offsetLeft;
    };
    const normalize = () => {
      const cycle = cycleWidth();
      if (!cycle) return;
      // Reposition only after scrolling settles, to an identical visual copy.
      const phase = ((track.scrollLeft - base()) % cycle + cycle) % cycle;
      track.scrollLeft = base() + (Math.abs(phase - cycle) < 1 ? 0 : phase);
    };
    const update = () => {
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
  }, [count, looping, paddingCycles, imageRatios]);

  useEffect(() => {
    if (!looping || hovered || focused || dragging || hidden || reducedMotion) return;
    const timer = window.setInterval(() => move(1), 4000);
    return () => window.clearInterval(timer);
  }, [looping, hovered, focused, dragging, hidden, reducedMotion]);

  if (count === 0) return null;
  const tileClass = "relative h-40 shrink-0 snap-start";
  const arrowClass = "absolute top-1/2 z-10 hidden h-12 w-7 -translate-y-1/2 items-center justify-center bg-black/55 text-white hover:bg-black/75 sm:flex";
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
          className={`flex snap-x snap-mandatory gap-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${looping ? "" : "justify-center"}`}>
          {cycles.flatMap((cycle) => banners.map((banner, index) => {
            const ratio = banner.src ? imageRatios[banner.src] ?? 3 : 3;
            const width = `${Math.round(160 * ratio)}px`;
            const tileStyle = { width, "--public-banner-tile-width": width } as React.CSSProperties;
            const onImageLoad = (event: React.SyntheticEvent<HTMLElement>) => {
              if (!banner.src || !(event.target instanceof HTMLImageElement)) return;
              const image = event.target;
              if (image.naturalWidth && image.naturalHeight) {
                const next = image.naturalWidth / image.naturalHeight;
                setImageRatios((current) => current[banner.src] === next ? current : { ...current, [banner.src]: next });
              }
            };
            const duplicate = cycle !== "original";
            const body = banner.brand ? (
              <GalleryBrandHeroSlide duplicate={duplicate} slide={{ ...BRAND_SLIDE, title: banner.title, content: banner.content, eyebrow: banner.eyebrow }} />
            ) : banner.src ? (
              <BannerImage src={banner.src} alt={duplicate ? "" : banner.alt} eager={!duplicate && index < 3} />
            ) : (
              <span className="absolute inset-0 flex flex-col justify-center bg-band px-5 text-white">
                <span className="line-clamp-2 text-lg font-bold sm:text-xl">{banner.title}</span>
                {banner.content && <span className="mt-1 line-clamp-2 text-xs text-white/85 sm:text-sm">{banner.content}</span>}
              </span>
            );
            if (duplicate) return (
              <div key={`${cycle}-${banner.key}`} aria-hidden="true" data-banner-copy={cycle}
                className={`${tileClass} overflow-hidden bg-card ${banner.link ? "cursor-pointer hover:opacity-90" : ""}`}
                style={tileStyle} data-banner-src={banner.src || undefined} onLoadCapture={onImageLoad}
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
                className={`${tileClass} block overflow-hidden bg-card hover:opacity-90`} style={tileStyle} data-banner-src={banner.src || undefined} onLoadCapture={onImageLoad}>
                {body}
              </a>
            ) : (
              <div key={`${cycle}-${banner.key}`} data-banner-index={index} className={`${tileClass} overflow-hidden bg-card`} style={tileStyle} data-banner-src={banner.src || undefined} onLoadCapture={onImageLoad}>{body}</div>
            );
          }))}
        </div>
        {looping && <>
          <button type="button" aria-label="上一張橫幅" onClick={() => move(-1)} className={`${arrowClass} public-arrow-motion public-arrow-back left-0`}>
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <button type="button" aria-label="下一張橫幅" onClick={() => move(1)} className={`${arrowClass} public-arrow-motion public-arrow-forward right-0`}>
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
        </>}
      </div>
    </section>
  );
}
