import { apiFetch } from "@/lib/api";
import { NextResponse } from "next/server";

// force-dynamic: client uses this for fresh hydration after page load
export const dynamic = "force-dynamic";
export async function GET(): Promise<NextResponse> {
  try {
    const data = await apiFetch("/public-bundle");
    return NextResponse.json(data, {
      headers: {
        // This endpoint hydrates the homepage after load. Keep it uncached so
        // admin metadata edits (author/date) are visible immediately.
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ scripts: [] }, { status: 502 });
  }
}
