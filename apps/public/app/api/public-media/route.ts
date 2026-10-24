import { NextRequest } from "next/server";
import { servePublicMedia } from "@/lib/publicMediaProxy";
import { parseMediaWidth } from "@/lib/publicMediaUrl";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  return servePublicMedia(params.get("token") || "", parseMediaWidth(params.get("w")));
}
