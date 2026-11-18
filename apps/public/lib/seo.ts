import type { Metadata } from "next";

const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://open-scripts.shawnup.com").replace(/\/$/, "");

export const SITE_BRAND_NAME = "泛用型產品作坊";
export const PRODUCT_NAME = "Screenplay Reader";
export const SITE_NAME = SITE_BRAND_NAME;
export const SITE_SEARCH_NAME = "公開台本";
export const TITLE_SUFFIX = SITE_BRAND_NAME;
export const SITE_TITLE = `${SITE_SEARCH_NAME}｜免費音聲、ASMR 與配音台本`;
export const SITE_DESCRIPTION =
  "公開台本平台能提供公開、免費音聲、ASMR 與配音台本，可按作者或系列找作品，也能試聽演出 Demo、查詢聲演與製作資源。";
export const SITE_KEYWORDS = [
  "免費台本",
  "音聲台本",
  "免費音聲台本",
  "聲音台本",
  "配音台本",
  "ASMR 台本",
  "ASMR劇本",
  "廣播劇劇本",
  "劇本線上閱讀",
  "公開台本",
  "台本投稿",
];
export { BASE_URL };
export const DEFAULT_OG_IMAGE_PATH = "/og/homepage.png";
// NEXT_PUBLIC_DEFAULT_OG_IMAGE_URL must be an absolute URL (https://...).
// Use it to point to a DB-hosted image before /og/homepage.png is ready.
// e.g. NEXT_PUBLIC_DEFAULT_OG_IMAGE_URL=https://open-scripts.shawnup.com/media/some-banner.jpg
// Relative values are normalized to absolute using BASE_URL.
const _rawDefaultOgImage =
  process.env.NEXT_PUBLIC_DEFAULT_OG_IMAGE_URL ||
  DEFAULT_OG_IMAGE_PATH;
export const DEFAULT_OG_IMAGE_URL =
  _rawDefaultOgImage.startsWith("http://") || _rawDefaultOgImage.startsWith("https://")
    ? _rawDefaultOgImage
    : `${BASE_URL}${_rawDefaultOgImage.startsWith("/") ? "" : "/"}${_rawDefaultOgImage}`;

/** Converts a relative path or existing absolute URL to an absolute URL. */
export function absoluteUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return DEFAULT_OG_IMAGE_URL;
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) return pathOrUrl;
  return `${BASE_URL}${pathOrUrl.startsWith("/") ? "" : "/"}${pathOrUrl}`;
}

/** Returns entity image if provided, otherwise the default OG image. Both are absolute URLs. */
export function pickPreviewImage(entityImage?: string | null): string {
  if (entityImage) return absoluteUrl(entityImage);
  return DEFAULT_OG_IMAGE_URL;
}

export function publicDirectoryMetadata(path: string, title: string, description: string): Metadata {
  const url = absoluteUrl(path);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      title,
      description,
      url,
      siteName: SITE_SEARCH_NAME,
      locale: "zh_TW",
      images: [{ url: DEFAULT_OG_IMAGE_URL, alt: SITE_SEARCH_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [DEFAULT_OG_IMAGE_URL],
    },
  };
}

export { jsonLdSafe } from "./jsonLd";
