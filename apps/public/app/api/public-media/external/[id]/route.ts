import { serveExternalPublicMedia } from "@/lib/publicMediaProxy";
import { parseMediaWidth } from "@/lib/publicMediaUrl";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return serveExternalPublicMedia(id, parseMediaWidth(new URL(request.url).searchParams.get("w")));
}
