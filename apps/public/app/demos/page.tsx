import { apiFetch } from "@/lib/api";
import type { ExternalPublicScript, PublicDemoSubmission, PublicScript, PublicPersona, PublicOrg } from "@/lib/types";
import { publicDirectoryMetadata, TITLE_SUFFIX } from "@/lib/seo";
import { DemoShowcaseClient } from "./DemoShowcaseClient";
import { parseBannerSlides } from "@write/public-ui/server";

const REVALIDATE_SECONDS = process.env.CF_STATIC_EXPORT === "1" ? false : 300;

export const dynamic = "force-dynamic";
export const metadata = publicDirectoryMetadata(
  "/demos",
  `Demo｜${TITLE_SUFFIX}`,
  "試聽公開台本的演出 Demo，找參與聲演與原始台本。",
);

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
