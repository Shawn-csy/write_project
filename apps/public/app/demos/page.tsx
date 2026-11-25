import { Suspense } from "react";
import { PublicDirectoryLoading } from "@/components/PublicDirectoryLoading";
import { apiFetch } from "@/lib/api";
import { buildDemoCatalog, type DemoCatalogBundle } from "@/lib/demoCatalog";
import { DEMO_CATALOG_SECTIONS } from "@/lib/publicBundleProjection";
import { publicDirectoryMetadata, TITLE_SUFFIX } from "@/lib/seo";
import { DemoShowcaseClient } from "./DemoShowcaseClient";
import { parseBannerSlides } from "@write/public-ui/server";

const STATIC_EXPORT = process.env.CF_STATIC_EXPORT === "1";
const REVALIDATE_SECONDS = STATIC_EXPORT ? false : 300;

export const dynamic = "force-dynamic";
export const metadata = publicDirectoryMetadata(
  "/demos",
  `Demo｜${TITLE_SUFFIX}`,
  "試聽公開台本的演出 Demo，找參與聲演與原始台本。",
);

export default function DemosPage() {
  return (
    <Suspense fallback={<PublicDirectoryLoading title="Demo" layout="grid" />}>
      <DemoDirectory />
    </Suspense>
  );
}

async function DemoDirectory() {
  const sections = [...DEMO_CATALOG_SECTIONS, "demoBanner"];
  const bundle = await apiFetch<DemoCatalogBundle & { demoBanner?: unknown }>(`/public-bundle?sections=${sections.join(",")}`, {
    next: { revalidate: REVALIDATE_SECONDS, tags: ["public-bundle"] },
  });
  return <DemoShowcaseClient initialCatalog={buildDemoCatalog(bundle)} initialBannerSlides={parseBannerSlides(bundle.demoBanner)} refreshOnMount={STATIC_EXPORT} />;
}
