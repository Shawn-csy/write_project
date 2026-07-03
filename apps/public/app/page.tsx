import type { Metadata } from "next";
import { apiFetch } from "@/lib/api";
import type { PublicScript } from "@/lib/types";
import { GalleryClient } from "./GalleryClient";
import type { HeroSlide } from "@write/public-ui/server";
import { parseBannerSlides, parseGalleryUrlState } from "@write/public-ui/server";
import { BASE_URL, PRODUCT_NAME, SITE_NAME, SITE_TITLE, SITE_DESCRIPTION, DEFAULT_OG_IMAGE_URL } from "@/lib/seo";
import { JsonLdScript } from "@/lib/jsonLd";

// Phase 2: force-dynamic prevents build-time empty homepage when backend is unavailable.
// Switch to ISR (export const revalidate = N) only after deploy scripts revalidate / on backend health.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
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
  banner?: unknown;
  homepageConfig?: {
    /** When false, suppresses the brand hero slide (e.g. if a full-bleed banner covers it). */
    showBrandHero?: boolean;
  };
}

async function fetchBundle(): Promise<{ scripts: PublicScript[]; bannerSlides: HeroSlide[] | undefined; showBrandHero: boolean }> {
  let bundle: BundleResponse;
  try {
    bundle = await apiFetch<BundleResponse>("/public-bundle");
  } catch {
    // Network/backend failure: scripts unavailable. Log for production diagnosis.
    console.error("[homepage] fetchBundle: /public-bundle request failed — serving empty homepage");
    return { scripts: [], bannerSlides: undefined, showBrandHero: true };
  }

  // Parse each field independently so a malformed banner cannot erase the script list.
  const scripts = (bundle.scripts ?? []).filter((s): s is PublicScript => Boolean(s?.id));

  let bannerSlides: HeroSlide[] | undefined;
  try {
    bannerSlides = parseBannerSlides(bundle.banner);
  } catch {
    console.error("[homepage] fetchBundle: banner parse failed — omitting banners");
  }

  const showBrandHero = bundle.homepageConfig?.showBrandHero !== false;

  return { scripts, bannerSlides, showBrandHero };
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ scripts: initialScripts, bannerSlides, showBrandHero }, rawParams] = await Promise.all([
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
    alternateName: [PRODUCT_NAME, "公開台本"],
    url: `${BASE_URL}/`,
    description: SITE_DESCRIPTION,
    inLanguage: "zh-Hant",
    potentialAction: {
      "@type": "SearchAction",
      target: `${BASE_URL}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <JsonLdScript data={structuredData} />
      <GalleryClient
        initialScripts={initialScripts}
        initialBannerSlides={bannerSlides}
        showBrandHero={showBrandHero}
        initialUrlState={initialUrlState}
      />
    </>
  );
}
