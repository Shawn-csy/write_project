import { cache } from "react";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { BASE_URL } from "@/lib/seo";
import { IdentityRedirect } from "@/components/IdentityRedirect";
import { identityHrefForLegacyResource } from "@/lib/legacyResourceRedirect";
import type { ProductionResource } from "../ResourcesClient";

/**
 * Retired address. Production people now have one identity page at /author/<id>
 * like every writer and voice actor; old links redirect there.
 */

const STATIC_EXPORT = process.env.CF_STATIC_EXPORT === "1";

const DIRECTORY_SENTINEL = "index";

export const revalidate = 300;
export const dynamicParams = true;

const loadResources = cache(async (): Promise<ProductionResource[]> => {
  try {
    const bundle = await apiFetch<{ productionResources?: ProductionResource[] }>(
      "/public-bundle?sections=productionResources",
      { next: { revalidate: 300, tags: ["public-bundle"] } },
    );
    return Array.isArray(bundle.productionResources) ? bundle.productionResources : [];
  } catch {
    return [];
  }
});

export async function generateStaticParams(): Promise<Array<{ id: string }>> {
  if (process.env.CF_STATIC_EXPORT !== "1" && process.env.PREBUILD_PUBLIC_PAGES !== "1") return [];
  const ids = (await loadResources()).flatMap((item) => item.legacyIds || []);
  // A static export needs at least one page per dynamic route; with no retired
  // addresses, publish one that sends visitors to the directory.
  return Array.from(new Set(ids.length ? ids : [DIRECTORY_SENTINEL])).map((id) => ({ id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const href = identityHrefForLegacyResource(await loadResources(), decodeURIComponent(id));
  return {
    robots: { index: false, follow: true },
    ...(href ? { alternates: { canonical: `${BASE_URL}${href}` } } : {}),
  };
}

export default async function LegacyResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const href = id === DIRECTORY_SENTINEL ? "/resources" : identityHrefForLegacyResource(await loadResources(), decodeURIComponent(id));
  if (!href) notFound();
  if (STATIC_EXPORT) return <IdentityRedirect href={href} />;
  permanentRedirect(href);
}
