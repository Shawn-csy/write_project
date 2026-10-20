import { serveExternalPublicMedia } from "@/lib/publicMediaProxy";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return serveExternalPublicMedia(id);
}
