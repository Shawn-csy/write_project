import type { Metadata } from "next";
import { apiFetch } from "@/lib/api";
import { GalleryClient } from "./GalleryClient";
import { LiveGalleryClient } from "./LiveGalleryClient";
import { parseGalleryUrlState } from "@write/public-ui/server";
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
import { EMPTY_HOMEPAGE_BUNDLE, parseHomepageBundle, type HomepageBundle, type HomepageBundleResponse } from "@/lib/homepageBundle";

// Phase 2: force-dynamic prevents build-time empty homepage when backend is unavailable.
// The page reads `searchParams` (server-parsed filter state), so it cannot be ISR.
// Instead the bundle fetch below goes through Next's data cache, and next.config.ts
// gives the HTML a short edge lifetime (s-maxage) so most hits never reach this render.
export const dynamic = process.env.CF_STATIC_EXPORT === "1" ? "force-static" : "force-dynamic";

const STATIC_EXPORT = process.env.CF_STATIC_EXPORT === "1";

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

async function fetchBundle(): Promise<HomepageBundle> {
  let bundle: HomepageBundleResponse;
  try {
    bundle = await apiFetch<HomepageBundleResponse>("/public-bundle", { next: { revalidate: BUNDLE_REVALIDATE_SECONDS, tags: BUNDLE_FETCH_TAGS } });
  } catch (error) {
    // A static build must never bake an empty homepage into the deployed site.
    if (STATIC_EXPORT) throw error;
    // Network/backend failure: scripts unavailable. Log for production diagnosis.
    console.error("[homepage] fetchBundle: /public-bundle request failed — serving empty homepage");
    return EMPTY_HOMEPAGE_BUNDLE;
  }
  return parseHomepageBundle(bundle);
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { scripts: initialScripts, externalPublicScripts, bannerSlides, showBrandHero } = await fetchBundle();

  // A static Pages export cannot read request search params. The client hook
  // reads the current URL after hydration; the normal Next deployment keeps
  // its server-parsed initial state for a no-flash first render.
  const rawParams = process.env.CF_STATIC_EXPORT === "1" ? {} : await searchParams;
  const qs = new URLSearchParams(Object.entries(rawParams).flatMap(([k, v]) =>
    v === undefined ? [] : Array.isArray(v) ? v.map((val) => [k, val]) : [[k, v]]
  )).toString();
  const initialUrlState = parseGalleryUrlState(qs);

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE_URL}/#website`,
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
      {STATIC_EXPORT ? (
        <LiveGalleryClient
          scripts={initialScripts}
          externalPublicScripts={externalPublicScripts}
          bannerSlides={bannerSlides}
          showBrandHero={showBrandHero}
          initialUrlState={initialUrlState}
        />
      ) : (
        <GalleryClient
          initialScripts={initialScripts}
          initialExternalPublicScripts={externalPublicScripts}
          initialBannerSlides={bannerSlides}
          showBrandHero={showBrandHero}
          initialUrlState={initialUrlState}
        />
      )}
    </>
  );
}
