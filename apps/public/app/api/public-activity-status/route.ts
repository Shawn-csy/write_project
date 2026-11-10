import { apiFetch } from "@/lib/api";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  try {
    const status = await apiFetch<{ hasPublishedActivities: boolean }>("/public-activity-status");
    return NextResponse.json(status, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch {
    return NextResponse.json({ hasPublishedActivities: false }, { status: 502 });
  }
}
