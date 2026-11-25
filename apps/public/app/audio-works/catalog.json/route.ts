import { apiFetch } from "@/lib/api";
import { AUDIO_CATALOG_SECTIONS, parseAudioCatalog } from "@/lib/audioCatalog";

export const dynamic = "force-static";

export async function GET() {
  // The Pages build supplies a frozen catalog. The standalone app has its own API.
  if (process.env.CF_STATIC_EXPORT !== "1") return new Response(null, { status: 404 });

  const data = await apiFetch<unknown>(`/public-bundle?sections=${AUDIO_CATALOG_SECTIONS.join(",")}`);
  return Response.json(parseAudioCatalog(data));
}
