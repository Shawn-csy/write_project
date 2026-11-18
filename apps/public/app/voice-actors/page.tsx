import { apiFetch } from "@/lib/api";
import type { ExternalPublicScript, PublicDemoSubmission, PublicPersona, PublicScript } from "@/lib/types";
import { publicDirectoryMetadata, TITLE_SUFFIX } from "@/lib/seo";
import { VoiceActorDirectoryClient } from "./VoiceActorDirectoryClient";

export const dynamic = "force-dynamic";
const STATIC_EXPORT = process.env.CF_STATIC_EXPORT === "1";

export const metadata = publicDirectoryMetadata(
  "/voice-actors",
  `聲演名錄｜${TITLE_SUFFIX}`,
  "查找聲演的公開個人頁、參演作品與演出 Demo。",
);

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
