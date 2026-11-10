import type { Metadata } from "next";
import { GalleryClient } from "./GalleryClient";
import { LiveGalleryClient } from "./LiveGalleryClient";
import { parseGalleryUrlState } from "@write/public-ui/server";
import { loadHomepageBundle } from "@/lib/loadHomepageBundle";
import { HOMEPAGE_SCRIPT_BUNDLE_SECTIONS } from "@/lib/homepageBundle";
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

// Phase 2: force-dynamic prevents build-time empty homepage when backend is unavailable.
// The page reads `searchParams` (server-parsed filter state), so it cannot be ISR.
// Instead the bundle fetch below goes through Next's data cache, and next.config.ts
// gives the HTML a short edge lifetime (s-maxage) so most hits never reach this render.
export const dynamic = "force-dynamic";

const STATIC_EXPORT = process.env.CF_STATIC_EXPORT === "1";


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

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // A static Pages export cannot read request search params. The client hook
  // reads the current URL after hydration; the normal Next deployment keeps
  // its server-parsed initial state for a no-flash first render.
  const rawParams = process.env.CF_STATIC_EXPORT === "1" ? {} : await searchParams;
  const qs = new URLSearchParams(Object.entries(rawParams).flatMap(([k, v]) =>
    v === undefined ? [] : Array.isArray(v) ? v.map((val) => [k, val]) : [[k, v]]
  )).toString();
  const initialUrlState = parseGalleryUrlState(qs);
  const preloadPeople = STATIC_EXPORT || initialUrlState.view !== "scripts";
  const { scripts: initialScripts, externalPublicScripts, personas, organizations, activities, bannerSlides, showBrandHero } = await loadHomepageBundle(
    preloadPeople ? undefined : HOMEPAGE_SCRIPT_BUNDLE_SECTIONS,
  );

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
          personas={personas}
          organizations={organizations}
          activities={activities}
          bannerSlides={bannerSlides}
          showBrandHero={showBrandHero}
          initialUrlState={initialUrlState}
        />
      ) : (
        <GalleryClient
          initialScripts={initialScripts}
          initialExternalPublicScripts={externalPublicScripts}
          initialPersonas={preloadPeople ? personas : undefined}
          initialOrganizations={preloadPeople ? organizations : undefined}
          initialActivities={activities}
          initialBannerSlides={bannerSlides}
          showBrandHero={showBrandHero}
          initialUrlState={initialUrlState}
        />
      )}
    </>
  );
}
