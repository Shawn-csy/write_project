import { Suspense } from "react";
import type { Metadata } from "next";
import { apiFetch } from "@/lib/api";
import type { PublicScript } from "@/lib/types";
import { GalleryClient } from "./GalleryClient";
import type { HeroSlide } from "@write/public-ui/server";
import { parseBannerSlides } from "@write/public-ui/server";
import { BASE_URL, SITE_NAME, SITE_TITLE, SITE_DESCRIPTION, DEFAULT_OG_IMAGE_URL, pickPreviewImage } from "@/lib/seo";

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
}

async function fetchBundle(): Promise<{ scripts: PublicScript[]; bannerSlides: HeroSlide[] | undefined }> {
  try {
    const bundle = await apiFetch<BundleResponse>("/public-bundle");
    return {
      scripts: (bundle.scripts ?? []).filter((s): s is PublicScript => Boolean(s?.id)),
      bannerSlides: parseBannerSlides(bundle.banner),
    };
  } catch {
    return { scripts: [], bannerSlides: undefined };
  }
}

export default async function HomePage() {
  const { scripts: initialScripts, bannerSlides } = await fetchBundle();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData)
            .replace(/</g, "\\u003c")
            .replace(/>/g, "\\u003e")
            .replace(/&/g, "\\u0026"),
        }}
      />
      {/* Static script list for crawlers (hidden visually; GalleryClient renders the real UI) */}
      <noscript>
        <main style={{ maxWidth: 900, margin: "0 auto", padding: "2rem", fontFamily: "serif" }}>
          <h1>公開台本列表｜Screenplay Reader</h1>
          <p>免費瀏覽、閱讀與分享創作台本。</p>
          <ul>
            {initialScripts.slice(0, 100).map((s) => (
              <li key={s.id}>
                <a href={`/read/${s.id}`}>{s.title}</a>
                {s.synopsis && <span> — {s.synopsis.slice(0, 80)}</span>}
              </li>
            ))}
          </ul>
        </main>
      </noscript>
      <Suspense fallback={null}>
        <GalleryClient initialScripts={initialScripts} initialBannerSlides={bannerSlides} />
      </Suspense>
    </>
  );
}
