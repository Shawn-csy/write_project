const PUBLIC_API_ORIGIN = (process.env.NEXT_PUBLIC_API_ORIGIN ?? "").replace(/\/+$/, "");

/** Resolves public API and media routes to the shared API Worker when configured. */
export function publicApiUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${PUBLIC_API_ORIGIN}${normalizedPath}`;
}

export function isPublicMediaProxySrc(src: string): boolean {
  try {
    return new URL(src, "https://local.invalid").pathname.startsWith("/api/public-media/");
  } catch {
    return false;
  }
}
