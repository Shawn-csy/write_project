import { servePublicMedia } from "@/lib/publicMediaProxy";
import { parseMediaWidth } from "@/lib/publicMediaUrl";

export async function GET(
  request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  return servePublicMedia(token, parseMediaWidth(new URL(request.url).searchParams.get("w")));
}
