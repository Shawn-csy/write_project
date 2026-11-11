import type { ProductionResource } from "@/app/resources/ResourcesClient";

/** The identity page that replaced a retired /resources/<id> address, or null. */
export function identityHrefForLegacyResource(resources: ProductionResource[] | undefined, id: string): string | null {
  const item = (resources || []).find((resource) => resource.id === id || resource.legacyIds?.includes(id));
  return item ? `/author/${encodeURIComponent(item.personaId || item.id)}` : null;
}
