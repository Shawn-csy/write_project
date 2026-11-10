import type { HeroSlide } from "@write/public-ui/server";
import { parseBannerSlides } from "@write/public-ui/server";
import type { ActivityPage, ExternalPublicScript, PublicDemoSubmission, PublicOrg, PublicPersona, PublicScript } from "./types";
import type { PublicBundleSection } from "./publicBundleProjection";

export type HomepageActivity = Pick<ActivityPage, "id" | "slug" | "title" | "summary" | "coverUrl" | "coverCrop" | "sortOrder" | "publishedAt">;
import { slimExternalScriptForHomepage, slimScriptForHomepage } from "./galleryProjection";

export const HOMEPAGE_BUNDLE_SECTIONS = [
  "scripts", "externalPublicScripts", "personas", "organizations",
  "activityPages", "demoSubmissions", "banner",
] as const satisfies readonly PublicBundleSection[];

/** The script gallery does not render public identity directories until their tab opens. */
export const HOMEPAGE_SCRIPT_BUNDLE_SECTIONS = [
  "scripts", "externalPublicScripts", "activityPages", "demoSubmissions", "banner",
] as const satisfies readonly PublicBundleSection[];

export interface HomepageBundleResponse {
  scripts?: PublicScript[];
  externalPublicScripts?: ExternalPublicScript[];
  personas?: PublicPersona[];
  organizations?: PublicOrg[];
  activityPages?: ActivityPage[];
  demoSubmissions?: PublicDemoSubmission[];
  banner?: unknown;
  homepageConfig?: {
    /** When false, suppresses the brand hero slide (e.g. if a full-bleed banner covers it). */
    showBrandHero?: boolean;
  };
}

export interface HomepageBundle {
  scripts: PublicScript[];
  externalPublicScripts: ExternalPublicScript[];
  personas: PublicPersona[];
  organizations: PublicOrg[];
  activities: HomepageActivity[];
  bannerSlides: HeroSlide[] | undefined;
  showBrandHero: boolean;
}

export const EMPTY_HOMEPAGE_BUNDLE: HomepageBundle = {
  scripts: [],
  externalPublicScripts: [],
  personas: [],
  organizations: [],
  activities: [],
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
  const demoSubmissions = Array.isArray(bundle.demoSubmissions) ? bundle.demoSubmissions : [];
  const internalDemoIds = new Set(demoSubmissions.filter((demo) => demo.scriptType === "internal" && demo.scriptId).map((demo) => demo.scriptId));
  const externalDemoIds = new Set(demoSubmissions.filter((demo) => demo.scriptType === "external" && demo.externalScriptId).map((demo) => demo.externalScriptId));
  const scripts = (bundle.scripts ?? []).filter((s): s is PublicScript => Boolean(s?.id))
    .map((script) => slimScriptForHomepage({ ...script, hasDemo: script.hasDemo || internalDemoIds.has(script.id) }));
  const externalPublicScripts = (bundle.externalPublicScripts ?? [])
    .filter((item): item is ExternalPublicScript => Boolean(item?.id && item?.sourceUrl))
    .map((item) => slimExternalScriptForHomepage({ ...item, hasDemo: item.hasDemo || externalDemoIds.has(item.id) }));

  let bannerSlides: HeroSlide[] | undefined;
  try {
    bannerSlides = parseBannerSlides(bundle.banner);
  } catch {
    console.error("[homepage] parseHomepageBundle: banner parse failed — omitting banners");
  }

  return {
    scripts,
    externalPublicScripts,
    personas: Array.isArray(bundle.personas) ? bundle.personas : [],
    organizations: Array.isArray(bundle.organizations) ? bundle.organizations : [],
    activities: (Array.isArray(bundle.activityPages) ? bundle.activityPages : [])
      .filter((page) => page?.status === "published" && page.slug && page.title)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0) || (b.publishedAt || 0) - (a.publishedAt || 0))
      .map(({ id, slug, title, summary, coverUrl, coverCrop, sortOrder, publishedAt }) => ({ id, slug, title, summary, coverUrl, coverCrop, sortOrder, publishedAt })),
    bannerSlides,
    showBrandHero: bundle.homepageConfig?.showBrandHero !== false,
  };
}
