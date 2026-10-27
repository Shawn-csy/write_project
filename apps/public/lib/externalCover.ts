import { mediaOriginsFromEnv } from "./mediaSources";

const STATIC_EXPORT = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

/** Where the cover of an external work should be loaded from, or undefined if it has none. */
export function externalCoverSrc(item: { id: string; coverUrl?: string | null }): string | undefined {
  if (!item.coverUrl) return undefined;
  if (STATIC_EXPORT) {
    // The cover is already a file on the media server (a copy made when the work
    // was added), so it can be read directly, with R2 as the fallback. Only a
    // cover that still lives on another site needs the server-side proxy.
    const { primary } = mediaOriginsFromEnv();
    if (item.coverUrl.startsWith("/media/")) return `${primary}${item.coverUrl}`;
    if (primary && item.coverUrl.startsWith(`${primary}/media/`)) return item.coverUrl;
  }
  return `/api/public-media/external/${item.id}`;
}
