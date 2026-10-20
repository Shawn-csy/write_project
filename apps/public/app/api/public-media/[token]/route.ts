import { servePublicMedia } from "@/lib/publicMediaProxy";

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  return servePublicMedia(token);
}
