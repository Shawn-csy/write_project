import type { Metadata } from "next";
import { apiFetch } from "@/lib/api";
import type { PublicScript } from "@/lib/types";
import type { ExternalPublicScript } from "@/lib/types";
import { GalleryClient } from "./GalleryClient";
import type { HeroSlide } from "@write/public-ui/server";
import { parseBannerSlides, parseGalleryUrlState } from "@write/public-ui/server";
import {
  BASE_URL,
  PRODUCT_NAME,
  SITE_NAME,
  SITE_TITLE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  DEFAULT_OG_IMAGE_URL,
} from "@/lib/seo";
import { JsonLdScript } from "@/lib/jsonLd";
import { slimExternalScriptForHomepage, slimScriptForHomepage } from "@/lib/galleryProjection";

// Phase 2: force-dynamic prevents build-time empty homepage when backend is unavailable.
// The page reads `searchParams` (server-parsed filter state), so it cannot be ISR.
// Instead the bundle fetch below goes through Next's data cache, and next.config.ts
// gives the HTML a short edge lifetime (s-maxage) so most hits never reach this render.
export const dynamic = "force-dynamic";

// Tagged so /api/revalidate can expire it explicitly (revalidatePath alone is not
// guaranteed to reach a fetch shared with the sitemap and media routes).
const BUNDLE_REVALIDATE_SECONDS = 300;
const BUNDLE_FETCH_TAGS = ["public-bundle"];

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  alternates: { canonical: `${BASE_URL}/` },
  openGraph: {
    type: "website",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: `${BASE_URL}/`,
    siteName: SITE_NAME,
    locale: "zh_TW",
    images: [{ url: DEFAULT_OG_IMAGE_URL, alt: SITE_TITLE, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [DEFAULT_OG_IMAGE_URL],
  },
};

interface BundleResponse {
  scripts?: PublicScript[];
  externalPublicScripts?: ExternalPublicScript[];
  banner?: unknown;
  homepageConfig?: {
    /** When false, suppresses the brand hero slide (e.g. if a full-bleed banner covers it). */
    showBrandHero?: boolean;
  };
}

async function fetchBundle(): Promise<{ scripts: PublicScript[]; externalPublicScripts: ExternalPublicScript[]; bannerSlides: HeroSlide[] | undefined; showBrandHero: boolean }> {
  let bundle: BundleResponse;
  try {
    bundle = await apiFetch<BundleResponse>("/public-bundle", { next: { revalidate: BUNDLE_REVALIDATE_SECONDS, tags: BUNDLE_FETCH_TAGS } });
  } catch {
    // Network/backend failure: scripts unavailable. Log for production diagnosis.
    console.error("[homepage] fetchBundle: /public-bundle request failed — serving empty homepage");
    return { scripts: [], externalPublicScripts: [], bannerSlides: undefined, showBrandHero: true };
  }

  // Parse each field independently so a malformed banner cannot erase the script list.
  // Slim before handing to the client component: everything passed as a prop is serialized into the HTML.
  const scripts = (bundle.scripts ?? []).filter((s): s is PublicScript => Boolean(s?.id)).map(slimScriptForHomepage);
  const externalPublicScripts = (bundle.externalPublicScripts ?? [])
    .filter((item): item is ExternalPublicScript => Boolean(item?.id && item?.sourceUrl))
    .map(slimExternalScriptForHomepage);

  let bannerSlides: HeroSlide[] | undefined;
  try {
    bannerSlides = parseBannerSlides(bundle.banner);
  } catch {
    console.error("[homepage] fetchBundle: banner parse failed — omitting banners");
  }

  const showBrandHero = bundle.homepageConfig?.showBrandHero !== false;

  return { scripts, externalPublicScripts, bannerSlides, showBrandHero };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ scripts: initialScripts, externalPublicScripts, bannerSlides, showBrandHero }, rawParams] = await Promise.all([
    fetchBundle(),
    searchParams,
  ]);

  // Parse URL state server-side so GalleryClient never needs useSearchParams().
  const qs = new URLSearchParams(
    Object.entries(rawParams).flatMap(([k, v]) =>
      v === undefined ? [] : Array.isArray(v) ? v.map((val) => [k, val]) : [[k, v]]
    )
  ).toString();
  const initialUrlState = parseGalleryUrlState(qs);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: [PRODUCT_NAME, "公開台本", "音聲台本", "配音台本"],
    url: `${BASE_URL}/`,
    description: SITE_DESCRIPTION,
    inLanguage: "zh-Hant",
    // Google retired the sitelinks search box, so no SearchAction here.
    publisher: { "@type": "Organization", name: SITE_NAME, url: `${BASE_URL}/` },
  };

  return (
    <>
      <JsonLdScript data={structuredData} />
      <GalleryClient
        initialScripts={initialScripts}
        initialExternalPublicScripts={externalPublicScripts}
        initialBannerSlides={bannerSlides}
        showBrandHero={showBrandHero}
        initialUrlState={initialUrlState}
      />
    </>
  );
}
