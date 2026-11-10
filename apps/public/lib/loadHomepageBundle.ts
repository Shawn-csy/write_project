import { apiFetch } from "@/lib/api";
import {
  EMPTY_HOMEPAGE_BUNDLE,
  HOMEPAGE_BUNDLE_SECTIONS,
  type HomepageBundleResponse,
  parseHomepageBundle,
  type HomepageBundle,
} from "@/lib/homepageBundle";
import type { PublicBundleSection } from "@/lib/publicBundleProjection";

const STATIC_EXPORT = process.env.CF_STATIC_EXPORT === "1";

export async function loadHomepageBundle(
  sections: readonly PublicBundleSection[] = HOMEPAGE_BUNDLE_SECTIONS,
): Promise<HomepageBundle> {
  try {
    const bundle = await apiFetch<HomepageBundleResponse>(`/public-bundle?sections=${sections.join(",")}`, {
      next: { revalidate: 300, tags: ["public-bundle"] },
    });
    return parseHomepageBundle(bundle);
  } catch (error) {
    if (STATIC_EXPORT) throw error;
    console.error("[public] /public-bundle request failed — serving empty directory", error);
    return EMPTY_HOMEPAGE_BUNDLE;
  }
}
