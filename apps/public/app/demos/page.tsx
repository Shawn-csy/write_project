import type { Metadata } from "next";
import { apiFetch } from "@/lib/api";
import type { ExternalPublicScript, PublicDemoSubmission, PublicScript, PublicPersona } from "@/lib/types";
import { BASE_URL, SITE_NAME } from "@/lib/seo";
import { DemoShowcaseClient } from "./DemoShowcaseClient";

const REVALIDATE_SECONDS = process.env.CF_STATIC_EXPORT === "1" ? false : 300;

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: `Demo 專區｜${SITE_NAME}`,
  description: "依公開台本瀏覽試聽、演出與錄音範例。",
  alternates: { canonical: `${BASE_URL}/demos` },
  openGraph: { title: `Demo 專區｜${SITE_NAME}`, description: "依公開台本瀏覽試聽、演出與錄音範例。", url: `${BASE_URL}/demos`, siteName: SITE_NAME, locale: "zh_TW" },
};

async function getDemoSources(): Promise<{ scripts: PublicScript[]; externalPublicScripts: ExternalPublicScript[]; personas?: PublicPersona[]; demoSubmissions?: PublicDemoSubmission[] }> {
  return apiFetch("/public-bundle", {
    next: { revalidate: REVALIDATE_SECONDS, tags: ["public-bundle"] },
  });
}

export default async function DemosPage() {
  const bundle = await getDemoSources();
  return <DemoShowcaseClient initialScripts={bundle.scripts || []} initialExternalScripts={bundle.externalPublicScripts || []} initialPersonas={bundle.personas || []} initialSubmissions={bundle.demoSubmissions || []} />;
}
