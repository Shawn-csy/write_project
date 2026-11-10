import type { Metadata } from "next";
import { apiFetch } from "@/lib/api";
import type { PublicPersona } from "@/lib/types";
import { BASE_URL, SITE_NAME } from "@/lib/seo";
import { ResourcesClient, type ProductionResource } from "./ResourcesClient";

export const dynamic = "force-dynamic";
const STATIC_EXPORT = process.env.CF_STATIC_EXPORT === "1";

export const metadata: Metadata = {
  title: `資源｜${SITE_NAME}`,
  description: "探索聲演、音聲後製、封面繪製與錄音室資源。",
  alternates: { canonical: `${BASE_URL}/resources` },
  openGraph: { title: `資源｜${SITE_NAME}`, description: "探索聲演、音聲後製、封面繪製與錄音室資源。", url: `${BASE_URL}/resources`, siteName: SITE_NAME, locale: "zh_TW" },
};

export default async function ResourcesPage() {
  let personas: PublicPersona[] = [];
  let resources: ProductionResource[] = [];
  try {
    const bundle = await apiFetch<{ personas?: PublicPersona[]; productionResources?: ProductionResource[] }>("/public-bundle?sections=personas,productionResources", { cache: "no-store" });
    personas = Array.isArray(bundle.personas) ? bundle.personas : [];
    resources = Array.isArray(bundle.productionResources) ? bundle.productionResources : [];
  } catch {
    // Static previews refresh from the public API in the browser.
  }
  return <ResourcesClient initialPersonas={personas} initialResources={resources} refreshOnMount={STATIC_EXPORT} />;
}
