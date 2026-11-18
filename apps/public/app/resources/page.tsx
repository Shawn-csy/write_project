import { apiFetch } from "@/lib/api";
import type { PublicPersona } from "@/lib/types";
import { publicDirectoryMetadata, TITLE_SUFFIX } from "@/lib/seo";
import { ResourcesClient, type ProductionResource } from "./ResourcesClient";

export const dynamic = "force-dynamic";
const STATIC_EXPORT = process.env.CF_STATIC_EXPORT === "1";

export const metadata = publicDirectoryMetadata(
  "/resources",
  `資源｜${TITLE_SUFFIX}`,
  "探索聲演、後製、封面繪製、錄音師與錄音室，查看創作者的參與作品與聯絡方式。",
);

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
