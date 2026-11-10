import type { Metadata } from "next";
import { AudioWorksClient } from "./AudioWorksClient";
import { apiFetch } from "@/lib/api";
import type { PublicAudioWork, PublicOrg } from "@/lib/types";
import { BASE_URL, SITE_NAME } from "@/lib/seo";

const REVALIDATE_SECONDS = process.env.CF_STATIC_EXPORT === "1" ? false : 300;
const STATIC_EXPORT = process.env.CF_STATIC_EXPORT === "1";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: `音聲作品｜${SITE_NAME}`,
  description: "瀏覽聲演公開分享的音聲作品，查看作品資訊並前往原始平台收聽。",
  alternates: { canonical: `${BASE_URL}/audio-works` },
  openGraph: {
    title: `音聲作品｜${SITE_NAME}`,
    description: "瀏覽聲演公開分享的音聲作品，查看作品資訊並前往原始平台收聽。",
    url: `${BASE_URL}/audio-works`,
    siteName: SITE_NAME,
    locale: "zh_TW",
  },
};

async function getAudioWorks(): Promise<{ audioWorks: PublicAudioWork[]; organizations: PublicOrg[]; retryInBrowser: boolean }> {
  try {
    const bundle = await apiFetch<{ audioWorks?: PublicAudioWork[]; organizations?: PublicOrg[] }>("/public-bundle?sections=audioWorks,organizations", {
      next: { revalidate: REVALIDATE_SECONDS, tags: ["public-bundle"] },
    });
    return { audioWorks: Array.isArray(bundle.audioWorks) ? bundle.audioWorks : [], organizations: Array.isArray(bundle.organizations) ? bundle.organizations : [], retryInBrowser: false };
  } catch {
    return { audioWorks: [], organizations: [], retryInBrowser: true };
  }
}

export default async function AudioWorksPage() {
  const { audioWorks, organizations, retryInBrowser } = await getAudioWorks();
  return <AudioWorksClient initialWorks={audioWorks} initialOrganizations={organizations} refreshOnMount={STATIC_EXPORT || retryInBrowser} />;
}
