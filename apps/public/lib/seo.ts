const BASE_URL = (process.env.NEXT_PUBLIC_BASE_URL ?? "https://open-scripts.shawnup.com").replace(/\/$/, "");

export const SITE_NAME = "公開台本｜Screenplay Reader";
export const SITE_TITLE = "免費台本 · 劇本線上閱讀｜Screenplay Reader";
export const SITE_DESCRIPTION = "免費瀏覽、閱讀與分享創作台本，探索公開作品、配音台本與作者頁面。";
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

/** Escapes a JSON-LD payload for safe inline <script> injection. */
export function jsonLdSafe(payload: unknown): string {
  return JSON.stringify(payload)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
