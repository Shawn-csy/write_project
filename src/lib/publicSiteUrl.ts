const PRODUCTION_PUBLIC_ORIGIN = "https://open-scripts.shawnup.com";
const DEV_PUBLIC_ORIGIN = "https://dev-open-scripts.shawnup.com";

/** Origin of the public site that pairs with the studio host serving this page. */
export function publicSiteOrigin(hostname: string = typeof window === "undefined" ? "" : window.location.hostname): string {
  return hostname.startsWith("studio-dev-") ? DEV_PUBLIC_ORIGIN : PRODUCTION_PUBLIC_ORIGIN;
}

/** Absolute URL of a public-site path, e.g. publicSiteUrl("/author/x"). */
export function publicSiteUrl(path: string, hostname?: string): string {
  return `${publicSiteOrigin(hostname)}${path.startsWith("/") ? path : `/${path}`}`;
}
