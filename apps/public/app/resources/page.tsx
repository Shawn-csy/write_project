import { Suspense } from "react";
import { PublicDirectoryLoading } from "@/components/PublicDirectoryLoading";
import { apiFetch } from "@/lib/api";
import { publicDirectoryMetadata, TITLE_SUFFIX } from "@/lib/seo";
import { buildResourceIndex, type ResourceIndexRow } from "@/lib/resourceCatalog";
import { ResourcesClient } from "./ResourcesClient";

export const dynamic = "force-dynamic";
const STATIC_EXPORT = process.env.CF_STATIC_EXPORT === "1";

export const metadata = publicDirectoryMetadata(
  "/resources",
  `資源｜${TITLE_SUFFIX}`,
  "探索聲演、後製、美術、錄音師與錄音室，查看創作者的參與作品與聯絡方式。",
);

export default function ResourcesPage() {
  return (
    <Suspense fallback={<PublicDirectoryLoading title="資源" />}>
      <ResourceDirectory />
    </Suspense>
  );
}

async function ResourceDirectory() {
  const rows = await apiFetch<ResourceIndexRow[]>(
    "/public-resource-directory", { cache: "no-store" },
  ).catch(error => {
    if (STATIC_EXPORT) throw error;
    return null;
  });
  return <ResourcesClient initialDirectory={buildResourceIndex(rows ?? [])}
    refreshOnMount={STATIC_EXPORT || !rows} />;
}
