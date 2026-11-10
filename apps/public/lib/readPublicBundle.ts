import { liveApi } from "./liveApi";
import type { PublicBundleSection } from "./publicBundleProjection";

// Several public page components need the same live snapshot on mount. Share only
// concurrent reads; a later navigation still fetches current published data.
const pending = new Map<string, Promise<unknown>>();

export function readPublicBundle<T>(sections?: readonly PublicBundleSection[]): Promise<{ data: T; source: "primary" | "fallback" }> {
  const path = sections?.length ? `/api/public-bundle?sections=${sections.join(",")}` : "/api/public-bundle";
  if (!pending.has(path)) {
    const read = liveApi.readJson<T>(path, { cache: "no-store" })
      .finally(() => { pending.delete(path); });
    pending.set(path, read);
  }
  return pending.get(path) as Promise<{ data: T; source: "primary" | "fallback" }>;
}
