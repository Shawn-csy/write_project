import type { HeroSlide } from "@write/public-ui/server";
import { parseBannerSlides } from "@write/public-ui/server";
import type { ExternalPublicScript, PublicScript } from "./types";
import { slimExternalScriptForHomepage, slimScriptForHomepage } from "./galleryProjection";

export interface HomepageBundleResponse {
  scripts?: PublicScript[];
  externalPublicScripts?: ExternalPublicScript[];
  banner?: unknown;
  homepageConfig?: {
    /** When false, suppresses the brand hero slide (e.g. if a full-bleed banner covers it). */
    showBrandHero?: boolean;
  };
}

export interface HomepageBundle {
  scripts: PublicScript[];
  externalPublicScripts: ExternalPublicScript[];
  bannerSlides: HeroSlide[] | undefined;
  showBrandHero: boolean;
}

export const EMPTY_HOMEPAGE_BUNDLE: HomepageBundle = {
  scripts: [],
  externalPublicScripts: [],
  bannerSlides: undefined,
  showBrandHero: true,
};

/**
 * Turns a /public-bundle response into what the homepage renders. Shared by the
 * server render and the browser refresh so both show the same thing.
 *
 * Each field is parsed independently so a malformed banner cannot erase the
 * script list. Scripts are slimmed because everything passed to the client
 * component is serialized into the HTML.
 */
export function parseHomepageBundle(bundle: HomepageBundleResponse): HomepageBundle {
  const scripts = (bundle.scripts ?? []).filter((s): s is PublicScript => Boolean(s?.id)).map(slimScriptForHomepage);
  const externalPublicScripts = (bundle.externalPublicScripts ?? [])
    .filter((item): item is ExternalPublicScript => Boolean(item?.id && item?.sourceUrl))
    .map(slimExternalScriptForHomepage);

  let bannerSlides: HeroSlide[] | undefined;
  try {
    bannerSlides = parseBannerSlides(bundle.banner);
  } catch {
    console.error("[homepage] parseHomepageBundle: banner parse failed — omitting banners");
  }

  return {
    scripts,
    externalPublicScripts,
    bannerSlides,
    showBrandHero: bundle.homepageConfig?.showBrandHero !== false,
  };
}
