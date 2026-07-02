import { Suspense } from "react";
import type { Metadata } from "next";
import { apiFetch } from "@/lib/api";
import type { PublicScript } from "@/lib/types";
import { GalleryClient } from "./GalleryClient";
import Loading from "./loading";
import type { HeroSlide } from "@write/public-ui/server";
import { parseBannerSlides } from "@write/public-ui/server";
import { BASE_URL, PRODUCT_NAME, SITE_NAME, SITE_TITLE, SITE_DESCRIPTION, DEFAULT_OG_IMAGE_URL, pickPreviewImage } from "@/lib/seo";
import { JsonLdScript } from "@/lib/jsonLd";

export const revalidate = 300; // 5-min ISR; on-demand revalidation handles real-time updates

export async function generateMetadata(): Promise<Metadata> {
  // Use first banner imageUrl as the homepage OG image when available, otherwise fall back to default.
  let ogImage = DEFAULT_OG_IMAGE_URL;
  try {
    const bundle = await apiFetch<{ banner?: unknown }>("/public-bundle");
    const slides = parseBannerSlides(bundle.banner);
    const bannerImage = slides?.find((s) => s.imageUrl)?.imageUrl;
    if (bannerImage) ogImage = pickPreviewImage(bannerImage);
  } catch { /* noop: metadata falls back to default OG image */ }

  return {
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
      images: [{ url: ogImage, alt: SITE_TITLE, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [ogImage],
    },
  };
}

interface BundleResponse {
  scripts?: PublicScript[];
  banner?: unknown;
  homepageConfig?: {
    /** When false, suppresses the brand hero slide (e.g. if a full-bleed banner covers it). */
    showBrandHero?: boolean;
  };
}

async function fetchBundle(): Promise<{ scripts: PublicScript[]; bannerSlides: HeroSlide[] | undefined; showBrandHero: boolean }> {
  try {
    const bundle = await apiFetch<BundleResponse>("/public-bundle");
    return {
      scripts: (bundle.scripts ?? []).filter((s): s is PublicScript => Boolean(s?.id)),
      bannerSlides: parseBannerSlides(bundle.banner),
      showBrandHero: bundle.homepageConfig?.showBrandHero !== false,
    };
  } catch {
    return { scripts: [], bannerSlides: undefined, showBrandHero: true };
  }
}

export default async function HomePage() {
  const { scripts: initialScripts, bannerSlides, showBrandHero } = await fetchBundle();

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
      <Suspense fallback={<Loading />}>
        <GalleryClient initialScripts={initialScripts} initialBannerSlides={bannerSlides} showBrandHero={showBrandHero} />
      </Suspense>
      {/*
        SSR script list — server-rendered below the client gallery.
        GalleryClient bails out of SSR when useSearchParams triggers
        BAILOUT_TO_CLIENT_SIDE_RENDERING, so without this section the initial HTML
        has no /read/ links for Googlebot. This section is real visible content:
        users who scroll past the gallery find it; Googlebot indexes it naturally.
        No hiding tricks — the section is just further down the page.
      */}
      {initialScripts.length > 0 && (
        <section aria-label="最新公開台本" className="px-4 sm:px-8 py-10 border-t border-border/30">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-4">
            最新公開台本
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
            {initialScripts.slice(0, 12).map((s) => (
              <li key={s.id}>
                <a
                  href={`/read/${s.id}`}
                  className="text-sm text-foreground hover:text-primary hover:underline transition-colors"
                >
                  {s.title}
                </a>
                {s.persona?.displayName && (
                  <span className="text-xs text-muted-foreground ml-1.5">— {s.persona.displayName}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
