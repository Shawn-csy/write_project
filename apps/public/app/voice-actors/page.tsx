import type { Metadata } from "next";
import { apiFetch } from "@/lib/api";
import type { ExternalPublicScript, PublicDemoSubmission, PublicPersona, PublicScript } from "@/lib/types";
import { BASE_URL, SITE_NAME } from "@/lib/seo";
import { VoiceActorDirectoryClient } from "./VoiceActorDirectoryClient";

export const dynamic = "force-dynamic";
const STATIC_EXPORT = process.env.CF_STATIC_EXPORT === "1";

export const metadata: Metadata = {
  title: `聲演名錄｜${SITE_NAME}`,
  description: "瀏覽聲演身份與公開演出 Demo。",
  alternates: { canonical: `${BASE_URL}/voice-actors` },
  openGraph: { title: `聲演名錄｜${SITE_NAME}`, description: "瀏覽聲演身份與公開演出 Demo。", url: `${BASE_URL}/voice-actors`, siteName: SITE_NAME, locale: "zh_TW" },
};

async function getDirectoryData(): Promise<{ personas: PublicPersona[]; demos: PublicDemoSubmission[]; scripts: PublicScript[]; externalScripts: ExternalPublicScript[] }> {
  try {
    const bundle = await apiFetch<{ personas?: PublicPersona[]; scripts?: PublicScript[]; externalPublicScripts?: ExternalPublicScript[]; demoSubmissions?: PublicDemoSubmission[] }>("/public-bundle?sections=personas,scripts,externalPublicScripts,demoSubmissions", { cache: "no-store" });
    return { personas: bundle.personas || [], demos: bundle.demoSubmissions || [], scripts: bundle.scripts || [], externalScripts: bundle.externalPublicScripts || [] };
  } catch {
    return { personas: [], demos: [], scripts: [], externalScripts: [] };
  }
}

export default async function VoiceActorDirectoryPage() {
  const { personas, demos, scripts, externalScripts } = await getDirectoryData();
  return <VoiceActorDirectoryClient initialPersonas={personas} initialDemos={demos} initialScripts={scripts} initialExternalScripts={externalScripts} refreshOnMount={STATIC_EXPORT} />;
}
