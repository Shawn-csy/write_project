import { cache } from "react";
import { apiFetch } from "./api";
import { buildDemoCatalog, type DemoCatalogBundle } from "./demoCatalog";
import { DEMO_CATALOG_SECTIONS } from "./publicBundleProjection";

export const fetchDemoCatalog = cache(async () => {
  const bundle = await apiFetch<DemoCatalogBundle>(`/public-bundle?sections=${DEMO_CATALOG_SECTIONS.join(",")}`, {
    next: { revalidate: process.env.CF_STATIC_EXPORT === "1" ? false : 300, tags: ["public-bundle"] },
  });
  return buildDemoCatalog(bundle);
});
