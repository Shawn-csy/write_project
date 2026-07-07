const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://open-scripts.shawnup.com").replace(/\/$/, "");

export const SITE_BRAND_NAME = "泛用型產品作坊";
export const PRODUCT_NAME = "Screenplay Reader";
export const SITE_NAME = SITE_BRAND_NAME;
export const TITLE_SUFFIX = SITE_BRAND_NAME;
export const SITE_TITLE = `免費台本 · 音聲台本線上閱讀｜${TITLE_SUFFIX}`;
export const SITE_DESCRIPTION =
  "泛用型產品作坊提供免費台本、音聲台本與配音台本線上閱讀、發布與分享，探索公開作品、作者頁面與系列作品。";
export const SITE_KEYWORDS = [
  "免費台本",
  "音聲台本",
  "免費音聲台本",
  "聲音台本",
  "配音台本",
  "ASMR 台本",
  "ASMR劇本",
  "聲劇台本",
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

export { jsonLdSafe } from "./jsonLd";
