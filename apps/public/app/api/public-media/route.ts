import { NextRequest } from "next/server";
import { servePublicMedia } from "@/lib/publicMediaProxy";

export async function GET(request: NextRequest) {
  return servePublicMedia(request.nextUrl.searchParams.get("token") || "");
}
