import { apiFetch } from "@/lib/api";
import { TITLE_SUFFIX } from "@/lib/seo";
import { gameCatalog, gameResourceAvatars } from "@/lib/gameCatalog";
import type { PublicPersona } from "@/lib/types";
import { GameDirectory } from "./GameDirectory";
import { GameAgeGate } from "./GameAgeGate";

export const metadata = {
  title: `遊戲｜${TITLE_SUFFIX}`,
  description: "探索台灣成人向遊戲，查看演出與製作署名，並前往原始平台查看。",
  alternates: { canonical: "/games" },
};

export default async function GamesPage() {
  let avatarsById: Record<string, string> = { ...gameResourceAvatars };
  try {
    const bundle = await apiFetch<{ personas?: PublicPersona[] }>("/public-bundle?sections=personas", { next: { revalidate: 300, tags: ["public-bundle"] } });
    if (Array.isArray(bundle.personas)) {
      avatarsById = {
        ...gameResourceAvatars,
        ...Object.fromEntries(bundle.personas.filter((p) => p.avatar).map((p) => [p.id, p.avatar!])),
      };
    }
  } catch {
    // Fallback without avatars if API is unavailable at build time.
  }
  return <GameAgeGate><GameDirectory catalog={gameCatalog} avatarsById={avatarsById} /></GameAgeGate>;
}
