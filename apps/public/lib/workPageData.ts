import { cache } from "react";
import { apiFetch } from "./api";
import { buildWorkCatalog, WORK_SECTIONS, type WorkBundle } from "./workCatalog";

export const getWorkBundle = cache(() => apiFetch<WorkBundle>(`/public-bundle?sections=${WORK_SECTIONS.join(",")}`, {
  next: { revalidate: process.env.CF_STATIC_EXPORT === "1" ? false : 300, tags: ["public-bundle"] },
}));

async function loadCatalog() {
  return buildWorkCatalog(await getWorkBundle());
}

// The release serves a frozen snapshot. Normalize it once per static worker.
let snapshot: ReturnType<typeof loadCatalog> | undefined;
export const getWorkCatalog = cache(() => process.env.CF_STATIC_EXPORT === "1" ? snapshot ??= loadCatalog() : loadCatalog());
