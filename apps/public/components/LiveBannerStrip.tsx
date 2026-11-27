"use client";

import { useEffect, useState } from "react";
import { parseBannerSlides, type HeroSlide } from "@write/public-ui";
import { withLocalHomepagePreview } from "@/app/gallery/localHomepagePreview";
import { buildHomepageHeroSlides } from "@/app/gallery/homepageHeroModel";
import { HomepageBannerStrip } from "@/app/gallery/HomepageBannerStrip";
import { readPublicBundle } from "@/lib/readPublicBundle";

const EMPTY_SLIDES: HeroSlide[] = [];

/** Refresh static snapshots on entry, at Taipei midnight and when returning to a tab. */
export function LiveBannerStrip({
  slides = EMPTY_SLIDES,
  fallbackSlides = EMPTY_SLIDES,
  placement,
  showBrandHero = true,
}: {
  showBrandHero?: boolean;
  slides?: HeroSlide[];
  fallbackSlides?: HeroSlide[];
  placement: "homepage" | "demos" | "audio-works";
}) {
  const [current, setCurrent] = useState(slides);
  const [loaded, setLoaded] = useState(slides.length > 0);
  const [localPreview, setLocalPreview] = useState(false);
  useEffect(() => {
    setLocalPreview(process.env.NODE_ENV === "development" && ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname));
  }, []);
  useEffect(() => setCurrent(slides), [slides]);
  useEffect(() => {
    let active = true;
    const section = placement === "homepage" ? "banner" : placement === "demos" ? "demoBanner" : "audioWorkBanner";
    const refresh = () => {
      void readPublicBundle<Record<string, unknown>>([section]).then(({ data }) => {
        if (active) {
          setCurrent(parseBannerSlides(data[section]) || []);
          setLoaded(true);
        }
      }).catch(() => {
        if (active) setLoaded(true);
      });
    };
    refresh();
    let midnight: number;
    const schedule = () => {
      const taipeiNow = Date.now() + 8 * 3600000;
      const next = (Math.floor(taipeiNow / 86400000) + 1) * 86400000 - taipeiNow;
      midnight = window.setTimeout(() => { if (document.visibilityState === "visible") refresh(); schedule(); }, next + 1000);
    };
    schedule();
    const visible = () => { if (document.visibilityState === "visible") refresh(); };
    document.addEventListener("visibilitychange", visible);
    return () => { active = false; window.clearTimeout(midnight); document.removeEventListener("visibilitychange", visible); };
  }, [placement]);
  const placementSlides = current.filter((slide) => !slide.placement || slide.placement === placement);
  const visibleSlides = placement === "homepage"
    ? buildHomepageHeroSlides(placementSlides, showBrandHero)
    : placementSlides.length > 0
      ? placementSlides
      : loaded
        ? fallbackSlides
        : EMPTY_SLIDES;
  return <HomepageBannerStrip slides={placement === "homepage" ? withLocalHomepagePreview(visibleSlides, localPreview) : visibleSlides} />;
}
