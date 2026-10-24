import { apiFetch } from "@/lib/api";
import { NextResponse } from "next/server";

// Client-side pages use this endpoint for current public bundle metadata.
export const dynamic = "force-dynamic";
export async function GET(): Promise<NextResponse> {
  try {
    const data = await apiFetch("/public-bundle");
    return NextResponse.json(data, {
      headers: {
        // Keep client-side reads uncached so metadata edits are visible immediately.
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ scripts: [] }, { status: 502 });
  }
}
