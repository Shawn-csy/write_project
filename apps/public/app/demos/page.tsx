import type { Metadata } from "next";
import { apiFetch } from "@/lib/api";
import type { ExternalPublicScript, PublicDemoSubmission, PublicScript, PublicPersona, PublicOrg } from "@/lib/types";
import { BASE_URL, SITE_NAME } from "@/lib/seo";
import { DemoShowcaseClient } from "./DemoShowcaseClient";
import { parseBannerSlides } from "@write/public-ui/server";

const REVALIDATE_SECONDS = process.env.CF_STATIC_EXPORT === "1" ? false : 300;

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `Demo｜${SITE_NAME}`,
  description: "公開台本演出與試聽。",
  alternates: { canonical: `${BASE_URL}/demos` },
  openGraph: { title: `Demo｜${SITE_NAME}`, description: "公開台本演出與試聽。", url: `${BASE_URL}/demos`, siteName: SITE_NAME, locale: "zh_TW" },
};

async function getDemoSources(): Promise<{ scripts: PublicScript[]; externalPublicScripts: ExternalPublicScript[]; personas?: PublicPersona[]; organizations?: PublicOrg[]; demoSubmissions?: PublicDemoSubmission[]; demoBanner?: unknown }> {
  return apiFetch("/public-bundle?sections=scripts,externalPublicScripts,personas,organizations,demoSubmissions,demoBanner", {
    next: { revalidate: REVALIDATE_SECONDS, tags: ["public-bundle"] },
  });
}

export default async function DemosPage() {
  const bundle = await getDemoSources();
  const bannerSlides = parseBannerSlides(bundle.demoBanner);
  return <DemoShowcaseClient initialScripts={bundle.scripts || []} initialExternalScripts={bundle.externalPublicScripts || []} initialPersonas={bundle.personas || []} initialOrganizations={bundle.organizations || []} initialSubmissions={bundle.demoSubmissions || []} initialBannerSlides={bannerSlides} />;
}
