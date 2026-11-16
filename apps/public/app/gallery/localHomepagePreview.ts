import type { HeroSlide } from "@write/public-ui";

export const LOCAL_AUDIO_BANNER_ID = "local-preview-audio-works";

/** Local development copy only; never writes to a published banner setting. */
export function withLocalHomepagePreview(slides: HeroSlide[], enabled: boolean): HeroSlide[] {
  if (!enabled || slides.some((slide) => slide.id === LOCAL_AUDIO_BANNER_ID || slide.link === "/audio-works")) return slides;
  const result = [...slides];
  result.splice(Math.min(2, result.length), 0, {
    id: LOCAL_AUDIO_BANNER_ID,
    title: "探索音聲作品",
    content: "發現聲演與創作團隊的音聲作品，前往原始平台收聽。",
    link: "/audio-works",
  });
  return result;
}
