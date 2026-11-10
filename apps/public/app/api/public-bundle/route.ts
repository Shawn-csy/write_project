import { parseBundleProjection } from "@/lib/publicBundleProjection";
import { NextResponse } from "next/server";

// Client-side pages use this endpoint for current public bundle metadata.
export const dynamic = "force-dynamic";
export async function GET(request: Request): Promise<Response> {
  const sections = parseBundleProjection(new URL(request.url));
  if (sections === false) return NextResponse.json({ error: "Invalid public bundle sections" }, { status: 400 });
  try {
    const path = sections ? `/public-bundle?sections=${sections.join(",")}` : "/public-bundle";
    const backend = process.env.BACKEND_API_URL ?? "http://write_project-backend:1091";
    const upstream = await fetch(`${backend}/api${path}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok || !upstream.body) throw new Error(`Public bundle upstream: ${upstream.status}`);
    return new Response(upstream.body, {
      headers: {
        "Content-Type": "application/json",
        // Browser reads remain fresh; liveApi rewrites relative /media/ URLs.
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ scripts: [] }, { status: 502 });
  }
}
