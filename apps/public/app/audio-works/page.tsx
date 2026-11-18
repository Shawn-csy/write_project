import { parseBannerSlides } from "@write/public-ui/server";
import { AudioWorksClient } from "./AudioWorksClient";
import { apiFetch } from "@/lib/api";
import type { PublicAudioWork, PublicOrg } from "@/lib/types";
import { publicDirectoryMetadata, TITLE_SUFFIX } from "@/lib/seo";

const REVALIDATE_SECONDS = process.env.CF_STATIC_EXPORT === "1" ? false : 300;
const STATIC_EXPORT = process.env.CF_STATIC_EXPORT === "1";

export const dynamic = "force-dynamic";

export const metadata = publicDirectoryMetadata(
  "/audio-works",
  `音聲作品｜${TITLE_SUFFIX}`,
  "依社團探索音聲作品，查看演出與製作署名，並前往原始平台收聽。",
);

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
  const [{ audioWorks, organizations, retryInBrowser }, adBundle] = await Promise.all([
    getAudioWorks(),
    apiFetch<{ audioWorkBanner?: unknown }>("/public-bundle?sections=audioWorkBanner", { cache: "no-store" })
      .catch(() => ({} as { audioWorkBanner?: unknown })),
  ]);
  return <AudioWorksClient initialBannerSlides={parseBannerSlides(adBundle.audioWorkBanner) || []} initialWorks={audioWorks} initialOrganizations={organizations} refreshOnMount={STATIC_EXPORT || retryInBrowser} />;
}
