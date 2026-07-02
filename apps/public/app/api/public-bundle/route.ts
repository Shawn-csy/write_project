import { apiFetch } from "@/lib/api";
import { NextResponse } from "next/server";

// force-dynamic: client uses this for fresh hydration after page load
export const dynamic = "force-dynamic";
const PUBLIC_BUNDLE_TTL = 60;

export async function GET(): Promise<NextResponse> {
  try {
    const data = await apiFetch("/public-bundle");
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": `public, max-age=${PUBLIC_BUNDLE_TTL}, stale-while-revalidate=120`,
      },
    });
  } catch {
    return NextResponse.json({ scripts: [] }, { status: 502 });
  }
}
