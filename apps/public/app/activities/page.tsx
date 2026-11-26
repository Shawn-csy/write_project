import { Suspense } from "react";
import { PublicDirectoryLoading } from "@/components/PublicDirectoryLoading";
import { apiFetch } from "@/lib/api";
import type { ActivityPage } from "@/lib/types";
import { publicDirectoryMetadata, SITE_NAME } from "@/lib/seo";
import { ActivityHubClient } from "./ActivityHubClient";

export const dynamic = "force-dynamic";
const STATIC_EXPORT = process.env.CF_STATIC_EXPORT === "1";

export const metadata = publicDirectoryMetadata(
  "/activities",
  `活動專區｜${SITE_NAME}`,
  "收錄本站公開活動、主題企劃與相關台本。",
);

type ActivityParams = Promise<{ event?: string | string[] }>;

export default function ActivitiesPage({ searchParams }: { searchParams: ActivityParams }) {
  if (STATIC_EXPORT) return <ActivityHubClient />;

  return (
    <Suspense fallback={<PublicDirectoryLoading title="主題企劃與活動" />}>
      <ActivityDirectory searchParams={searchParams} />
    </Suspense>
  );
}

async function ActivityDirectory({ searchParams }: { searchParams: ActivityParams }) {
  const [{ event }, bundle] = await Promise.all([
    searchParams,
    apiFetch<{ activityPages?: ActivityPage[] }>("/public-bundle?sections=activityPages", { cache: "no-store" })
      .catch(() => undefined),
  ]);
  return <ActivityHubClient initialPages={bundle?.activityPages} initialSlug={Array.isArray(event) ? event[0] : event} />;
}
