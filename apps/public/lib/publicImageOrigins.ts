/**
 * Public image origin policy.
 *
 * Sources in this allowlist are safe to send through next/image's server-side
 * optimizer. Unknown user-provided URLs still render, but PublicImage falls
 * back to a plain <img> so we do not turn the optimizer into an open proxy.
 */

export const PUBLIC_NEXT_IMAGE_HOST_PATTERNS = [
  "open-scripts.shawnup.com",
  "avatars.githubusercontent.com",
  "**.dlsite.com",
  "**.ci-en.jp",
  "**.plurk.com",
] as const;

function matchesHostPattern(hostname: string, pattern: string): boolean {
  const host = hostname.toLowerCase();
  const normalizedPattern = pattern.toLowerCase();
  if (normalizedPattern.startsWith("**.")) {
    const suffix = normalizedPattern.slice(3);
    return host === suffix || host.endsWith(`.${suffix}`);
  }
  return host === normalizedPattern;
}

export function isAllowedPublicNextImageHost(hostname: string): boolean {
  return PUBLIC_NEXT_IMAGE_HOST_PATTERNS.some((pattern) => matchesHostPattern(hostname, pattern));
}

export function isNextImageOptimizableSrc(src: string, backendOrigin = ""): boolean {
  if (!src) return false;
  if (src.startsWith("/")) return true;
  try {
    const url = new URL(src);
    if (backendOrigin) {
      const backend = new URL(backendOrigin);
      if (url.origin === backend.origin) return true;
    }
    if (url.protocol !== "https:") return false;
    return isAllowedPublicNextImageHost(url.hostname);
  } catch {
    return false;
  }
}
