import { Suspense } from "react";
import { PublicDirectoryLoading } from "@/components/PublicDirectoryLoading";
import { apiFetch } from "@/lib/api";
import { buildVoiceActorDirectory, VOICE_ACTOR_DIRECTORY_SECTIONS, type VoiceActorDirectoryBundle } from "@/lib/voiceActorDirectory";
import { publicDirectoryMetadata, TITLE_SUFFIX } from "@/lib/seo";
import { VoiceActorDirectoryClient } from "./VoiceActorDirectoryClient";

export const dynamic = "force-dynamic";
const STATIC_EXPORT = process.env.CF_STATIC_EXPORT === "1";

export const metadata = publicDirectoryMetadata(
  "/voice-actors",
  `聲演名錄｜${TITLE_SUFFIX}`,
  "查找聲演的公開個人頁、參演作品與演出 Demo。",
);

export default function VoiceActorDirectoryPage() {
  return (
    <Suspense fallback={<PublicDirectoryLoading title="聲演" />}>
      <VoiceActorDirectory />
    </Suspense>
  );
}

async function VoiceActorDirectory() {
  const bundle = await apiFetch<VoiceActorDirectoryBundle>(`/public-bundle?sections=${VOICE_ACTOR_DIRECTORY_SECTIONS.join(",")}`, { cache: "no-store" })
    .catch((): VoiceActorDirectoryBundle => ({}));
  return <VoiceActorDirectoryClient initialDirectory={buildVoiceActorDirectory(bundle)} refreshOnMount={STATIC_EXPORT} />;
}
