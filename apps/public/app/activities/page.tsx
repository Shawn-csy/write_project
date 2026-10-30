import type { Metadata } from "next";
import { BASE_URL, SITE_NAME } from "@/lib/seo";
import { ActivityHubClient } from "./ActivityHubClient";

export const metadata: Metadata = {
  title: `活動專區｜${SITE_NAME}`,
  description: "收錄本站公開活動、主題企劃與相關台本。",
  alternates: { canonical: `${BASE_URL}/activities` },
};

export default function ActivitiesPage() {
  return <ActivityHubClient />;
}
