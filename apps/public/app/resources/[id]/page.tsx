import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { BASE_URL, SITE_NAME } from "@/lib/seo";
import type { ProductionResource } from "../ResourcesClient";
import { ResourcePageClient } from "./ResourcePageClient";

export const revalidate = 300;
export const dynamicParams = true;

const loadResources = cache(async (): Promise<ProductionResource[]> => {
  const bundle = await apiFetch<{ productionResources?: ProductionResource[] }>(
    "/public-bundle?sections=productionResources",
    { next: { revalidate: 300, tags: ["public-bundle"] } },
  );
  return Array.isArray(bundle.productionResources) ? bundle.productionResources : [];
});

export async function generateStaticParams(): Promise<Array<{ id: string }>> {
  if (process.env.CF_STATIC_EXPORT !== "1" && process.env.PREBUILD_PUBLIC_PAGES !== "1") return [];
  return (await loadResources())
    .filter((item) => item.id && item.works?.length > 0)
    .map((item) => ({ id: item.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const item = (await loadResources()).find((resource) => resource.id === id);
  if (!item) return { title: `找不到資源｜${SITE_NAME}` };
  const title = `${item.name}｜資源｜${SITE_NAME}`;
  const description = (item.bio || item.summary || `${item.name} 的音聲製作與參與作品`).slice(0, 200);
  const url = `${BASE_URL}/resources/${encodeURIComponent(id)}`;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE_NAME, locale: "zh_TW" },
  };
}

export default async function ResourcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = (await loadResources()).find((resource) => resource.id === id);
  if (!item || !item.works?.length) notFound();
  return <ResourcePageClient item={item} refreshOnMount={process.env.CF_STATIC_EXPORT === "1"} />;
}
